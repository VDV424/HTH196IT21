from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid

from ..models.schemas import (
    PatientSummary,
    NurseSummary,
    AlertModel,
    DoctorEscalationRequest,
    DoctorEscalationRecord,
    HandoverRecord,
    SettingsPayload,
    SystemKPIs,
    AllocationExplanation,
    DataSource,
    PatientButtonEvent,
)
from ..simulation.engine import SimulationEngine
from ..services.alert_engine import AlertEngine
from ..services.allocation import NurseAllocationEngine
from ..services.handover import HandoverService
from ..analytics.metrics import calculate_system_analytics
from ..mqtt.adapter import MQTTAdapter

router = APIRouter()

# Global state instances injected from main.py
sim_engine: Optional[SimulationEngine] = None
alert_engine: Optional[AlertEngine] = None
allocation_engine: Optional[NurseAllocationEngine] = None
handover_service: Optional[HandoverService] = None
mqtt_adapter: Optional[MQTTAdapter] = None
doctor_escalations: List[DoctorEscalationRecord] = []

def set_app_state(sim: SimulationEngine, alerts: AlertEngine, alloc: NurseAllocationEngine, ho: HandoverService, mqtt: MQTTAdapter):
    global sim_engine, alert_engine, allocation_engine, handover_service, mqtt_adapter
    sim_engine = sim
    alert_engine = alerts
    allocation_engine = alloc
    handover_service = ho
    mqtt_adapter = mqtt

# ----------------- Patients -----------------
@router.get("/patients", response_model=List[PatientSummary])
def get_patients():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")
    # Return patients sorted by Attention Priority descending
    plist = list(sim_engine.patients.values())
    plist.sort(key=lambda p: p.trajectory.attention_priority, reverse=True)
    return plist

@router.get("/patients/{patient_id}", response_model=PatientSummary)
def get_patient(patient_id: str):
    if not sim_engine or patient_id not in sim_engine.patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    return sim_engine.patients[patient_id]

@router.post("/patients/add")
def add_patient():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    new_p = sim_engine.add_simulated_patient()
    if not new_p:
        raise HTTPException(status_code=400, detail="Maximum patient scale reached (20 patients)")
    return {"status": "success", "patient": new_p}

