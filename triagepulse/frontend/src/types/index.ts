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
  // Clinical Scoring & Sepsis
  news2_score?: number;
  news2_risk?: "LOW" | "MEDIUM" | "HIGH";
  news2_recommendation?: string;
  predicted_deterioration_risk_60m?: number;
  early_sepsis_index?: number;
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
  // Hospital Management & Bed Board
  bed_status?: "OCCUPIED" | "AVAILABLE" | "SANITIZING" | "ISOLATION";
  isolation_precautions?: string;
  length_of_stay_hrs?: number;
  // Medication Administration & Smart Infusion Guardrails
  iv_fluid_name?: string;
  iv_occlusion?: boolean;
  iv_free_flow?: boolean;
  // Code Blue / Rapid Response
  code_blue_active?: boolean;
  code_blue_triggered_at?: string | null;
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

// =========================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS) & EMR EXTENSIONS
// =========================================================================

export interface ClinicalEncounter {
  id: string;
  encounter_id?: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  encounter_type: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10_code: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  prescription_id?: string;
  patient_id: string;
  patient_name?: string;
  room?: string;
  doctor_id: string;
  doctor_name: string;
  prescribed_by?: string;
  medication: string;
  medication_name?: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  status: 'Active' | 'Administered' | 'Discontinued' | string;
  prescribed_at?: string;
  administered_at?: string | null;
  last_administered?: string | null;
}

export interface LabOrder {
  id: string;
  order_id?: string;
  patient_id: string;
  doctor_name: string;
  test_name: string;
  category: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT' | string;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'RESULT_AVAILABLE' | string;
  ordered_at?: string;
  created_at?: string;
  result_value?: string | null;
  reference_range?: string | null;
  flag?: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | null;
  completed_at?: string | null;
}

export interface WardBed {
  bed_id: string;
  room: string;
  ward: string;
  bed_type: string;
  status: 'OCCUPIED' | 'AVAILABLE' | 'CLEANING' | 'ISOLATION' | 'MAINTENANCE' | string;
  patient_id?: string | null;
  patient_name?: string | null;
  isolation: string;
  isolation_type?: string;
  los_hours?: number;
  acuity_level?: string;
  updated_at: string;
}

export interface PharmacyItem {
  item_id: string;
  item_name: string;
  category: string;
  stock_quantity: number;
  current_stock?: number;
  unit: string;
  reorder_level: number;
  min_reorder_level?: number;
  status: 'NORMAL' | 'LOW_STOCK' | 'CRITICAL' | string;
  location?: string;
  unit_price?: number;
  batch_number?: string;
  expiry_date?: string;
  updated_at: string;
}

export interface FluidBalance {
  id: string;
  record_id?: string;
  patient_id: string;
  timestamp: string;
  intake_iv_ml: number;
  intake_oral_ml: number;
  intake_ml?: number;
  intake_type?: string;
  output_urine_ml: number;
  output_drain_ml: number;
  output_ml?: number;
  output_type?: string;
  net_balance_ml: number;
  balance_ml?: number;
  recorded_by: string;
  notes?: string;
}

export interface NursingCareTask {
  id: string;
  task_id?: string;
  patient_id: string;
  patient_name?: string;
  room?: string;
  nurse_id: string;
  assigned_nurse?: string;
  task_description: string;
  task_title?: string;
  category: string;
  priority?: 'ROUTINE' | 'URGENT' | 'STAT' | string;
  due_time: string;
  is_completed: boolean;
  status?: string;
  completed_at?: string | null;
  notes?: string | null;
}

export interface Appointment {
  id: string;
  appointment_id?: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  department: string;
  appointment_date?: string;
  appointment_time?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  reason: string;
  created_at: string;
}

export interface ClinicalMessage {
  id: string;
  message_id?: string;
  patient_id: string;
  sender_role: 'patient' | 'nurse' | 'doctor' | 'PATIENT' | 'NURSE' | 'DOCTOR' | string;
  sender_name: string;
  recipient_role?: string;
  message: string;
  timestamp?: string;
  created_at?: string;
  is_read: boolean;
}

