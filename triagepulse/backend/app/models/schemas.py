from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class SignalQuality(str, Enum):
    GOOD = "GOOD"
    NOISY = "NOISY"
    MISSING = "MISSING"
    STALE = "STALE"
    MOTION_ARTIFACT = "MOTION_ARTIFACT"

class SeverityLevel(str, Enum):
    STABLE = "STABLE"
    WATCH = "WATCH"
    REVIEW = "REVIEW"
    HIGH_ATTENTION = "HIGH_ATTENTION"
    IMMEDIATE_REVIEW = "IMMEDIATE_REVIEW"

class AlertStatus(str, Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"

class TrajectoryDirection(str, Enum):
    STABLE = "STABLE"
    WORSENING = "WORSENING"
    IMPROVING = "IMPROVING"

class DataSource(str, Enum):
    SIMULATION = "SIMULATION"
    PHYSICAL_DEVICE = "PHYSICAL_DEVICE"

class VitalsData(BaseModel):
    heart_rate: float
    spo2: float
    temperature: float
    motion: float = 0.1
    signal_quality: SignalQuality = SignalQuality.GOOD
    timestamp: str

class IVData(BaseModel):
    iv_weight: float = 500.0  # in grams
    iv_flow: float = 20.0     # in mL/h
    iv_remaining_ml: float = 500.0
    iv_state: str = "NORMAL"  # "NORMAL", "NEAR_EMPTY", "NO_FLOW", "OCCLUDED", "STOPPED"
    estimated_time_to_empty_min: Optional[float] = 150.0

class TrajectoryBreakdownItem(BaseModel):
    label: str
    points: float
    description: str

class TrajectoryAnalysis(BaseModel):
    attention_priority: float = 0.0  # 0 to 100
    deterioration_score: float = 0.0 # 0 to 100
    iv_urgency_score: float = 0.0    # 0 to 100
    trajectory_state: TrajectoryDirection = TrajectoryDirection.STABLE
    confidence_level: str = "HIGH"   # "HIGH", "MODERATE", "LOW", "INSUFFICIENT"
    physiological_level: str = "LOW" # "LOW", "WATCH", "HIGH"
    iv_level: str = "LOW"            # "LOW", "WATCH", "HIGH"
    reasons_breakdown: List[TrajectoryBreakdownItem] = []
    multi_vital_agreement: bool = False
    persistence_ticks: int = 0
    short_term_slope: float = 0.0
    long_term_slope: float = 0.0
    baseline_deviation_hr: float = 0.0
    baseline_deviation_spo2: float = 0.0
    baseline_deviation_temp: float = 0.0

class PatientSummary(BaseModel):
    patient_id: str
    name: str
    room: str
    scenario: str
    data_source: DataSource = DataSource.SIMULATION
    device_id: Optional[str] = None
    baseline_hr: float = 75.0
    baseline_spo2: float = 98.0
    baseline_temp: float = 36.8
    current_vitals: VitalsData
    current_iv: IVData
    trajectory: TrajectoryAnalysis
    assigned_nurse_id: Optional[str] = None
    assigned_nurse_name: Optional[str] = None
    active_alerts_count: int = 0
    last_update: str
    # Patient bedside buttons
    sos_active: bool = False          # Emergency SOS panic button pressed
    sos_triggered_at: Optional[str] = None
    request_active: bool = False      # Non-emergency nurse request button
    request_type: Optional[str] = None  # "Water", "Pain", "Bathroom", "General"
    request_triggered_at: Optional[str] = None

class NurseSummary(BaseModel):
    nurse_id: str
    name: str
    role: str
    ward: str
    max_capacity: int = 5
    assigned_count: int = 0
    available_capacity: int = 5
    status: str = "Available"
    assigned_patients: List[str] = []
    high_priority_count: int = 0
    capabilities: List[str] = []
    workload_percent: float = 0.0

class AlertModel(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    room: str
    alert_type: str
    severity: str
    title: str
    reason: str
    assigned_nurse: Optional[str] = None
    status: AlertStatus = AlertStatus.OPEN
    raw_observations_count: int = 1
    created_at: str
    acknowledged_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    escalated_at: Optional[str] = None
    resolved_at: Optional[str] = None
    acknowledgement_latency_sec: Optional[float] = None
    review_latency_sec: Optional[float] = None
    resolution_time_sec: Optional[float] = None

class DoctorEscalationRequest(BaseModel):
    patient_id: str
    nurse_id: str
    reason: str
    notes: Optional[str] = None

class DoctorEscalationRecord(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    room: str
    nurse_id: str
    nurse_name: str
    reason: str
    priority: str
    status: str = "Pending Review"
    created_at: str
    resolved_at: Optional[str] = None
    doctor_notes: Optional[str] = None
    doctor_name: Optional[str] = None
    protocol_action: Optional[str] = None

class HandoverRecord(BaseModel):
    id: str
    patient_id: str
    nurse_id: str
    summary_text: str
    trajectory_snapshot: Dict[str, Any]
    is_ready: bool = False
    created_at: str
    recommended_next_review_min: int = 15

class SettingsPayload(BaseModel):
    max_nurse_capacity: int = 5
    simulation_speed: int = 1
    alert_persistence_ticks: int = 3
    weight_trend_severity: float = 0.30
    weight_rate_of_change: float = 0.20
    weight_persistence: float = 0.15
    weight_multi_vital: float = 0.15
    weight_baseline_deviation: float = 0.10
    weight_signal_confidence: float = 0.10
    weight_deterioration_overall: float = 0.65
    weight_iv_urgency_overall: float = 0.35

class SystemKPIs(BaseModel):
    total_patients: int = 0
    high_priority_count: int = 0
    active_alerts_count: int = 0
    nurses_online: str = "3/3"
    available_capacity_slots: int = 0
    iv_tasks_count: int = 0
    total_raw_observations: int = 0
    total_alert_episodes: int = 0
    alert_compression_ratio: float = 0.0
    avg_acknowledgement_latency_sec: float = 0.0
    avg_resolution_time_sec: float = 0.0
    sensor_fault_handling_count: int = 0
    sos_active_count: int = 0        # Patients with active SOS
    request_active_count: int = 0    # Patients with active nurse request

class PatientButtonEvent(BaseModel):
    patient_id: str
    button_type: str = "SOS"  # "SOS" or "REQUEST"
    request_category: Optional[str] = None  # For REQUEST: "Water", "Pain", "Bathroom", "General"

class AllocationExplanation(BaseModel):
    patient_id: str
    nurse_id: str
    nurse_name: str
    priority_level: str
    required_capability: str
    current_workload: str
    location: str
    reason: str
