export type SignalQuality = "GOOD" | "NOISY" | "MISSING" | "STALE" | "MOTION_ARTIFACT";
export type SeverityLevel = "STABLE" | "WATCH" | "REVIEW" | "HIGH_ATTENTION" | "IMMEDIATE_REVIEW";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "UNDER_REVIEW" | "ESCALATED" | "RESOLVED";
export type TrajectoryDirection = "STABLE" | "WORSENING" | "IMPROVING";
export type DataSource = "SIMULATION" | "PHYSICAL_DEVICE";

export interface VitalsData {
  heart_rate: number;
  spo2: number;
  temperature: number;
  motion: number;
  signal_quality: SignalQuality;
  timestamp: string;
}

export interface IVData {
  iv_weight: number;
  iv_flow: number;
  iv_remaining_ml: number;
  iv_state: string;
  estimated_time_to_empty_min: number | null;
}

export interface TrajectoryBreakdownItem {
  label: string;
  points: number;
  description: string;
}

export interface TrajectoryAnalysis {
  attention_priority: number;
  deterioration_score: number;
  iv_urgency_score: number;
  trajectory_state: TrajectoryDirection;
  confidence_level: "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";
  physiological_level: "LOW" | "WATCH" | "HIGH";
  iv_level: "LOW" | "WATCH" | "HIGH";
  reasons_breakdown: TrajectoryBreakdownItem[];
  multi_vital_agreement: boolean;
  persistence_ticks: number;
  short_term_slope: number;
  long_term_slope: number;
  baseline_deviation_hr: number;
  baseline_deviation_spo2: number;
  baseline_deviation_temp: number;
}

export interface Patient {
  patient_id: string;
  name: string;
  room: string;
  scenario: string;
  data_source: DataSource;
  device_id: string | null;
  baseline_hr: number;
  baseline_spo2: number;
  baseline_temp: number;
  current_vitals: VitalsData;
  current_iv: IVData;
  trajectory: TrajectoryAnalysis;
  assigned_nurse_id: string | null;
  assigned_nurse_name: string | null;
  active_alerts_count: number;
  last_update: string;
  // Bedside buttons
  sos_active: boolean;
  sos_triggered_at: string | null;
  request_active: boolean;
  request_type: string | null;
  request_triggered_at: string | null;
}

export interface Nurse {
  nurse_id: string;
  name: string;
  role: string;
  ward: string;
  max_capacity: number;
  assigned_count: number;
  available_capacity: number;
  status: string;
  assigned_patients: string[];
  high_priority_count: number;
  capabilities: string[];
  workload_percent: number;
  is_committed_to_serious?: boolean;
  current_distance_m?: number;
}

export interface Alert {
  id: string;
  patient_id: string;
  patient_name: string;
  room: string;
  alert_type: string;
  severity: SeverityLevel;
  title: string;
  reason: string;
  assigned_nurse: string | null;
  status: AlertStatus;
  raw_observations_count: number;
  created_at: string;
  acknowledged_at: string | null;
  reviewed_at: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  acknowledgement_latency_sec: number | null;
  review_latency_sec: number | null;
  resolution_time_sec: number | null;
}

export interface KPIs {
  total_patients: number;
  high_priority_count: number;
  active_alerts_count: number;
  nurses_online: string;
  available_capacity_slots: number;
  iv_tasks_count: number;
  total_raw_observations: number;
  total_alert_episodes: number;
  alert_compression_ratio: number;
  avg_acknowledgement_latency_sec: number;
  avg_resolution_time_sec: number;
  sensor_fault_handling_count: number;
  sos_active_count: number;
  request_active_count: number;
}

export interface AllocationExplanation {
  patient_id: string;
  nurse_id: string;
  nurse_name: string;
  priority_level: string;
  required_capability: string;
  current_workload: string;
  location: string;
  reason: string;
  distance_m?: number;
  routing_strategy?: string;
}

export interface DoctorEscalationRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  room: string;
  nurse_id: string;
  nurse_name: string;
  reason: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  doctor_notes: string | null;
  doctor_name?: string | null;
  protocol_action?: string | null;
}

export interface IVDepletionItem {
  patient_id: string;
  name: string;
  room: string;
  remaining_ml: number;
  flow_ml_hr: number;
  eta_minutes: number;
  urgency: 'URGENT' | 'SOON' | 'MONITOR';
}

export interface ManagementOverview {
  bed_occupancy: {
    total_beds: number;
    occupied: number;
    available: number;
    occupancy_rate_pct: number;
    critical_beds: number;
    stepdown_ready: number;
  };
  iv_depletion_forecast: IVDepletionItem[];
  burnout_metrics: {
    risk_level: 'LOW' | 'MODERATE' | 'HIGH';
    workload_variance: number;
    nurses_near_capacity: number;
    total_active_nurses: number;
  };
  alarm_fatigue_audit: {
    raw_ticks_processed: number;
    clinical_episodes_generated: number;
    noise_suppression_pct: number;
    compression_ratio: number;
  };
  sla_compliance: {
    sos_response_sla_met_pct: number;
    tier1_deterioration_ack_pct: number;
    iv_replacement_sla_pct: number;
  };
}

export interface HandoverRecord {
  id: string;
  patient_id: string;
  nurse_id: string;
  summary_text: string;
  trajectory_snapshot: Record<string, any>;
  is_ready: boolean;
  created_at: string;
  recommended_next_review_min: number;
}
