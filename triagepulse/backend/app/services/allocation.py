from typing import List, Dict, Optional, Tuple
from ..models.schemas import (
    NurseSummary,
    PatientSummary,
    AllocationExplanation,
    TrajectoryAnalysis,
)

class NurseAllocationEngine:
    """
    Intelligent Triage & Nurse Allocation Engine
    
    Proximity & Acuity Rules:
    ───────────────────────────
    1. SOS & Emergency Alerts:
       - High-urgency dispatch prioritizes the NEARBY nurse who is NOT committed to a serious case.
       - Serious case definition: Nurse currently attending an active SOS, critical deterioration (>=60), or ICU-level attention priority (>=65).
       - Fallback: If EVERY nurse is busy or committed to serious cases, the system schedules/dispatches
         the nurse with the ABSOLUTE SHORTEST DISTANCE to provide rapid-response emergency stabilization.
    2. Routine & Sub-acute Patients:
       - Multi-factor scoring combining clinical capability match, ward proximity, workload balance,
         and safety capacity limits.
    """

    # Nurse Station Positions in hospital corridor (meters)
    NURSE_STATIONS = {
        "N01": {"ward": "Ward East", "pos_m": 10.5},     # Room 101-106 corridor hub
        "N02": {"ward": "Ward Central", "pos_m": 35.0},  # Room 107-113 corridor hub
        "N03": {"ward": "Ward West", "pos_m": 59.5},     # Room 114-120 corridor hub
    }

    def __init__(self, max_capacity_default: int = 5):
        self.max_capacity_default = max_capacity_default
        self.nurses: Dict[str, NurseSummary] = {
            "N01": NurseSummary(
                nurse_id="N01",
                name="Nurse A",
                role="Critical Care Specialist",
                ward="Ward East",
                max_capacity=max_capacity_default,
                assigned_count=0,
                available_capacity=max_capacity_default,
                status="Available",
                assigned_patients=[],
                high_priority_count=0,
                capabilities=["Critical observation", "Rapid response", "Telemetry"],
                workload_percent=0.0,
                is_committed_to_serious=False,
                current_distance_m=None
            ),
            "N02": NurseSummary(
                nurse_id="N02",
                name="Nurse B",
                role="Senior Triage Nurse",
                ward="Ward Central",
                max_capacity=max_capacity_default,
                assigned_count=0,
                available_capacity=max_capacity_default,
                status="Available",
                assigned_patients=[],
                high_priority_count=0,
                capabilities=["Critical observation", "Telemetry", "IV Therapy"],
                workload_percent=0.0,
                is_committed_to_serious=False,
                current_distance_m=None
            ),
            "N03": NurseSummary(
                nurse_id="N03",
                name="Nurse C",
                role="General Ward Care",
                ward="Ward West",
                max_capacity=max_capacity_default,
                assigned_count=0,
                available_capacity=max_capacity_default,
                status="Available",
                assigned_patients=[],
                high_priority_count=0,
                capabilities=["General observation", "IV Therapy", "Post-op care"],
                workload_percent=0.0,
                is_committed_to_serious=False,
                current_distance_m=None
            ),
        }
        self.explanations: Dict[str, AllocationExplanation] = {}

    def set_max_capacity(self, capacity: int):
        self.max_capacity_default = capacity
        for n in self.nurses.values():
            n.max_capacity = capacity
            n.available_capacity = max(0, capacity - n.assigned_count)
            n.workload_percent = round((n.assigned_count / capacity) * 100.0, 1)
            n.status = "At Capacity" if n.available_capacity == 0 else "Available"

    def calculate_distance(self, nurse_id: str, room_str: str) -> float:
        """
        Calculate realistic walking distance in meters from nurse's station to patient room.
        Rooms 101 to 120 spaced ~3.5 meters apart along the main ward corridor.
        """
        room_num = 101
        try:
            room_num = int(''.join(filter(str.isdigit, room_str)) or "101")
        except Exception:
            pass

        patient_pos = (max(101, min(120, room_num)) - 100) * 3.5
        nurse_station = self.NURSE_STATIONS.get(nurse_id, {"pos_m": 35.0})["pos_m"]
        dist = abs(patient_pos - nurse_station) + 2.0  # +2.0m for room doorway entry
        return round(dist, 1)

    def is_patient_serious(self, patient: PatientSummary) -> bool:
        """Check if a patient represents a serious/critical commitment."""
        return bool(
            patient.sos_active or
            patient.trajectory.deterioration_score >= 60.0 or
            patient.trajectory.attention_priority >= 65.0
        )

    def allocate_patients(self, patients: List[PatientSummary]) -> Dict[str, Optional[str]]:
        """
        Dynamically allocates patients to nurses based on:
        1. SOS Emergency & Proximity:
           - First routes to the nearby nurse NOT committed to a serious case.
           - If all nurses are busy/committed, schedules to the shortest-distance nurse (emergency override).
        2. Clinical capability matching & workload safety.
        """
        # Reset nurse assignments
        for n in self.nurses.values():
            n.assigned_patients = []
            n.assigned_count = 0
            n.high_priority_count = 0
            n.available_capacity = n.max_capacity
            n.workload_percent = 0.0
            n.status = "Available"
            n.is_committed_to_serious = False
            n.current_distance_m = None

        patients_by_id = {p.patient_id: p for p in patients}

        # Sort order: Active SOS first, then highest attention priority, then deterioration score
        sorted_patients = sorted(
            patients,
            key=lambda p: (
                1 if p.sos_active else 0,
                p.trajectory.attention_priority,
                p.trajectory.deterioration_score
            ),
            reverse=True
        )

        patient_assignments: Dict[str, Optional[str]] = {}

        for patient in sorted_patients:
            pid = patient.patient_id
            priority = patient.trajectory.attention_priority
            det_score = patient.trajectory.deterioration_score
            iv_urg = patient.trajectory.iv_urgency_score
            is_sos = patient.sos_active
            is_emergency = is_sos or det_score >= 75.0 or priority >= 85.0

            # Determine patient ward from room
            room_num = 101
            try:
                room_num = int(''.join(filter(str.isdigit, patient.room)) or "101")
            except Exception:
                pass

            if room_num <= 106:
                patient_ward = "Ward East"
            elif room_num <= 113:
                patient_ward = "Ward Central"
            else:
                patient_ward = "Ward West"

            # Determine required clinical capability
            if det_score >= 60.0 or priority >= 70.0 or is_sos:
                required_cap = "Critical observation"
            elif iv_urg >= 60.0:
                required_cap = "IV Therapy"
            elif priority >= 40.0:
                required_cap = "Telemetry"
            else:
                required_cap = "General observation"

            best_nurse: Optional[NurseSummary] = None
            best_dist = 999.0
            best_reason = ""
            routing_strat = "STANDARD_CAPACITY"

            if is_emergency:
                # ── SOS / Critical Case Allocation ────────────────────────────
                # Rule: Allocate to nurse who is:
                #   1. Nearby (lowest distance)
                #   2. NOT committed to a serious case
                #   3. Has capacity (preferred)
                candidate_nurses = []
                for n in self.nurses.values():
                    dist = self.calculate_distance(n.nurse_id, patient.room)
                    # Check if nurse is committed to serious case
                    is_committed = n.is_committed_to_serious
                    has_cap = n.available_capacity > 0
                    candidate_nurses.append({
                        "nurse": n,
                        "dist": dist,
                        "is_committed": is_committed,
                        "has_cap": has_cap
                    })

                # Tier 1: Not committed to a serious case AND has available capacity
                tier1 = [c for c in candidate_nurses if not c["is_committed"] and c["has_cap"]]
                # Tier 2: Not committed to a serious case (even if at normal cap)
                tier2 = [c for c in candidate_nurses if not c["is_committed"]]

                if tier1:
                    # Pick closest nurse who is free of serious commitments and has room
                    chosen = min(tier1, key=lambda c: c["dist"])
                    best_nurse = chosen["nurse"]
                    best_dist = chosen["dist"]
                    routing_strat = "PROXIMITY_NON_CRITICAL"
                    best_reason = (
                        f"🚨 SOS PROXIMITY DISPATCH: {best_nurse.name} assigned — Closest available responder "
                        f"({best_dist:.0f}m away in {best_nurse.ward}) who is NOT committed to a serious case "
                        f"(Workload: {best_nurse.assigned_count}/{best_nurse.max_capacity})."
                    )
                elif tier2:
                    # Non-serious nurse, slight capacity stretch for emergency response
                    chosen = min(tier2, key=lambda c: c["dist"])
                    best_nurse = chosen["nurse"]
                    best_dist = chosen["dist"]
                    routing_strat = "PROXIMITY_NON_CRITICAL"
                    best_reason = (
                        f"🚨 SOS PROXIMITY DISPATCH: {best_nurse.name} assigned ({best_dist:.0f}m away) — "
                        f"Not committed to serious cases. Capacity dynamically expanded for emergency triage."
                    )
                else:
                    # Tier 3 (EMERGENCY OVERRIDE): "if every one is bussy shedule to the short distrance nurce in very emergency cases"
                    chosen = min(candidate_nurses, key=lambda c: c["dist"])
                    best_nurse = chosen["nurse"]
                    best_dist = chosen["dist"]
                    routing_strat = "EMERGENCY_DISTANCE_OVERRIDE"
                    best_reason = (
                        f"⚠️ EMERGENCY OVERRIDE: All nurses currently committed to critical cases. "
                        f"Dispatched {best_nurse.name} ({best_nurse.ward}) as absolute shortest-distance "
                        f"responder ({best_dist:.0f}m away) for immediate life-safety triage."
                    )

            else:
                # ── Routine / Sub-Acute Allocation ────────────────────────────
                best_score = -9999.0
                for nurse in self.nurses.values():
                    if nurse.available_capacity <= 0:
                        continue

                    dist = self.calculate_distance(nurse.nurse_id, patient.room)
                    has_cap = required_cap in nurse.capabilities
                    cap_score = 40.0 if has_cap else 10.0
                    
                    # Proximity score inversely proportional to distance (max 30m corridor)
                    proximity_score = max(5.0, 30.0 - (dist * 0.5))

                    # Workload balance penalty
                    workload_penalty = (nurse.assigned_count / nurse.max_capacity) * 30.0

                    # Penalty if already handling high priority
                    high_pri_penalty = nurse.high_priority_count * 15.0

                    # Penalty if handling serious case (preserve them for critical emergencies)
                    serious_penalty = 25.0 if nurse.is_committed_to_serious else 0.0

                    candidate_score = cap_score + proximity_score - workload_penalty - high_pri_penalty - serious_penalty

                    if candidate_score > best_score:
                        best_score = candidate_score
                        best_nurse = nurse
                        best_dist = dist
                        pri_label = "HIGH" if priority >= 60 else ("MODERATE" if priority >= 35 else "STABLE")
                        best_reason = (
                            f"Priority: {pri_label} ({priority:.0f}) | "
                            f"Required: {required_cap} | "
                            f"{nurse.name}: {'Matched capability' if has_cap else 'General care'} | "
                            f"Distance: {dist:.0f}m ({nurse.ward}) | "
                            f"Workload: {nurse.assigned_count}/{nurse.max_capacity}"
                        )

            if best_nurse:
                best_nurse.assigned_patients.append(pid)
                best_nurse.assigned_count += 1
                best_nurse.available_capacity = max(0, best_nurse.max_capacity - best_nurse.assigned_count)
                if priority >= 60.0 or is_sos:
                    best_nurse.high_priority_count += 1
                
                # Mark nurse as committed to serious if this patient is serious
                if self.is_patient_serious(patient):
                    best_nurse.is_committed_to_serious = True

                best_nurse.workload_percent = round((best_nurse.assigned_count / best_nurse.max_capacity) * 100.0, 1)
                best_nurse.status = "At Capacity" if best_nurse.available_capacity == 0 else "Available"
                best_nurse.current_distance_m = best_dist

                patient_assignments[pid] = best_nurse.nurse_id

                self.explanations[pid] = AllocationExplanation(
                    patient_id=pid,
                    nurse_id=best_nurse.nurse_id,
                    nurse_name=best_nurse.name,
                    priority_level="EMERGENCY" if is_sos else ("HIGH" if priority >= 60 else ("MODERATE" if priority >= 35 else "STABLE")),
                    required_capability=required_cap,
                    current_workload=f"{best_nurse.assigned_count}/{best_nurse.max_capacity}",
                    location=f"{best_nurse.ward} ({best_dist:.0f}m away)",
                    reason=best_reason,
                    distance_m=best_dist,
                    routing_strategy=routing_strat
                )
            else:
                # Capacity overflow
                patient_assignments[pid] = None
                self.explanations[pid] = AllocationExplanation(
                    patient_id=pid,
                    nurse_id="UNASSIGNED",
                    nurse_name="Unassigned (Queue)",
                    priority_level="OVERFLOW",
                    required_capability=required_cap,
                    current_workload="All nurses at capacity",
                    location=patient_ward,
                    reason="ATTENTION: All active nurses are at maximum workload capacity. Patient held in priority triage queue.",
                    distance_m=None,
                    routing_strategy="QUEUE_OVERFLOW"
                )

        return patient_assignments

    def get_nurses_summary(self) -> List[NurseSummary]:
        return list(self.nurses.values())

    def get_explanation(self, patient_id: str) -> Optional[AllocationExplanation]:
        return self.explanations.get(patient_id)
