from typing import List, Dict, Optional, Tuple
from ..models.schemas import (
    NurseSummary,
    PatientSummary,
    AllocationExplanation,
    TrajectoryAnalysis,
)

class NurseAllocationEngine:
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
                workload_percent=0.0
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
                workload_percent=0.0
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
                workload_percent=0.0
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

    def allocate_patients(self, patients: List[PatientSummary]) -> Dict[str, Optional[str]]:
        """
        Dynamically allocates patients to nurses based on priority, workload,
        required capability, ward proximity, and strict capacity limits.
        Returns mapping: patient_id -> nurse_id
        """
        # Reset nurse assignments count
        for n in self.nurses.values():
            n.assigned_patients = []
            n.assigned_count = 0
            n.high_priority_count = 0
            n.available_capacity = n.max_capacity
            n.workload_percent = 0.0
            n.status = "Available"

        # Sort patients by Attention Priority descending (highest urgency first)
        sorted_patients = sorted(
            patients,
            key=lambda p: (p.trajectory.attention_priority, p.trajectory.deterioration_score),
            reverse=True
        )

        patient_assignments: Dict[str, Optional[str]] = {}

        for patient in sorted_patients:
            pid = patient.patient_id
            priority = patient.trajectory.attention_priority
            det_score = patient.trajectory.deterioration_score
            iv_urg = patient.trajectory.iv_urgency_score

            # Determine required capability
            if det_score >= 60.0 or priority >= 70.0:
                required_cap = "Critical observation"
            elif iv_urg >= 60.0:
                required_cap = "IV Therapy"
            elif priority >= 40.0:
                required_cap = "Telemetry"
            else:
                required_cap = "General observation"

            # Determine patient ward from room
            # e.g., Room 101-106 -> Ward East, 107-113 -> Ward Central, 114-120 -> Ward West
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

            # Score each nurse candidate that has available capacity
            best_nurse: Optional[NurseSummary] = None
            best_score = -9999.0
            best_reason = ""

            for nurse in self.nurses.values():
                if nurse.available_capacity <= 0:
                    continue  # Strict safety guard: never exceed max capacity

                # Capability match bonus
                has_cap = required_cap in nurse.capabilities
                cap_score = 40.0 if has_cap else 10.0

                # Ward proximity bonus
                ward_score = 25.0 if nurse.ward == patient_ward else 5.0

                # Workload balance (prefer nurse with lower workload)
                workload_penalty = (nurse.assigned_count / nurse.max_capacity) * 30.0

                # High priority concentration prevention
                high_pri_penalty = nurse.high_priority_count * 15.0

                candidate_score = cap_score + ward_score - workload_penalty - high_pri_penalty

                if candidate_score > best_score:
                    best_score = candidate_score
                    best_nurse = nurse
                    pri_label = "HIGH" if priority >= 60 else ("MODERATE" if priority >= 35 else "STABLE")
                    best_reason = (
                        f"Priority: {pri_label} ({priority:.0f}) | "
                        f"Required: {required_cap} | "
                        f"{nurse.name}: {'Matched capability' if has_cap else 'General support'} | "
                        f"Workload: {nurse.assigned_count}/{nurse.max_capacity} | "
                        f"Ward: {'Same ward (' + patient_ward + ')' if nurse.ward == patient_ward else nurse.ward}"
                    )

            if best_nurse:
                best_nurse.assigned_patients.append(pid)
                best_nurse.assigned_count += 1
                best_nurse.available_capacity = best_nurse.max_capacity - best_nurse.assigned_count
                if priority >= 60.0:
                    best_nurse.high_priority_count += 1
                best_nurse.workload_percent = round((best_nurse.assigned_count / best_nurse.max_capacity) * 100.0, 1)
                best_nurse.status = "At Capacity" if best_nurse.available_capacity == 0 else "Available"

                patient_assignments[pid] = best_nurse.nurse_id

                self.explanations[pid] = AllocationExplanation(
                    patient_id=pid,
                    nurse_id=best_nurse.nurse_id,
                    nurse_name=best_nurse.name,
                    priority_level="HIGH" if priority >= 60 else ("MODERATE" if priority >= 35 else "STABLE"),
                    required_capability=required_cap,
                    current_workload=f"{best_nurse.assigned_count}/{best_nurse.max_capacity}",
                    location=best_nurse.ward,
                    reason=best_reason
                )
            else:
                # Capacity overflow!
                patient_assignments[pid] = None
                self.explanations[pid] = AllocationExplanation(
                    patient_id=pid,
                    nurse_id="UNASSIGNED",
                    nurse_name="Unassigned (Queue)",
                    priority_level="OVERFLOW",
                    required_capability=required_cap,
                    current_workload="All nurses at capacity",
                    location=patient_ward,
                    reason="ATTENTION: All active nurses are at maximum workload capacity (5/5). Patient held in priority triage queue."
                )

        return patient_assignments

    def get_nurses_summary(self) -> List[NurseSummary]:
        return list(self.nurses.values())

    def get_explanation(self, patient_id: str) -> Optional[AllocationExplanation]:
        return self.explanations.get(patient_id)
