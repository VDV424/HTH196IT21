import asyncio
import random
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Callable, Any
from ..models.schemas import (
    PatientSummary,
    VitalsData,
    IVData,
    SignalQuality,
    DataSource,
    TrajectoryAnalysis,
    TrajectoryDirection,
)
from ..services.trajectory import analyze_patient_trajectory
from ..services.alert_engine import AlertEngine
from ..services.allocation import NurseAllocationEngine

INITIAL_PATIENT_CONFIGS = [
    {"id": "P01", "name": "Patient P01", "room": "Room 101", "scenario": "STABLE", "source": "PHYSICAL_DEVICE", "dev": "ESP32_P01", "hr": 74.0, "spo2": 98.0, "temp": 36.7},
    {"id": "P02", "name": "Patient P02", "room": "Room 102", "scenario": "STABLE", "source": "PHYSICAL_DEVICE", "dev": "ESP32_P02", "hr": 78.0, "spo2": 97.5, "temp": 36.8},
    {"id": "P03", "name": "Patient P03", "room": "Room 103", "scenario": "IV_NEAR_EMPTY", "source": "PHYSICAL_DEVICE", "dev": "ESP32_P03", "hr": 76.0, "spo2": 98.0, "temp": 36.7},
    {"id": "P04", "name": "Patient P04", "room": "Room 104", "scenario": "SLOW_DETERIORATION", "source": "SIMULATION", "dev": None, "hr": 72.0, "spo2": 98.5, "temp": 36.6},
    {"id": "P05", "name": "Patient P05", "room": "Room 105", "scenario": "RAPID_DETERIORATION", "source": "SIMULATION", "dev": None, "hr": 75.0, "spo2": 98.0, "temp": 36.8},
    {"id": "P06", "name": "Patient P06", "room": "Room 106", "scenario": "NOISY_SENSOR", "source": "SIMULATION", "dev": None, "hr": 70.0, "spo2": 98.0, "temp": 36.7},
    {"id": "P07", "name": "Patient P07", "room": "Room 107", "scenario": "MISSING_DATA", "source": "SIMULATION", "dev": None, "hr": 72.0, "spo2": 97.0, "temp": 36.8},
    {"id": "P08", "name": "Patient P08", "room": "Room 108", "scenario": "RECOVERY", "source": "SIMULATION", "dev": None, "hr": 105.0, "spo2": 92.0, "temp": 37.8},
    {"id": "P09", "name": "Patient P09", "room": "Room 109", "scenario": "IV_NO_FLOW", "source": "SIMULATION", "dev": None, "hr": 74.0, "spo2": 98.0, "temp": 36.6},
    {"id": "P10", "name": "Patient P10", "room": "Room 110", "scenario": "MOTION_ARTIFACT", "source": "SIMULATION", "dev": None, "hr": 80.0, "spo2": 96.0, "temp": 36.9},
    {"id": "P11", "name": "Patient P11", "room": "Room 111", "scenario": "STABLE", "source": "SIMULATION", "dev": None, "hr": 68.0, "spo2": 99.0, "temp": 36.5},
    {"id": "P12", "name": "Patient P12", "room": "Room 112", "scenario": "MODERATE_DETERIORATION", "source": "SIMULATION", "dev": None, "hr": 82.0, "spo2": 96.0, "temp": 37.2},
]