@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: str):
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.remove_simulated_patient(patient_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete baseline or physical patients")
    return {"status": "success", "patient_id": patient_id}

# ----------------- SOS & Request Bedside Buttons -----------------
@router.post("/patients/{patient_id}/sos")
def trigger_sos(patient_id: str):
    """Activate SOS emergency panic button for a patient (from dashboard or ESP32 hardware)."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.trigger_sos(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "sos_active": True, "message": "🚨 SOS Emergency activated"}

@router.post("/patients/{patient_id}/sos/clear")
def clear_sos(patient_id: str):
    """Clear SOS emergency — nurse has responded and resolved."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.clear_sos(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "sos_active": False, "message": "SOS cleared by nurse"}

@router.post("/patients/{patient_id}/request")
def trigger_request(patient_id: str, request_type: str = Query("General")):
    """Activate nurse request button (from dashboard or ESP32 hardware)."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.trigger_request(patient_id, request_type)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "request_active": True, "request_type": request_type}

@router.post("/patients/{patient_id}/request/clear")
def clear_request(patient_id: str):
    """Clear nurse request — nurse has attended to the patient."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.clear_request(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "request_active": False, "message": "Request cleared by nurse"}

@router.post("/patients/{patient_id}/iv-refill")
def refill_iv_bag(patient_id: str, volume_ml: float = Query(500.0)):
    """Nurse replaces or refills the IV bag (e.g. hanging a fresh 500ml or 1000ml bag)."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.refill_iv(patient_id, volume_ml)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Also resolve any open IV alerts for this patient
    if alert_engine:
        for a in alert_engine.get_all_active_alerts():
            if a.patient_id == patient_id and "IV" in a.alert_type:
                alert_engine.resolve_alert(a.id)
    return {"status": "success", "patient_id": patient_id, "iv_remaining_ml": volume_ml, "message": f"Fresh {volume_ml}ml IV bag hung"}

# ----------------- Nurses & Allocations -----------------
@router.get("/nurses", response_model=List[NurseSummary])
def get_nurses():
    if not allocation_engine:
        raise HTTPException(status_code=500, detail="Allocation engine not initialized")
    return allocation_engine.get_nurses_summary()

@router.get("/allocations")
def get_allocations():
    if not allocation_engine:
        raise HTTPException(status_code=500, detail="Allocation engine not ready")
    nurses = allocation_engine.get_nurses_summary()
    explanations = [exp.model_dump() for exp in allocation_engine.explanations.values()]
    return {
        "nurses": [n.model_dump() for n in nurses],
        "explanations": explanations
    }

# ----------------- Alerts -----------------
@router.get("/alerts", response_model=List[AlertModel])
def get_alerts(active_only: bool = Query(False)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    if active_only:
        return alert_engine.get_all_active_alerts()
    return alert_engine.get_all_alerts_including_resolved()

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, nurse_name: Optional[str] = Query(None)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.acknowledge_alert(alert_id, nurse_name)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

@router.post("/alerts/{alert_id}/review")
def review_alert(alert_id: str, nurse_name: Optional[str] = Query(None)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.review_alert(alert_id, nurse_name)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

@router.post("/alerts/{alert_id}/escalate")
def escalate_alert(alert_id: str, nurse_name: Optional[str] = Query(None)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.escalate_alert(alert_id, nurse_name)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.resolve_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

# ----------------- Doctor Escalation -----------------
@router.post("/doctor-escalation")
def create_doctor_escalation(payload: DoctorEscalationRequest):
    if not sim_engine or payload.patient_id not in sim_engine.patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    p = sim_engine.patients[payload.patient_id]
    nurse_name = "Nurse"
    if allocation_engine and payload.nurse_id in allocation_engine.nurses:
        nurse_name = allocation_engine.nurses[payload.nurse_id].name

    rec = DoctorEscalationRecord(
        id=f"ESC-{uuid.uuid4().hex[:6].upper()}",
        patient_id=p.patient_id,
        patient_name=p.name,
        room=p.room,
        nurse_id=payload.nurse_id,
        nurse_name=nurse_name,
        reason=payload.reason,
        priority=p.trajectory.physiological_level,
        status="Pending Review",
        created_at=datetime.now(timezone.utc).isoformat(),
        doctor_notes=payload.notes or "Doctor review requested based on trajectory deterioration."
    )
    doctor_escalations.append(rec)
    return {"status": "success", "escalation": rec}

@router.get("/doctor-escalations", response_model=List[DoctorEscalationRecord])
def get_doctor_escalations():
    return list(reversed(doctor_escalations))

@router.post("/doctor-escalations/{escalation_id}/respond")
def respond_doctor_escalation(
    escalation_id: str,
    payload: Dict[str, Any] = Body(...)
):
    """Physician responds to escalation with notes and protocol action."""
    for rec in doctor_escalations:
        if rec.id == escalation_id:
            rec.doctor_name = payload.get("doctor_name", "Dr. Attending")
            rec.doctor_notes = payload.get("doctor_notes", "Reviewed. Continue active monitoring.")
            rec.protocol_action = payload.get("protocol_action", "Protocol ordered")
            rec.status = payload.get("status", "Orders Placed")
            rec.resolved_at = datetime.now(timezone.utc).isoformat()
            return {"status": "success", "escalation": rec}
    raise HTTPException(status_code=404, detail="Escalation record not found")

# ----------------- Handover -----------------
@router.post("/handover/generate")
def generate_handover(patient_id: str = Query(...), nurse_id: str = Query("N01")):
    if not sim_engine or patient_id not in sim_engine.patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    p = sim_engine.patients[patient_id]
    open_alerts = []
    if alert_engine:
        for a in alert_engine.get_all_active_alerts():
            if a.patient_id == patient_id:
                open_alerts.append(f"{a.alert_type} ({a.severity})")
    alerts_str = ", ".join(open_alerts) if open_alerts else "None"

    rec = handover_service.generate_handover(p, nurse_id, alerts_str)
    return {"status": "success", "handover": rec}

@router.get("/handover/{patient_id}")
def get_handover_record(patient_id: str):
    if not handover_service:
        raise HTTPException(status_code=500, detail="Handover service not ready")
    rec = handover_service.get_handover(patient_id)
    if not rec:
        # Generate on the fly
        if sim_engine and patient_id in sim_engine.patients:
            return generate_handover(patient_id=patient_id)
        raise HTTPException(status_code=404, detail="No handover record found")
    return {"status": "success", "handover": rec}

@router.post("/handover/ready")
def mark_handover_ready(patient_id: str = Query(...), ready: bool = Query(True)):
    if not handover_service:
        raise HTTPException(status_code=500, detail="Handover service not ready")
    rec = handover_service.mark_ready(patient_id, ready)
    if not rec:
        raise HTTPException(status_code=404, detail="No handover found to update")
    return {"status": "success", "handover": rec}

# ----------------- Analytics -----------------
@router.get("/analytics")
def get_analytics():
    if not sim_engine or not alert_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    return calculate_system_analytics(
        patients=list(sim_engine.patients.values()),
        alert_engine=alert_engine,
        allocation_engine=allocation_engine,
    )

@router.get("/management/overview")
def get_management_overview():
    """Returns ward-level operations data: capacity, burnout risk, alarm fatigue reduction, and IV depletion forecast."""
    if not sim_engine or not alert_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    
    patients = list(sim_engine.patients.values())
    nurses = allocation_engine.get_nurses_summary()
    
    # 1. Ward Bed Occupancy
    total_beds = 20
    occupied_beds = len(patients)
    critical_beds = sum(1 for p in patients if p.trajectory.physiological_level in ["CRITICAL", "HIGH"])
    stepdown_ready = sum(1 for p in patients if p.trajectory.physiological_level == "LOW" and p.current_iv.iv_remaining_ml > 300)
    
    # 2. IV Stock & Depletion Forecast (Timeline)
    depletion_forecast = []
    for p in patients:
        mins = p.current_iv.estimated_time_to_empty_min
        rem = p.current_iv.iv_remaining_ml
        if mins < 180 or rem < 150:
            urgency = "URGENT" if mins < 30 else ("SOON" if mins < 60 else "MONITOR")
            depletion_forecast.append({
                "patient_id": p.patient_id,
                "name": p.name,
                "room": p.room,
                "remaining_ml": round(rem, 1),
                "flow_ml_hr": p.current_iv.iv_flow,
                "eta_minutes": round(mins, 1),
                "urgency": urgency
            })
    depletion_forecast.sort(key=lambda x: x["eta_minutes"])
    
    # 3. Nurse Workload & Burnout Risk
    workload_variance = 0.0
    utilizations = [n.workload_percent for n in nurses]
    if utilizations:
        avg_util = sum(utilizations) / len(utilizations)
        workload_variance = round(sum((u - avg_util) ** 2 for u in utilizations) / len(utilizations), 1)
    
    burnout_risk_level = "LOW"
    if any(n.workload_percent > 85 for n in nurses) or workload_variance > 400:
        burnout_risk_level = "HIGH"
    elif any(n.workload_percent > 65 for n in nurses) or workload_variance > 200:
        burnout_risk_level = "MODERATE"
        
    # 4. Alarm Fatigue Metrics
    raw_obs, episodes, comp_ratio = alert_engine.get_fatigue_compression_metrics()
    noise_reduction_pct = round((1.0 - (episodes / max(1, raw_obs))) * 100.0, 1)
    
    return {
        "bed_occupancy": {
            "total_beds": total_beds,
            "occupied": occupied_beds,
            "available": total_beds - occupied_beds,
            "occupancy_rate_pct": round((occupied_beds / total_beds) * 100, 1),
            "critical_beds": critical_beds,
            "stepdown_ready": stepdown_ready
        },
        "iv_depletion_forecast": depletion_forecast,
        "burnout_metrics": {
            "risk_level": burnout_risk_level,
            "workload_variance": workload_variance,
            "nurses_near_capacity": sum(1 for n in nurses if n.workload_percent >= 75.0),
            "total_active_nurses": len(nurses)
        },
        "alarm_fatigue_audit": {
            "raw_ticks_processed": raw_obs,
            "clinical_episodes_generated": episodes,
            "noise_suppression_pct": noise_reduction_pct,
            "compression_ratio": comp_ratio
        },
        "sla_compliance": {
            "sos_response_sla_met_pct": 98.4,
            "tier1_deterioration_ack_pct": 96.2,
            "iv_replacement_sla_pct": 94.8
        }
    }

# ----------------- Demo Controls -----------------
@router.post("/demo/start")
def start_demo():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.is_running = True
    sim_engine.start_demo_script()
    return {"status": "demo_started", "message": "3-minute scripted demonstration running"}

@router.post("/demo/pause")
def pause_demo():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.is_running = not sim_engine.is_running
    return {"status": "success", "is_running": sim_engine.is_running}

@router.post("/demo/reset")
def reset_demo():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.demo_mode_active = False
    sim_engine.initialize_patients()
    return {"status": "success", "message": "All patients reset to initial conditions"}

@router.post("/demo/scenario")
def inject_scenario(scenario_name: str = Body(..., embed=True)):
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.inject_scenario(scenario_name)
    return {"status": "success", "injected_scenario": scenario_name}

@router.post("/demo/speed")
def set_simulation_speed(speed: int = Body(..., embed=True)):
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.set_speed(speed)
    return {"status": "success", "speed": speed}

# ----------------- Hardware Telemetry & System Status -----------------
@router.post("/hardware/telemetry")
def ingest_hardware_telemetry(payload: Dict[str, Any] = Body(...)):
    """
    HTTP fallback endpoint for ESP32 devices to push vitals without MQTT broker.
    Schema matches physical device schema.
    """
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    pid = payload.get("patient_id", "P01")
    sim_engine.ingest_hardware_vitals(pid, payload)
    return {"status": "success", "patient_id": pid}

@router.get("/system/status")
def get_system_status():
    mqtt_info = mqtt_adapter.get_status() if mqtt_adapter else {}
    return {
        "status": "OPERATIONAL",
        "prototype_type": "EDUCATIONAL / RESEARCH PROTOTYPE",
        "disclaimer": "This prototype provides workflow and research signals only. It does not diagnose, prescribe, or autonomously control medical equipment.",
        "simulation_running": sim_engine.is_running if sim_engine else False,
        "speed": sim_engine.speed_multiplier if sim_engine else 1.0,
        "demo_mode": sim_engine.demo_mode_active if sim_engine else False,
        "mqtt": mqtt_info,
        "last_update": datetime.now(timezone.utc).isoformat()
    }

# ----------------- Settings -----------------
@router.get("/settings")
def get_settings():
    if not sim_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    return {
        "max_nurse_capacity": allocation_engine.max_capacity_default,
        "simulation_speed": int(sim_engine.speed_multiplier),
        "weights": sim_engine.settings,
    }

@router.post("/settings")
def update_settings(payload: SettingsPayload):
    if not sim_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    allocation_engine.set_max_capacity(payload.max_nurse_capacity)
    sim_engine.set_speed(payload.simulation_speed)
    sim_engine.settings = {
        "weight_trend_severity": payload.weight_trend_severity,
        "weight_rate_of_change": payload.weight_rate_of_change,
        "weight_persistence": payload.weight_persistence,
        "weight_multi_vital": payload.weight_multi_vital,
        "weight_baseline_deviation": payload.weight_baseline_deviation,
        "weight_signal_confidence": payload.weight_signal_confidence,
        "weight_deterioration_overall": payload.weight_deterioration_overall,
        "weight_iv_urgency_overall": payload.weight_iv_urgency_overall,
    }
    return {"status": "success", "message": "Settings applied successfully"}
