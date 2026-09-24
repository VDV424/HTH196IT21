import pytest
from app.models.schemas import VitalsData, IVData, SignalQuality, PatientSummary, DataSource, AlertStatus
from app.services.trajectory import analyze_patient_trajectory, compute_slope
from app.services.alert_engine import AlertEngine
from app.services.allocation import NurseAllocationEngine
from app.services.handover import HandoverService

def test_compute_slope():
    # Constant
    assert compute_slope([10.0, 10.0, 10.0]) == 0.0
    # Increasing
    slope_inc = compute_slope([10.0, 12.0, 14.0])
    assert slope_inc == 2.0
    # Decreasing
    slope_dec = compute_slope([14.0, 12.0, 10.0])
    assert slope_dec == -2.0

def test_stable_patient_trajectory():
    vitals = VitalsData(
        heart_rate=74.0,
        spo2=98.0,
        temperature=36.8,
        motion=0.1,
        signal_quality=SignalQuality.GOOD,
        timestamp="2026-09-24T12:00:00Z"
    )
    iv = IVData(iv_weight=500.0, iv_flow=20.0, iv_remaining_ml=500.0, iv_state="NORMAL")
    traj = analyze_patient_trajectory(vitals, iv, baseline_hr=75.0, baseline_spo2=98.0, baseline_temp=36.8)

    assert traj.deterioration_score < 15.0
    assert traj.iv_urgency_score < 15.0
    assert traj.attention_priority < 20.0
    assert traj.trajectory_state.value == "STABLE"
    assert traj.confidence_level == "HIGH"
    assert traj.physiological_level == "LOW"

def test_rapid_deterioration_trajectory():
    # Multi-vital rapid deterioration (HR up, SpO2 down, Temp up)
    history = [
        VitalsData(heart_rate=75.0, spo2=98.0, temperature=36.8, timestamp="t1"),
        VitalsData(heart_rate=88.0, spo2=95.0, temperature=37.2, timestamp="t2"),
        VitalsData(heart_rate=105.0, spo2=91.0, temperature=37.8, timestamp="t3"),
        VitalsData(heart_rate=122.0, spo2=87.0, temperature=38.6, timestamp="t4"),
    ]
    current = history[-1]
    iv = IVData(iv_weight=400.0, iv_flow=20.0, iv_remaining_ml=400.0, iv_state="NORMAL")
    traj = analyze_patient_trajectory(current, iv, baseline_hr=75.0, baseline_spo2=98.0, baseline_temp=36.8, vitals_history=history, persistence_counter=3)

    assert traj.deterioration_score >= 60.0
    assert traj.multi_vital_agreement is True
    assert traj.trajectory_state.value == "WORSENING"
    assert traj.physiological_level == "HIGH"
    # Explainable reasons breakdown exists
    assert len(traj.reasons_breakdown) >= 5

def test_sensor_fault_does_not_equal_physiological_deterioration():
    """
    CRITICAL SAFETY REQUIREMENT:
    A sensor failure must NOT automatically become patient deterioration!
    """
    # Missing sensor
    missing_vitals = VitalsData(
        heart_rate=0.0,
        spo2=0.0,
        temperature=0.0,
        motion=0.0,
        signal_quality=SignalQuality.MISSING,
        timestamp="t1"
    )
    iv = IVData(iv_weight=500.0, iv_flow=20.0, iv_remaining_ml=500.0, iv_state="NORMAL")
    traj = analyze_patient_trajectory(missing_vitals, iv)

    assert traj.deterioration_score == 0.0
    assert traj.confidence_level == "INSUFFICIENT"
    assert traj.physiological_level == "LOW"
    assert "insufficient" in traj.reasons_breakdown[0].description.lower()

def test_iv_urgency_independent_of_physiology():
    """
    Care-task / IV urgency is separated from physiological deterioration.
    """
    # Patient vitals are completely stable, but IV bag is nearly empty (30 mL)
    vitals = VitalsData(heart_rate=72.0, spo2=98.0, temperature=36.7, timestamp="t1")
    iv = IVData(iv_weight=30.0, iv_flow=20.0, iv_remaining_ml=30.0, iv_state="NEAR_EMPTY")
    traj = analyze_patient_trajectory(vitals, iv, baseline_hr=72.0, baseline_spo2=98.0, baseline_temp=36.7)

    assert traj.physiological_level == "LOW"
    assert traj.deterioration_score < 10.0
    assert traj.iv_level == "HIGH"
    assert traj.iv_urgency_score >= 75.0
    # Overall attention priority is elevated because of IV task urgency
    assert traj.attention_priority >= 25.0

