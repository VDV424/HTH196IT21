from datetime import datetime, timezone
import uuid
from typing import Dict, Any, Optional
from ..models.schemas import HandoverRecord, PatientSummary, TrajectoryAnalysis

class HandoverService:
    def __init__(self):
        self.handovers: Dict[str, HandoverRecord] = {}

    def generate_handover(
        self,
        patient: PatientSummary,
        nurse_id: str,
        open_alerts_summary: str = "None"
    ) -> HandoverRecord:
        now_str = datetime.now(timezone.utc).isoformat()
        rec_id = f"HO-{patient.patient_id}-{uuid.uuid4().hex[:4].upper()}"

        traj = patient.trajectory
        summary_text = (
            f"PATIENT HANDOVER SUMMARY - {patient.patient_id} ({patient.name})\n"
            f"Location: {patient.room} | Data Source: {patient.data_source.value}\n"
            f"Attention Priority: {traj.attention_priority:.0f}/100 | State: {traj.trajectory_state.value}\n"
            f"Physiological Deterioration: {traj.deterioration_score:.0f}/100 ({traj.physiological_level})\n"
            f"Current Vitals: HR {patient.current_vitals.heart_rate:.0f} bpm (baseline {patient.baseline_hr:.0f}), "
            f"SpO2 {patient.current_vitals.spo2:.1f}% (baseline {patient.baseline_spo2:.1f}%), "
            f"Temp {patient.current_vitals.temperature:.1f}°C\n"
            f"IV Status: Bag remaining {patient.current_iv.iv_remaining_ml:.0f} mL, Flow {patient.current_iv.iv_flow} mL/h ({patient.current_iv.iv_state})\n"
            f"Signal Quality: {patient.current_vitals.signal_quality.value} (Confidence: {traj.confidence_level})\n"
            f"Active Alerts: {open_alerts_summary}\n"
            f"Recommended Next Review: In {15 if traj.attention_priority > 50 else 30} minutes."
        )

        record = HandoverRecord(
            id=rec_id,
            patient_id=patient.patient_id,
            nurse_id=nurse_id,
            summary_text=summary_text,
            trajectory_snapshot={
                "attention_priority": traj.attention_priority,
                "deterioration_score": traj.deterioration_score,
                "iv_urgency_score": traj.iv_urgency_score,
                "trajectory_state": traj.trajectory_state.value,
                "confidence_level": traj.confidence_level,
                "heart_rate": patient.current_vitals.heart_rate,
                "spo2": patient.current_vitals.spo2,
                "temperature": patient.current_vitals.temperature,
                "iv_remaining_ml": patient.current_iv.iv_remaining_ml,
            },
            is_ready=True,
            created_at=now_str,
            recommended_next_review_min=15 if traj.attention_priority > 50 else 30,
        )

        self.handovers[patient.patient_id] = record
        return record

    def get_handover(self, patient_id: str) -> Optional[HandoverRecord]:
        return self.handovers.get(patient_id)

    def mark_ready(self, patient_id: str, is_ready: bool = True) -> Optional[HandoverRecord]:
        if patient_id in self.handovers:
            self.handovers[patient_id].is_ready = is_ready
            return self.handovers[patient_id]
        return None
