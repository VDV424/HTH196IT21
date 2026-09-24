from typing import List, Dict, Any, Optional
import math
from ..models.schemas import (
    VitalsData,
    IVData,
    TrajectoryAnalysis,
    TrajectoryBreakdownItem,
    TrajectoryDirection,
    SignalQuality,
)

def compute_slope(values: List[float]) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    x = list(range(n))
    x_mean = sum(x) / n
    y_mean = sum(values) / n
    numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
    if denominator == 0:
        return 0.0
    return numerator / denominator

def analyze_patient_trajectory(
    current_vitals: VitalsData,
    current_iv: IVData,
    baseline_hr: float = 75.0,
    baseline_spo2: float = 98.0,
    baseline_temp: float = 36.8,
    vitals_history: Optional[List[VitalsData]] = None,
    persistence_counter: int = 0,
    settings: Optional[Dict[str, float]] = None,
) -> TrajectoryAnalysis:
    """
    Project-defined Trajectory Analysis Engine.
    EDUCATIONAL / RESEARCH PROTOTYPE ONLY.
    Not for clinical diagnosis or autonomous patient care.
    """
    if settings is None:
        settings = {
            "weight_trend_severity": 0.30,
            "weight_rate_of_change": 0.20,
            "weight_persistence": 0.15,
            "weight_multi_vital": 0.15,
            "weight_baseline_deviation": 0.10,
            "weight_signal_confidence": 0.10,
            "weight_deterioration_overall": 0.65,
            "weight_iv_urgency_overall": 0.35,
        }

    history = vitals_history or [current_vitals]

    # 1. Signal Quality Confidence handling
    # A sensor failure must NEVER be reported as patient physiological deterioration.
    sig_quality = current_vitals.signal_quality
    if sig_quality == SignalQuality.GOOD:
        confidence_factor = 1.0
        confidence_level = "HIGH"
    elif sig_quality == SignalQuality.NOISY:
        confidence_factor = 0.55
        confidence_level = "MODERATE"
    elif sig_quality == SignalQuality.MOTION_ARTIFACT:
        confidence_factor = 0.40
        confidence_level = "LOW"
    elif sig_quality == SignalQuality.STALE:
        confidence_factor = 0.20
        confidence_level = "LOW"
    else:  # MISSING
        confidence_factor = 0.05
        confidence_level = "INSUFFICIENT"

    # If signal is completely missing or gross motion artifact, trajectory cannot infer worsening
    if sig_quality == SignalQuality.MISSING:
        breakdown = [
            TrajectoryBreakdownItem(
                label="Signal Quality",
                points=0.0,
                description="Signal missing or sensor disconnected. Data quality insufficient for reliable trajectory assessment.",
            )
        ]
        return TrajectoryAnalysis(
            attention_priority=35.0,  # Technical attention needed for sensor, but not physiological
            deterioration_score=0.0,
            iv_urgency_score=0.0,
            trajectory_state=TrajectoryDirection.STABLE,
            confidence_level="INSUFFICIENT",
            physiological_level="LOW",
            iv_level="LOW",
            reasons_breakdown=breakdown,
            multi_vital_agreement=False,
            persistence_ticks=0,
            short_term_slope=0.0,
            long_term_slope=0.0,
            baseline_deviation_hr=0.0,
            baseline_deviation_spo2=0.0,
            baseline_deviation_temp=0.0,
        )

    # 2. Baseline Deviations
    hr = current_vitals.heart_rate
    spo2 = current_vitals.spo2
    temp = current_vitals.temperature

    dev_hr = max(0.0, abs(hr - baseline_hr) - 5.0)  # 5 bpm margin
    dev_spo2 = max(0.0, baseline_spo2 - spo2)       # drop below baseline
    dev_temp = max(0.0, abs(temp - baseline_temp) - 0.3)

    # Normalize deviation score (0 - 100)
    hr_dev_score = min(100.0, (dev_hr / 35.0) * 100.0)
    spo2_dev_score = min(100.0, (dev_spo2 / 8.0) * 100.0)
    temp_dev_score = min(100.0, (dev_temp / 2.0) * 100.0)
    raw_deviation_score = (hr_dev_score * 0.4) + (spo2_dev_score * 0.45) + (temp_dev_score * 0.15)

    # 3. Slopes & Rate of Change
    recent_hrs = [v.heart_rate for v in history[-5:]]
    recent_spo2s = [v.spo2 for v in history[-5:]]
    recent_temps = [v.temperature for v in history[-5:]]

    slope_hr = compute_slope(recent_hrs)
    slope_spo2 = compute_slope(recent_spo2s)
    slope_temp = compute_slope(recent_temps)

    # Worsening slope: HR up (+), SpO2 down (-), Temp up (+)
    hr_worsening = max(0.0, slope_hr)
    spo2_worsening = max(0.0, -slope_spo2)
    temp_worsening = max(0.0, slope_temp)

    short_term_slope = (hr_worsening * 3.0) + (spo2_worsening * 8.0) + (temp_worsening * 15.0)
    short_term_slope = min(100.0, max(0.0, short_term_slope * 10.0))

    # Long-term slope (last 15)
    long_hrs = [v.heart_rate for v in history[-15:]]
    long_spo2s = [v.spo2 for v in history[-15:]]
    slope_long_hr = compute_slope(long_hrs)
    slope_long_spo2 = compute_slope(long_spo2s)
    long_term_slope = min(100.0, max(0.0, (max(0.0, slope_long_hr) * 2.0 + max(0.0, -slope_long_spo2) * 5.0) * 8.0))

    # Rate of change
    if len(history) >= 2:
        prev = history[-2]
        delta_hr = abs(current_vitals.heart_rate - prev.heart_rate)
        delta_spo2 = abs(current_vitals.spo2 - prev.spo2)
        delta_temp = abs(current_vitals.temperature - prev.temperature)
        rate_of_change = min(100.0, (delta_hr * 2.5 + delta_spo2 * 6.0 + delta_temp * 15.0))
    else:
        rate_of_change = 0.0

    # 4. Multi-Vital Concordance
    # Agreement when 2 or more vitals are deteriorating together
    worsening_count = 0
    if dev_hr > 8 or hr_worsening > 0.4:
        worsening_count += 1
    if dev_spo2 > 2.0 or spo2_worsening > 0.3:
        worsening_count += 1
    if dev_temp > 0.5 or temp_worsening > 0.1:
        worsening_count += 1

    multi_vital_agreement = (worsening_count >= 2)
    multi_vital_score = 90.0 if worsening_count >= 3 else (60.0 if worsening_count == 2 else (20.0 if worsening_count == 1 else 0.0))

    # 5. Persistence calculation
    if raw_deviation_score > 25.0:
        persistence_ticks = persistence_counter + 1
    else:
        persistence_ticks = max(0, persistence_counter - 1)
    persistence_score = min(100.0, persistence_ticks * 16.0)

    # 6. Physiological Deterioration D(t)
    w_trend = settings.get("weight_trend_severity", 0.30)
    w_roc = settings.get("weight_rate_of_change", 0.20)
    w_pers = settings.get("weight_persistence", 0.15)
    w_mv = settings.get("weight_multi_vital", 0.15)
    w_dev = settings.get("weight_baseline_deviation", 0.10)

    # When history is building or baseline deviation is acute, baseline deviation and multi-vital
    # agreement provide immediate foundational signal, amplified by trend, rate of change, and persistence
    dynamic_factors = (
        (short_term_slope * w_trend) +
        (rate_of_change * w_roc) +
        (persistence_score * w_pers) +
        (multi_vital_score * w_mv) +
        (raw_deviation_score * w_dev)
    )

    # Baseline deviation floor when multiple vitals diverge significantly
    vital_divergence_floor = (raw_deviation_score * 0.6) if multi_vital_agreement else (raw_deviation_score * 0.35)
    combined_deterioration = max(dynamic_factors, vital_divergence_floor + (persistence_score * 0.25) + (short_term_slope * 0.15))

    # Scale by confidence factor
    deterioration_score = round(min(100.0, max(0.0, combined_deterioration * confidence_factor)), 1)

    # 7. IV Bag Urgency U(t)
    iv_rem = current_iv.iv_remaining_ml
    iv_state = current_iv.iv_state.upper()
    iv_flow = current_iv.iv_flow

    iv_urgency_score = 5.0
    iv_level = "LOW"

    if iv_state in ["NO_FLOW", "OCCLUDED"] or (iv_flow <= 0.5 and iv_rem > 30):
        iv_urgency_score = 86.0
        iv_level = "HIGH"
    elif iv_rem <= 40.0:
        iv_urgency_score = 95.0
        iv_level = "HIGH"
    elif iv_rem <= 90.0 or iv_state == "NEAR_EMPTY":
        iv_urgency_score = 75.0
        iv_level = "HIGH"
    elif iv_rem <= 180.0:
        iv_urgency_score = 45.0
        iv_level = "WATCH"
    else:
        iv_urgency_score = 10.0
        iv_level = "LOW"

    # Physiological Level
    if deterioration_score >= 65.0:
        phys_level = "HIGH"
    elif deterioration_score >= 35.0:
        phys_level = "WATCH"
    else:
        phys_level = "LOW"

    # 8. Attention Priority P(t)
    w_det_overall = settings["weight_deterioration_overall"]
    w_iv_overall = settings["weight_iv_urgency_overall"]

    # When IV is critical, it must raise overall priority even if patient is stable
    base_priority = (deterioration_score * w_det_overall) + (iv_urgency_score * w_iv_overall)

    # Special case: Noisy sensor or motion artifact adds technical review attention
    if sig_quality in [SignalQuality.NOISY, SignalQuality.MOTION_ARTIFACT]:
        base_priority = max(base_priority, 32.0)

    attention_priority = round(min(100.0, max(0.0, base_priority)), 1)

    # 9. Trajectory Direction
    if short_term_slope > 25.0 or deterioration_score > 55.0:
        trajectory_state = TrajectoryDirection.WORSENING
    elif len(history) >= 4 and deterioration_score < 30.0 and history[-4].heart_rate > current_vitals.heart_rate + 4:
        trajectory_state = TrajectoryDirection.IMPROVING
    else:
        trajectory_state = TrajectoryDirection.STABLE

    # 10. Explainable Breakdown (+points for each factor)
    breakdown = [
        TrajectoryBreakdownItem(
            label="Trend severity",
            points=round(short_term_slope * w_trend, 1),
            description=f"Short-term velocity: {short_term_slope:.1f}/100"
        ),
        TrajectoryBreakdownItem(
            label="Rate of change",
            points=round(rate_of_change * w_roc, 1),
            description=f"Rapid dynamic shift between consecutive readings: {rate_of_change:.1f}"
        ),
        TrajectoryBreakdownItem(
            label="Persistence",
            points=round(persistence_score * w_pers, 1),
            description=f"Sustained abnormal deviation over {persistence_ticks} check ticks"
        ),
        TrajectoryBreakdownItem(
            label="Multi-vital agreement",
            points=round(multi_vital_score * w_mv, 1),
            description=f"{worsening_count} vitals concurrent direction" if multi_vital_agreement else "Isolated single-vital variance"
        ),
        TrajectoryBreakdownItem(
            label="Baseline deviation",
            points=round(raw_deviation_score * w_dev, 1),
            description=f"HR diff {dev_hr:.0f}, SpO₂ drop {dev_spo2:.1f}%, Temp diff {dev_temp:.1f}°C"
        ),
        TrajectoryBreakdownItem(
            label="Signal confidence",
            points=round(confidence_factor * 10.0, 1),
            description=f"Sensor signal condition: {sig_quality.value} ({confidence_level})"
        ),
    ]

    return TrajectoryAnalysis(
        attention_priority=attention_priority,
        deterioration_score=deterioration_score,
        iv_urgency_score=iv_urgency_score,
        trajectory_state=trajectory_state,
        confidence_level=confidence_level,
        physiological_level=phys_level,
        iv_level=iv_level,
        reasons_breakdown=breakdown,
        multi_vital_agreement=multi_vital_agreement,
        persistence_ticks=persistence_ticks,
        short_term_slope=round(short_term_slope, 2),
        long_term_slope=round(long_term_slope, 2),
        baseline_deviation_hr=round(dev_hr, 1),
        baseline_deviation_spo2=round(dev_spo2, 1),
        baseline_deviation_temp=round(dev_temp, 2),
    )