def test_alert_episode_deduplication():
    """
    17 consecutive abnormal readings must NOT generate 17 distinct alerts.
    They must be compressed into 1 active episode with count = 17.
    """
    engine = AlertEngine()
    current_iv = IVData(iv_weight=500.0, iv_flow=20.0, iv_remaining_ml=500.0, iv_state="NORMAL")

    history = []
    persistence = 0

    # Simulate 17 ticks of abnormal deterioration
    for i in range(17):
        v = VitalsData(heart_rate=115.0 + (i * 0.5), spo2=90.0 - (i * 0.2), temperature=38.2, timestamp=f"t{i}")
        history.append(v)
        traj = analyze_patient_trajectory(
            v,
            current_iv,
            baseline_hr=75.0, baseline_spo2=98.0, baseline_temp=36.8,
            vitals_history=history,
            persistence_counter=persistence
        )
        persistence = traj.persistence_ticks
        alerts = engine.evaluate_and_update(
            patient_id="P05",
            patient_name="Patient P05",
            room="Room 105",
            trajectory=traj,
            current_iv=current_iv,
            signal_quality=SignalQuality.GOOD
        )

    # There should only be 1 active episode for physiological trajectory
    assert len(alerts) == 1
    assert alerts[0].raw_observations_count == 17
    raw, episodes, compression = engine.get_fatigue_compression_metrics()
    assert episodes == 1
    assert raw >= 17
    assert compression > 80.0  # Demonstrates >80% fatigue reduction!

def test_alert_lifecycle():
    engine = AlertEngine()
    current_iv = IVData(iv_weight=35.0, iv_flow=20.0, iv_remaining_ml=35.0, iv_state="NEAR_EMPTY")
    vitals = VitalsData(heart_rate=75.0, spo2=98.0, temperature=36.8, timestamp="t1")
    traj = analyze_patient_trajectory(vitals, current_iv)

    alerts = engine.evaluate_and_update("P03", "Patient P03", "Room 103", traj, current_iv, SignalQuality.GOOD)
    assert len(alerts) == 1
    aid = alerts[0].id
    assert alerts[0].status == AlertStatus.OPEN

    # Acknowledge
    ack = engine.acknowledge_alert(aid, nurse_name="Nurse B")
    assert ack.status == AlertStatus.ACKNOWLEDGED
    assert ack.assigned_nurse == "Nurse B"
    assert ack.acknowledged_at is not None

    # Review
    rev = engine.review_alert(aid, nurse_name="Nurse B")
    assert rev.status == AlertStatus.UNDER_REVIEW
    assert rev.reviewed_at is not None

    # Escalate
    esc = engine.escalate_alert(aid, nurse_name="Nurse B")
    assert esc.status == AlertStatus.ESCALATED
    assert esc.escalated_at is not None

    # Resolve
    res = engine.resolve_alert(aid)
    assert res.status == AlertStatus.RESOLVED
    assert res.resolved_at is not None
    assert len(engine.get_all_active_alerts()) == 0

def test_nurse_capacity_and_dynamic_allocation():
    alloc_engine = NurseAllocationEngine(max_capacity_default=2)  # Low capacity test

    # Create 3 patients
    patients = []
    for i in range(1, 4):
        v = VitalsData(heart_rate=75.0, spo2=98.0, temperature=36.8, timestamp="t1")
        iv = IVData()
        traj = analyze_patient_trajectory(v, iv)
        p = PatientSummary(
            patient_id=f"P0{i}",
            name=f"Patient P0{i}",
            room=f"Room 10{i}",
            scenario="STABLE",
            dataSource=DataSource.SIMULATION,
            baseline_hr=75.0,
            baseline_spo2=98.0,
            baseline_temp=36.8,
            current_vitals=v,
            current_iv=iv,
            trajectory=traj,
            last_update="t1"
        )
        patients.append(p)

    assignments = alloc_engine.allocate_patients(patients)
    # Check that capacity is never exceeded
    for n in alloc_engine.get_nurses_summary():
        assert n.assigned_count <= n.max_capacity

    # Verify allocation explanations exist
    for p in patients:
        exp = alloc_engine.get_explanation(p.patient_id)
        assert exp is not None
        assert exp.reason != ""