class SimulationEngine:
    def __init__(self, alert_engine: AlertEngine, allocation_engine: NurseAllocationEngine):
        self.alert_engine = alert_engine
        self.allocation_engine = allocation_engine
        self.is_running = True
        self.speed_multiplier = 1.0  # 1x, 2x, 5x, 10x
        self.base_interval_sec = 2.5
        self.patients: Dict[str, PatientSummary] = {}
        self.vitals_history: Dict[str, List[VitalsData]] = {}
        self.persistence_counters: Dict[str, int] = {}
        self.listeners: List[Callable[[Dict[str, Any]], None]] = []
        self.demo_mode_active = False
        self.demo_script_step = 0
        self.demo_start_time: Optional[float] = None
        self.settings: Dict[str, float] = {
            "weight_trend_severity": 0.30,
            "weight_rate_of_change": 0.20,
            "weight_persistence": 0.15,
            "weight_multi_vital": 0.15,
            "weight_baseline_deviation": 0.10,
            "weight_signal_confidence": 0.10,
            "weight_deterioration_overall": 0.65,
            "weight_iv_urgency_overall": 0.35,
        }
        self.initialize_patients()

    def initialize_patients(self):
        self.patients.clear()
        self.vitals_history.clear()
        self.persistence_counters.clear()
        now_str = datetime.now(timezone.utc).isoformat()

        for cfg in INITIAL_PATIENT_CONFIGS:
            pid = cfg["id"]
            vitals = VitalsData(
                heart_rate=cfg["hr"],
                spo2=cfg["spo2"],
                temperature=cfg["temp"],
                motion=0.1,
                signal_quality=SignalQuality.GOOD,
                timestamp=now_str
            )

            # IV initial conditions
            if cfg["scenario"] == "IV_NEAR_EMPTY":
                iv = IVData(iv_weight=45.0, iv_flow=25.0, iv_remaining_ml=45.0, iv_state="NEAR_EMPTY", estimated_time_to_empty_min=18.0)
            elif cfg["scenario"] == "IV_NO_FLOW":
                iv = IVData(iv_weight=350.0, iv_flow=0.0, iv_remaining_ml=350.0, iv_state="NO_FLOW", estimated_time_to_empty_min=None)
            else:
                iv = IVData(iv_weight=500.0, iv_flow=20.0, iv_remaining_ml=500.0, iv_state="NORMAL", estimated_time_to_empty_min=150.0)

            # Adjust initial signal quality
            if cfg["scenario"] == "NOISY_SENSOR":
                vitals.signal_quality = SignalQuality.NOISY
            elif cfg["scenario"] == "MISSING_DATA":
                vitals.signal_quality = SignalQuality.MISSING
                vitals.heart_rate = 0.0
                vitals.spo2 = 0.0
            elif cfg["scenario"] == "MOTION_ARTIFACT":
                vitals.signal_quality = SignalQuality.MOTION_ARTIFACT
                vitals.motion = 2.4

            self.vitals_history[pid] = [vitals]
            self.persistence_counters[pid] = 0

            traj = analyze_patient_trajectory(
                current_vitals=vitals,
                current_iv=iv,
                baseline_hr=cfg["hr"],
                baseline_spo2=cfg["spo2"],
                baseline_temp=cfg["temp"],
                vitals_history=self.vitals_history[pid],
                persistence_counter=0,
                settings=self.settings
            )

            patient = PatientSummary(
                patient_id=pid,
                name=cfg["name"],
                room=cfg["room"],
                scenario=cfg["scenario"],
                data_source=DataSource(cfg["source"]),
                device_id=cfg["dev"],
                baseline_hr=cfg["hr"],
                baseline_spo2=cfg["spo2"],
                baseline_temp=cfg["temp"],
                current_vitals=vitals,
                current_iv=iv,
                trajectory=traj,
                assigned_nurse_id=None,
                assigned_nurse_name=None,
                active_alerts_count=0,
                last_update=now_str
            )
            self.patients[pid] = patient

        # Run initial nurse allocation
        self._reallocate()

    def add_simulated_patient(self) -> Optional[PatientSummary]:
        count = len(self.patients)
        if count >= 20:
            return None
        pid = f"P{count+1:02d}"
        room = f"Room {100 + count + 1}"
        base_hr = round(random.uniform(68.0, 80.0), 1)
        base_spo2 = round(random.uniform(97.0, 99.0), 1)
        base_temp = round(random.uniform(36.5, 37.0), 1)
        now_str = datetime.now(timezone.utc).isoformat()

        vitals = VitalsData(
            heart_rate=base_hr,
            spo2=base_spo2,
            temperature=base_temp,
            motion=0.1,
            signal_quality=SignalQuality.GOOD,
            timestamp=now_str
        )
        iv = IVData(iv_weight=500.0, iv_flow=20.0, iv_remaining_ml=500.0, iv_state="NORMAL", estimated_time_to_empty_min=150.0)

        self.vitals_history[pid] = [vitals]
        self.persistence_counters[pid] = 0

        traj = analyze_patient_trajectory(
            current_vitals=vitals,
            current_iv=iv,
            baseline_hr=base_hr,
            baseline_spo2=base_spo2,
            baseline_temp=base_temp,
            vitals_history=[vitals],
            persistence_counter=0,
            settings=self.settings
        )

        patient = PatientSummary(
            patient_id=pid,
            name=f"Patient {pid}",
            room=room,
            scenario="STABLE",
            data_source=DataSource.SIMULATION,
            device_id=None,
            baseline_hr=base_hr,
            baseline_spo2=base_spo2,
            baseline_temp=base_temp,
            current_vitals=vitals,
            current_iv=iv,
            trajectory=traj,
            assigned_nurse_id=None,
            assigned_nurse_name=None,
            active_alerts_count=0,
            last_update=now_str
        )
        self.patients[pid] = patient
        self._reallocate()
        return patient

    def remove_simulated_patient(self, patient_id: str) -> bool:
        if len(self.patients) <= 12 or patient_id in ["P01", "P02", "P03"]:
            return False
        if patient_id in self.patients:
            del self.patients[patient_id]
            if patient_id in self.vitals_history:
                del self.vitals_history[patient_id]
            self._reallocate()
            return True
        return False

    # ---- SOS & Request Bedside Buttons ----

    def trigger_sos(self, patient_id: str) -> bool:
        """Activate SOS emergency panic button for a patient."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.sos_active = True
        p.sos_triggered_at = datetime.now(timezone.utc).isoformat()
        # Immediately boost attention priority to maximum emergency level
        p.trajectory.attention_priority = max(p.trajectory.attention_priority, 95.0)
        self._update_patient_trajectory_and_alerts(p)
        self._reallocate()
        return True

    def clear_sos(self, patient_id: str) -> bool:
        """Clear SOS emergency — nurse has responded."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.sos_active = False
        p.sos_triggered_at = None
        self._update_patient_trajectory_and_alerts(p)
        self._reallocate()
        return True

    def trigger_request(self, patient_id: str, request_type: str = "General") -> bool:
        """Activate nurse request button for a patient."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.request_active = True
        p.request_type = request_type
        p.request_triggered_at = datetime.now(timezone.utc).isoformat()
        # Mild priority boost to ensure it's not ignored
        p.trajectory.attention_priority = max(p.trajectory.attention_priority, 30.0)
        return True

    def clear_request(self, patient_id: str) -> bool:
        """Clear nurse request — nurse has attended."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.request_active = False
        p.request_type = None
        p.request_triggered_at = None
        return True

    def refill_iv(self, patient_id: str, volume_ml: float = 500.0, fluid_name: Optional[str] = None) -> bool:
        """Nurse replaces or refills the IV bag."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.current_iv.iv_remaining_ml = volume_ml
        p.current_iv.iv_weight = volume_ml
        p.current_iv.iv_flow = 20.0
        p.current_iv.iv_state = "NORMAL"
        p.iv_occlusion = False
        p.iv_free_flow = False
        if fluid_name:
            p.iv_fluid_name = fluid_name
        p.current_iv.estimated_time_to_empty_min = round((volume_ml / 20.0) * 60.0, 1)
        if p.scenario in ["IV_NEAR_EMPTY", "IV_NO_FLOW"]:
            p.scenario = "STABLE"
        return True

    def trigger_code_blue(self, patient_id: str) -> bool:
        """Emergency Code Blue: Cardiac/Respiratory arrest - immediate RRT dispatch."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.code_blue_active = True
        p.code_blue_triggered_at = datetime.now(timezone.utc).isoformat()
        p.trajectory.attention_priority = 100.0
        p.trajectory.deterioration_score = 100.0
        p.trajectory.physiological_level = "HIGH"
        self._update_patient_trajectory_and_alerts(p)
        self._reallocate()
        return True

    def clear_code_blue(self, patient_id: str) -> bool:
        """Code Blue resolved by resuscitation team."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.code_blue_active = False
        p.code_blue_triggered_at = None
        self._update_patient_trajectory_and_alerts(p)
        self._reallocate()
        return True

    def update_bed_management(self, patient_id: str, bed_status: str, isolation: str) -> bool:
        """Update ADT bed occupancy status & infection control precautions."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.bed_status = bed_status
        p.isolation_precautions = isolation
        return True

    def set_iv_prescription(self, patient_id: str, fluid_name: str, flow_rate: float) -> bool:
        """eMAR: Set electronic medication/infusion order with guardrails."""
        if patient_id not in self.patients:
            return False
        p = self.patients[patient_id]
        p.iv_fluid_name = fluid_name
        p.current_iv.iv_flow = flow_rate
        # Anti-free-flow & occlusion guardrails
        p.iv_free_flow = flow_rate > 250.0
        p.iv_occlusion = flow_rate <= 0.0 and p.current_iv.iv_remaining_ml > 50.0
        if p.current_iv.iv_remaining_ml and flow_rate > 0:
            p.current_iv.estimated_time_to_empty_min = round((p.current_iv.iv_remaining_ml / flow_rate) * 60.0, 1)
        return True

    def set_patient_scenario(self, patient_id: str, scenario: str):
        if patient_id in self.patients:
            self.patients[patient_id].scenario = scenario

    def set_speed(self, speed: int):
        if speed in [1, 2, 5, 10]:
            self.speed_multiplier = float(speed)

    def set_data_source(self, patient_id: str, source: DataSource):
        if patient_id in self.patients:
            self.patients[patient_id].data_source = source

    def ingest_hardware_vitals(self, patient_id: str, vitals_payload: Dict[str, Any]):
        """
        Receives external MQTT or HTTP vitals from ESP32 physical device.
        Also handles SOS and Request button presses from hardware, and
        HX711 IV load cell weight telemetry.
        """
        if patient_id not in self.patients:
            return
        p = self.patients[patient_id]
        now_str = datetime.now(timezone.utc).isoformat()
        sig_str = vitals_payload.get("signal_quality", "GOOD").upper()
        try:
            sig = SignalQuality(sig_str)
        except Exception:
            sig = SignalQuality.GOOD

        vitals = VitalsData(
            heart_rate=float(vitals_payload.get("heart_rate", p.current_vitals.heart_rate if p.current_vitals.heart_rate > 0 else p.baseline_hr)),
            spo2=float(vitals_payload.get("spo2", p.current_vitals.spo2 if p.current_vitals.spo2 > 0 else p.baseline_spo2)),
            temperature=float(vitals_payload.get("temperature", p.current_vitals.temperature if p.current_vitals.temperature > 0 else p.baseline_temp)),
            motion=float(vitals_payload.get("motion", 0.1)),
            signal_quality=sig,
            timestamp=now_str
        )
        p.current_vitals = vitals
        p.data_source = DataSource.PHYSICAL_DEVICE
        if "device_id" in vitals_payload:
            p.device_id = vitals_payload["device_id"]

        # Ingest HX711 Load Cell / IV data if present
        if "iv_remaining_ml" in vitals_payload or "iv_weight" in vitals_payload or "iv_flow" in vitals_payload:
            rem = float(vitals_payload.get("iv_remaining_ml", vitals_payload.get("iv_weight", p.current_iv.iv_remaining_ml)))
            flow = float(vitals_payload.get("iv_flow", p.current_iv.iv_flow))
            state = vitals_payload.get("iv_state", p.current_iv.iv_state)
            est = round((rem / flow) * 60.0, 1) if flow > 0 else None
            p.current_iv.iv_remaining_ml = rem
            p.current_iv.iv_weight = float(vitals_payload.get("iv_weight", rem))
            p.current_iv.iv_flow = flow
            p.current_iv.iv_state = state
            p.current_iv.estimated_time_to_empty_min = est

        # Handle SOS / Request buttons from hardware (ESP32 GPIO)
        if vitals_payload.get("sos", False):
            self.trigger_sos(patient_id)
        elif vitals_payload.get("sos") is False and p.sos_active:
            # Hardware released SOS button
            pass  # SOS must be cleared by nurse on dashboard, not auto-clear

        if vitals_payload.get("request", False):
            req_type = vitals_payload.get("request_type", "General")
            self.trigger_request(patient_id, req_type)

        self._update_patient_trajectory_and_alerts(p)
        self._reallocate()

    def _update_patient_trajectory_and_alerts(self, patient: PatientSummary):
        pid = patient.patient_id
        if pid not in self.vitals_history:
            self.vitals_history[pid] = []
        self.vitals_history[pid].append(patient.current_vitals)
        if len(self.vitals_history[pid]) > 40:
            self.vitals_history[pid].pop(0)

        traj = analyze_patient_trajectory(
            current_vitals=patient.current_vitals,
            current_iv=patient.current_iv,
            baseline_hr=patient.baseline_hr,
            baseline_spo2=patient.baseline_spo2,
            baseline_temp=patient.baseline_temp,
            vitals_history=self.vitals_history[pid],
            persistence_counter=self.persistence_counters.get(pid, 0),
            settings=self.settings
        )
        self.persistence_counters[pid] = traj.persistence_ticks
        patient.trajectory = traj
        patient.last_update = datetime.now(timezone.utc).isoformat()

        # Update alerts via episode logic
        alerts = self.alert_engine.evaluate_and_update(
            patient_id=pid,
            patient_name=patient.name,
            room=patient.room,
            trajectory=traj,
            current_iv=patient.current_iv,
            signal_quality=patient.current_vitals.signal_quality,
            assigned_nurse=patient.assigned_nurse_name,
            sos_active=patient.sos_active,
            request_active=patient.request_active,
            request_type=patient.request_type,
        )
        patient.active_alerts_count = len(alerts)

    def step_simulation(self):
        """
        Advances all simulated patient vitals and IV levels based on their scenarios.
        """
        now_str = datetime.now(timezone.utc).isoformat()

        # Check demo script progression
        if self.demo_mode_active and self.demo_start_time:
            elapsed = (time.time() - self.demo_start_time) * self.speed_multiplier
            self._apply_demo_script(elapsed)

        for pid, patient in self.patients.items():
            # If patient is connected to a PHYSICAL_DEVICE (IoT hardware), do NOT overwrite with random simulation!
            if patient.data_source == DataSource.PHYSICAL_DEVICE:
                self._update_patient_trajectory_and_alerts(patient)
                continue

            scenario = patient.scenario
            v = patient.current_vitals
            iv = patient.current_iv
            b_hr = patient.baseline_hr
            b_spo2 = patient.baseline_spo2
            b_temp = patient.baseline_temp

            new_hr = v.heart_rate
            new_spo2 = v.spo2
            new_temp = v.temperature
            new_motion = 0.1
            new_sig = SignalQuality.GOOD

            # Scenario Simulation Logic
            if scenario == "STABLE":
                new_hr = b_hr + random.uniform(-1.5, 1.5)
                new_spo2 = min(100.0, max(95.0, b_spo2 + random.uniform(-0.4, 0.4)))
                new_temp = b_temp + random.uniform(-0.08, 0.08)
                new_sig = SignalQuality.GOOD

            elif scenario == "SLOW_DETERIORATION":
                # Gradually climb HR, drop SpO2, climb Temp
                new_hr = min(116.0, new_hr + random.uniform(0.6, 1.4))
                new_spo2 = max(89.0, new_spo2 - random.uniform(0.2, 0.45))
                new_temp = min(38.4, new_temp + random.uniform(0.04, 0.09))
                new_sig = SignalQuality.GOOD

            elif scenario == "RAPID_DETERIORATION":
                # Rapid multi-vital changes
                new_hr = min(138.0, new_hr + random.uniform(2.0, 4.0))
                new_spo2 = max(86.0, new_spo2 - random.uniform(0.6, 1.2))
                new_temp = min(39.1, new_temp + random.uniform(0.1, 0.2))
                new_sig = SignalQuality.GOOD

            elif scenario == "MODERATE_DETERIORATION":
                new_hr = min(108.0, new_hr + random.uniform(0.4, 1.0))
                new_spo2 = max(92.0, new_spo2 - random.uniform(0.15, 0.35))
                new_temp = min(37.8, new_temp + random.uniform(0.03, 0.07))
                new_sig = SignalQuality.GOOD

            elif scenario == "RECOVERY":
                # Drift back towards personal baseline
                if new_hr > b_hr:
                    new_hr = max(b_hr, new_hr - random.uniform(1.2, 2.5))
                if new_spo2 < b_spo2:
                    new_spo2 = min(b_spo2, new_spo2 + random.uniform(0.4, 0.9))
                if new_temp > b_temp:
                    new_temp = max(b_temp, new_temp - random.uniform(0.06, 0.12))
                new_sig = SignalQuality.GOOD

            elif scenario == "NOISY_SENSOR":
                # High erratic jitter, but real physiology is baseline
                new_hr = b_hr + random.uniform(-25.0, 25.0)
                new_spo2 = min(100.0, max(85.0, b_spo2 + random.uniform(-10.0, 2.0)))
                new_temp = b_temp + random.uniform(-0.6, 0.6)
                new_sig = SignalQuality.NOISY

            elif scenario == "MISSING_DATA":
                new_hr = 0.0
                new_spo2 = 0.0
                new_temp = 0.0
                new_sig = SignalQuality.MISSING

            elif scenario == "MOTION_ARTIFACT":
                new_motion = random.uniform(1.8, 3.2)
                new_hr = b_hr + random.uniform(-12.0, 18.0)
                new_spo2 = max(90.0, b_spo2 - random.uniform(0.5, 4.0))
                new_temp = b_temp
                new_sig = SignalQuality.MOTION_ARTIFACT

            # IV Simulation Logic
            new_iv_rem = iv.iv_remaining_ml
            new_iv_flow = iv.iv_flow
            new_iv_state = iv.iv_state

            if scenario == "IV_NEAR_EMPTY":
                new_iv_flow = 25.0
                new_iv_rem = max(10.0, new_iv_rem - random.uniform(1.5, 3.0) * self.speed_multiplier)
                new_iv_state = "NEAR_EMPTY"
            elif scenario == "IV_NO_FLOW":
                new_iv_flow = 0.0
                new_iv_state = "NO_FLOW"
            else:
                # Normal infusion: slow gradual depletion
                new_iv_flow = 20.0
                new_iv_rem = max(20.0, new_iv_rem - random.uniform(0.2, 0.6) * self.speed_multiplier)
                if new_iv_rem <= 40.0:
                    new_iv_state = "NEAR_EMPTY"
                else:
                    new_iv_state = "NORMAL"

            est_empty = round((new_iv_rem / new_iv_flow) * 60.0, 1) if new_iv_flow > 0 else None

            # Update vitals and IV
            patient.current_vitals = VitalsData(
                heart_rate=round(new_hr, 1),
                spo2=round(new_spo2, 1),
                temperature=round(new_temp, 2),
                motion=round(new_motion, 2),
                signal_quality=new_sig,
                timestamp=now_str
            )
            patient.current_iv = IVData(
                iv_weight=round(new_iv_rem, 1),
                iv_flow=round(new_iv_flow, 1),
                iv_remaining_ml=round(new_iv_rem, 1),
                iv_state=new_iv_state,
                estimated_time_to_empty_min=est_empty
            )

            self._update_patient_trajectory_and_alerts(patient)

        # Dynamic capacity-aware re-allocation
        self._reallocate()

    def _reallocate(self):
        assignments = self.allocation_engine.allocate_patients(list(self.patients.values()))
        nurses_map = {n.nurse_id: n.name for n in self.allocation_engine.get_nurses_summary()}

        for pid, nid in assignments.items():
            if pid in self.patients:
                self.patients[pid].assigned_nurse_id = nid
                self.patients[pid].assigned_nurse_name = nurses_map.get(nid, "Unassigned") if nid else "Unassigned"

    def inject_scenario(self, scenario_name: str):
        """
        One-click scenarios:
        1. Normal Ward
        2. Deterioration Event
        3. IV Failure Event
        4. Multi-Patient Surge
        5. Sensor Failure
        6. Recovery
        """
        name = scenario_name.upper()
        if "NORMAL" in name:
            for p in self.patients.values():
                if p.data_source == DataSource.PHYSICAL_DEVICE:
                    continue
                p.scenario = "STABLE"
                p.current_iv.iv_remaining_ml = 500.0
                p.current_iv.iv_state = "NORMAL"
                p.current_iv.iv_flow = 20.0
                p.current_vitals.signal_quality = SignalQuality.GOOD
                p.current_vitals.heart_rate = p.baseline_hr
                p.current_vitals.spo2 = p.baseline_spo2
                p.current_vitals.temperature = p.baseline_temp
        elif "DETERIORATION" in name:
            if "P04" in self.patients:
                self.patients["P04"].scenario = "SLOW_DETERIORATION"
            if "P05" in self.patients:
                self.patients["P05"].scenario = "RAPID_DETERIORATION"
        elif "IV" in name:
            if "P03" in self.patients:
                self.patients["P03"].scenario = "IV_NEAR_EMPTY"
                self.patients["P03"].current_iv.iv_remaining_ml = 35.0
                self.patients["P03"].current_iv.iv_state = "NEAR_EMPTY"
            if "P09" in self.patients:
                self.patients["P09"].scenario = "IV_NO_FLOW"
                self.patients["P09"].current_iv.iv_flow = 0.0
                self.patients["P09"].current_iv.iv_state = "NO_FLOW"
        elif "SURGE" in name:
            # Multi-Patient Surge! Tests nurse capacity limit (5/5)
            if "P04" in self.patients:
                self.patients["P04"].scenario = "SLOW_DETERIORATION"
            if "P05" in self.patients:
                self.patients["P05"].scenario = "RAPID_DETERIORATION"
            if "P08" in self.patients:
                self.patients["P08"].scenario = "IV_NEAR_EMPTY"
                self.patients["P08"].current_iv.iv_remaining_ml = 25.0
                self.patients["P08"].current_iv.iv_state = "NEAR_EMPTY"
            if "P11" in self.patients:
                self.patients["P11"].scenario = "NOISY_SENSOR"
            if "P12" in self.patients:
                self.patients["P12"].scenario = "RAPID_DETERIORATION"
        elif "SENSOR" in name:
            if "P06" in self.patients:
                self.patients["P06"].scenario = "NOISY_SENSOR"
            if "P07" in self.patients:
                self.patients["P07"].scenario = "MISSING_DATA"
            if "P10" in self.patients:
                self.patients["P10"].scenario = "MOTION_ARTIFACT"
        elif "RECOVERY" in name:
            for p in self.patients.values():
                if p.scenario in ["SLOW_DETERIORATION", "RAPID_DETERIORATION", "MODERATE_DETERIORATION"]:
                    p.scenario = "RECOVERY"
                elif p.scenario in ["IV_NEAR_EMPTY", "IV_NO_FLOW"]:
                    p.scenario = "STABLE"
                    p.current_iv.iv_remaining_ml = 450.0
                    p.current_iv.iv_state = "NORMAL"
                    p.current_iv.iv_flow = 20.0
                elif p.scenario in ["NOISY_SENSOR", "MISSING_DATA", "MOTION_ARTIFACT"]:
                    p.scenario = "STABLE"
                    p.current_vitals.signal_quality = SignalQuality.GOOD

    def start_demo_script(self):
        """
        Starts the scripted 3-minute demonstration:
        0s: All stable
        30s: P04 slowly deteriorates
        60s: P05 rapidly deteriorates
        75s: P03 IV near-empty
        100s: P06 produces noisy sensor
        120s: P08 begins recovery
        """
        self.demo_mode_active = True
        self.demo_start_time = time.time()
        self.demo_script_step = 0
        self.inject_scenario("NORMAL")

    def _apply_demo_script(self, elapsed: float):
        if elapsed >= 120.0 and self.demo_script_step < 5:
            self.demo_script_step = 5
            if "P08" in self.patients:
                self.patients["P08"].scenario = "RECOVERY"
            if "P05" in self.patients:
                self.patients["P05"].scenario = "RECOVERY"
        elif elapsed >= 100.0 and self.demo_script_step < 4:
            self.demo_script_step = 4
            if "P06" in self.patients:
                self.patients["P06"].scenario = "NOISY_SENSOR"
        elif elapsed >= 75.0 and self.demo_script_step < 3:
            self.demo_script_step = 3
            if "P03" in self.patients:
                self.patients["P03"].scenario = "IV_NEAR_EMPTY"
                self.patients["P03"].current_iv.iv_remaining_ml = 35.0
                self.patients["P03"].current_iv.iv_state = "NEAR_EMPTY"
        elif elapsed >= 60.0 and self.demo_script_step < 2:
            self.demo_script_step = 2
            if "P05" in self.patients:
                self.patients["P05"].scenario = "RAPID_DETERIORATION"
        elif elapsed >= 30.0 and self.demo_script_step < 1:
            self.demo_script_step = 1
            if "P04" in self.patients:
                self.patients["P04"].scenario = "SLOW_DETERIORATION"

    async def run_loop(self):
        while True:
            if self.is_running:
                try:
                    self.step_simulation()
                except Exception as e:
                    print(f"Error in simulation step: {e}")
            interval = max(0.2, self.base_interval_sec / self.speed_multiplier)
            await asyncio.sleep(interval)
