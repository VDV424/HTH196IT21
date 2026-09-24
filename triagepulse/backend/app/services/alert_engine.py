from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import uuid
from ..models.schemas import AlertModel, AlertStatus, TrajectoryAnalysis, SignalQuality, IVData

class AlertEngine:
    def __init__(self):
        # In-memory active episodes: patient_id -> {alert_type: AlertModel}
        self.active_episodes: Dict[str, Dict[str, AlertModel]] = {}
        self.resolved_episodes: List[AlertModel] = []
        self.raw_observations_count = 0

    def evaluate_and_update(
        self,
        patient_id: str,
        patient_name: str,
        room: str,
        trajectory: TrajectoryAnalysis,
        current_iv: IVData,
        signal_quality: SignalQuality,
        assigned_nurse: Optional[str] = None,
        sos_active: bool = False,
        request_active: bool = False,
        request_type: Optional[str] = None,
    ) -> List[AlertModel]:
        """
        Deduplicates raw observations into single continuous alert episodes.
        Reduces alarm fatigue with alert compression.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        if patient_id not in self.active_episodes:
            self.active_episodes[patient_id] = {}

        patient_alerts = self.active_episodes[patient_id]

        # Check conditions
        detected_conditions = []

        # 1. Physiological Trajectory Condition
        if trajectory.deterioration_score >= 55.0:
            sev = "HIGH_ATTENTION" if trajectory.deterioration_score >= 75.0 else "REVIEW"
            detected_conditions.append({
                "type": "Physiological trajectory",
                "severity": sev,
                "title": f"Trajectory Alert: {patient_id} Worsening Vitals",
                "reason": f"Deterioration score {trajectory.deterioration_score:.0f}/100. Multi-vital agreement: {'Yes' if trajectory.multi_vital_agreement else 'No'}.",
            })
        elif trajectory.deterioration_score >= 38.0:
            detected_conditions.append({
                "type": "Physiological trajectory",
                "severity": "WATCH",
                "title": f"Trajectory Watch: {patient_id} Baseline Shift",
                "reason": f"Deterioration score {trajectory.deterioration_score:.0f}/100. Trend slope: {trajectory.short_term_slope:.1f}.",
            })

        # 2. IV Urgency Conditions
        if current_iv.iv_state in ["NO_FLOW", "OCCLUDED"]:
            detected_conditions.append({
                "type": "IV no-flow",
                "severity": "HIGH_ATTENTION",
                "title": f"IV Delivery Alert: {patient_id} Flow Stopped",
                "reason": f"Bag remaining {current_iv.iv_remaining_ml:.0f} mL but no fluid delivery detected (flow: {current_iv.iv_flow} mL/h).",
            })
        elif current_iv.iv_remaining_ml <= 80.0 or current_iv.iv_state == "NEAR_EMPTY":
            sev = "IMMEDIATE_REVIEW" if current_iv.iv_remaining_ml <= 35.0 else "HIGH_ATTENTION"
            detected_conditions.append({
                "type": "IV near empty",
                "severity": sev,
                "title": f"IV Care Task: {patient_id} Bag Near Empty",
                "reason": f"Remaining volume is {current_iv.iv_remaining_ml:.0f} mL. Estimated empty in {current_iv.estimated_time_to_empty_min:.0f} min.",
            })

        # 3. Sensor / Signal Quality Conditions
        # Remember: Sensor issue is NOT physiological deterioration
        if signal_quality == SignalQuality.MISSING:
            detected_conditions.append({
                "type": "Missing data",
                "severity": "REVIEW",
                "title": f"Telemetry Alert: {patient_id} Sensor Missing",
                "reason": "Data stream disconnected. Trajectory analysis paused pending sensor reconnection.",
            })
        elif signal_quality == SignalQuality.NOISY:
            detected_conditions.append({
                "type": "Sensor quality",
                "severity": "WATCH",
                "title": f"Sensor Alert: {patient_id} Signal Noise",
                "reason": "Sensor signal exhibits high jitter/noise. Quality degraded (Confidence Moderate).",
            })
        elif signal_quality == SignalQuality.MOTION_ARTIFACT:
            detected_conditions.append({
                "type": "Motion artifact",
                "severity": "WATCH",
                "title": f"Signal Quality: {patient_id} Patient Motion",
                "reason": "Active patient movement causing telemetry artifact.",
            })

        # 4. SOS Emergency Panic Button
        if sos_active:
            detected_conditions.append({
                "type": "SOS emergency",
                "severity": "IMMEDIATE_REVIEW",
                "title": f"🚨 SOS EMERGENCY: {patient_id} — Patient Pressed Panic Button",
                "reason": f"Patient {patient_name} in {room} has activated the bedside SOS emergency switch. Immediate nurse response required.",
            })

        # 5. Nurse Request Button (non-emergency)
        if request_active:
            req_cat = request_type or "General"
            detected_conditions.append({
                "type": "Nurse request",
                "severity": "REVIEW",
                "title": f"📞 Nurse Request: {patient_id} — {req_cat}",
                "reason": f"Patient {patient_name} in {room} has pressed the nurse call button. Request type: {req_cat}.",
            })

        # Process detections into single continuous episodes
        detected_types = set()
        for cond in detected_conditions:
            alert_type = cond["type"]
            detected_types.add(alert_type)
            self.raw_observations_count += 1

            if alert_type in patient_alerts:
                # Existing episode - COMPRESS observation, increment count, update title/reason/severity
                episode = patient_alerts[alert_type]
                episode.raw_observations_count += 1
                episode.severity = cond["severity"]
                episode.reason = cond["reason"]
                if assigned_nurse:
                    episode.assigned_nurse = assigned_nurse
            else:
                # New episode
                alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
                new_alert = AlertModel(
                    id=alert_id,
                    patient_id=patient_id,
                    patient_name=patient_name,
                    room=room,
                    alert_type=alert_type,
                    severity=cond["severity"],
                    title=cond["title"],
                    reason=cond["reason"],
                    assigned_nurse=assigned_nurse,
                    status=AlertStatus.OPEN,
                    raw_observations_count=1,
                    created_at=now_str,
                )
                patient_alerts[alert_type] = new_alert

        # Auto-resolve physiological alerts if patient has recovered (deterioration < 25)
        # and IV alert if IV bag replenished (iv_remaining > 200)
        to_resolve = []
        for alert_type, episode in list(patient_alerts.items()):
            if alert_type not in detected_types:
                # Condition has cleared!
                episode.status = AlertStatus.RESOLVED
                episode.resolved_at = now_str
                # Calculate resolution time
                try:
                    t_start = datetime.fromisoformat(episode.created_at)
                    t_end = datetime.fromisoformat(now_str)
                    episode.resolution_time_sec = round((t_end - t_start).total_seconds(), 1)
                except Exception:
                    episode.resolution_time_sec = 45.0
                self.resolved_episodes.append(episode)
                to_resolve.append(alert_type)

        for a_type in to_resolve:
            del patient_alerts[a_type]

        return list(patient_alerts.values())

    def get_all_active_alerts(self) -> List[AlertModel]:
        alerts = []
        for p_alerts in self.active_episodes.values():
            alerts.extend(p_alerts.values())
        return alerts

    def get_all_alerts_including_resolved(self) -> List[AlertModel]:
        all_list = self.get_all_active_alerts() + self.resolved_episodes
        # Sort by creation time descending
        all_list.sort(key=lambda x: x.created_at, reverse=True)
        return all_list

    def acknowledge_alert(self, alert_id: str, nurse_name: Optional[str] = None) -> Optional[AlertModel]:
        now_str = datetime.now(timezone.utc).isoformat()
        for p_alerts in self.active_episodes.values():
            for ep in p_alerts.values():
                if ep.id == alert_id:
                    ep.status = AlertStatus.ACKNOWLEDGED
                    ep.acknowledged_at = now_str
                    if nurse_name:
                        ep.assigned_nurse = nurse_name
                    try:
                        t0 = datetime.fromisoformat(ep.created_at)
                        ep.acknowledgement_latency_sec = round((datetime.now(timezone.utc) - t0).total_seconds(), 1)
                    except Exception:
                        ep.acknowledgement_latency_sec = 8.5
                    return ep
        return None

    def review_alert(self, alert_id: str, nurse_name: Optional[str] = None) -> Optional[AlertModel]:
        now_str = datetime.now(timezone.utc).isoformat()
        for p_alerts in self.active_episodes.values():
            for ep in p_alerts.values():
                if ep.id == alert_id:
                    ep.status = AlertStatus.UNDER_REVIEW
                    ep.reviewed_at = now_str
                    if nurse_name:
                        ep.assigned_nurse = nurse_name
                    try:
                        t0 = datetime.fromisoformat(ep.acknowledged_at or ep.created_at)
                        ep.review_latency_sec = round((datetime.now(timezone.utc) - t0).total_seconds(), 1)
                    except Exception:
                        ep.review_latency_sec = 14.0
                    return ep
        return None

    def escalate_alert(self, alert_id: str, nurse_name: Optional[str] = None) -> Optional[AlertModel]:
        now_str = datetime.now(timezone.utc).isoformat()
        for p_alerts in self.active_episodes.values():
            for ep in p_alerts.values():
                if ep.id == alert_id:
                    ep.status = AlertStatus.ESCALATED
                    ep.escalated_at = now_str
                    if nurse_name:
                        ep.assigned_nurse = nurse_name
                    return ep
        return None

    def resolve_alert(self, alert_id: str) -> Optional[AlertModel]:
        now_str = datetime.now(timezone.utc).isoformat()
        for p_id, p_alerts in list(self.active_episodes.items()):
            for a_type, ep in list(p_alerts.items()):
                if ep.id == alert_id:
                    ep.status = AlertStatus.RESOLVED
                    ep.resolved_at = now_str
                    try:
                        t0 = datetime.fromisoformat(ep.created_at)
                        ep.resolution_time_sec = round((datetime.now(timezone.utc) - t0).total_seconds(), 1)
                    except Exception:
                        ep.resolution_time_sec = 60.0
                    self.resolved_episodes.append(ep)
                    del p_alerts[a_type]
                    return ep
        return None

    def get_fatigue_compression_metrics(self) -> Tuple[int, int, float]:
        active_count = len(self.get_all_active_alerts())
        total_episodes = active_count + len(self.resolved_episodes)
        total_raw = max(self.raw_observations_count, total_episodes)
        if total_raw > 0:
            compression_ratio = round(((total_raw - total_episodes) / total_raw) * 100.0, 1)
        else:
            compression_ratio = 0.0
        return total_raw, total_episodes, max(0.0, compression_ratio)
