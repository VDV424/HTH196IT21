import { Patient, Nurse, Alert, KPIs, AllocationExplanation, DoctorEscalationRecord, HandoverRecord } from '../types';

const API_BASE = '/api';

export const api = {
  // Auth
  signup: async (role: string, username: string, password?: string) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Signup failed');
    }
    return res.json();
  },
  login: async (
    usernameOrRole: string,
    passwordOrUser?: string,
    isDemoOrPass?: string | boolean,
    isDemo: boolean = false,
    isMobile: boolean = false
  ) => {
    let username = usernameOrRole;
    let password = typeof passwordOrUser === 'string' ? passwordOrUser : undefined;
    let demo = isDemo;
    let mobile = isMobile;
    let role: string | undefined = undefined;

    if (typeof isDemoOrPass === 'string') {
      // Legacy: role, username, password, isDemo, isMobile
      role = usernameOrRole;
      username = passwordOrUser || '';
      password = isDemoOrPass;
    } else if (typeof isDemoOrPass === 'boolean') {
      demo = isDemoOrPass;
    }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, is_demo: demo, is_mobile: mobile, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  sendHardwareTelemetry: async (patientId: string, data: any) => {
    const res = await fetch(`${API_BASE}/hardware/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, ...data })
    });
    if (!res.ok) throw new Error('Failed to send hardware telemetry');
    return res.json();
  },

  // Admin User Approvals & Management
  getAdminUsers: async () => {
    const res = await fetch(`${API_BASE}/admin/users`);
    if (!res.ok) throw new Error('Failed to fetch user accounts');
    return res.json();
  },
  approveUser: async (username: string) => {
    const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(username)}/approve`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to approve user');
    return res.json();
  },
  rejectUser: async (username: string) => {
    const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(username)}/reject`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reject user');
    return res.json();
  },
  deleteUser: async (username: string) => {
    const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete user');
    return res.json();
  },

  // Patients
  getPatients: async (): Promise<Patient[]> => {
    const res = await fetch(`${API_BASE}/patients`);
    return res.json();
  },
  getPatient: async (id: string): Promise<Patient> => {
    const res = await fetch(`${API_BASE}/patients/${id}`);
    return res.json();
  },
  addPatient: async () => {
    const res = await fetch(`${API_BASE}/patients/add`, { method: 'POST' });
    return res.json();
  },
  deletePatient: async (id: string) => {
    const res = await fetch(`${API_BASE}/patients/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Nurses & Allocations
  getNurses: async (): Promise<Nurse[]> => {
    const res = await fetch(`${API_BASE}/nurses`);
    return res.json();
  },
  getAllocations: async (): Promise<{ nurses: Nurse[]; explanations: AllocationExplanation[] }> => {
    const res = await fetch(`${API_BASE}/allocations`);
    return res.json();
  },

  // Alerts
  getAlerts: async (activeOnly: boolean = false): Promise<Alert[]> => {
    const res = await fetch(`${API_BASE}/alerts?active_only=${activeOnly}`);
    return res.json();
  },
  acknowledgeAlert: async (id: string, nurseName?: string) => {
    const url = nurseName ? `${API_BASE}/alerts/${id}/acknowledge?nurse_name=${encodeURIComponent(nurseName)}` : `${API_BASE}/alerts/${id}/acknowledge`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },
  reviewAlert: async (id: string, nurseName?: string) => {
    const url = nurseName ? `${API_BASE}/alerts/${id}/review?nurse_name=${encodeURIComponent(nurseName)}` : `${API_BASE}/alerts/${id}/review`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },
  escalateAlert: async (id: string, nurseName?: string) => {
    const url = nurseName ? `${API_BASE}/alerts/${id}/escalate?nurse_name=${encodeURIComponent(nurseName)}` : `${API_BASE}/alerts/${id}/escalate`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },
  resolveAlert: async (id: string) => {
    const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, { method: 'POST' });
    return res.json();
  },

  // Doctor Escalation
  escalateToDoctor: async (patientId: string, nurseId: string, reason: string, notes?: string) => {
    const res = await fetch(`${API_BASE}/doctor-escalation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, nurse_id: nurseId, reason, notes })
    });
    return res.json();
  },
  getDoctorEscalations: async (): Promise<DoctorEscalationRecord[]> => {
    const res = await fetch(`${API_BASE}/doctor-escalations`);
    return res.json();
  },
  respondDoctorEscalation: async (escalationId: string, doctorName: string, doctorNotes: string, action: string) => {
    const res = await fetch(`${API_BASE}/doctor-escalations/${escalationId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_name: doctorName, doctor_notes: doctorNotes, protocol_action: action, status: 'Orders Placed' })
    });
    return res.json();
  },

  // Handover
  generateHandover: async (patientId: string, nurseId: string = 'N01') => {
    const res = await fetch(`${API_BASE}/handover/generate?patient_id=${patientId}&nurse_id=${nurseId}`, { method: 'POST' });
    return res.json();
  },
  getHandover: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/handover/${patientId}`);
    return res.json();
  },
  markHandoverReady: async (patientId: string, ready: boolean) => {
    const res = await fetch(`${API_BASE}/handover/ready?patient_id=${patientId}&ready=${ready}`, { method: 'POST' });
    return res.json();
  },

  // Analytics
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },

  // Demo Controls
  startDemo: async () => {
    const res = await fetch(`${API_BASE}/demo/start`, { method: 'POST' });
    return res.json();
  },
  pauseDemo: async () => {
    const res = await fetch(`${API_BASE}/demo/pause`, { method: 'POST' });
    return res.json();
  },
  resetDemo: async () => {
    const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
    return res.json();
  },
  injectScenario: async (scenarioName: string) => {
    const res = await fetch(`${API_BASE}/demo/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_name: scenarioName })
    });
    return res.json();
  },
  setSpeed: async (speed: number) => {
    const res = await fetch(`${API_BASE}/demo/speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed })
    });
    return res.json();
  },

  // Settings & System
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  updateSettings: async (settings: any) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },
  getSystemStatus: async () => {
    const res = await fetch(`${API_BASE}/system/status`);
    return res.json();
  },

  // SOS & Request Bedside Buttons
  triggerSOS: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/sos`, { method: 'POST' });
    return res.json();
  },
  clearSOS: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/sos/clear`, { method: 'POST' });
    return res.json();
  },
  triggerRequest: async (patientId: string, requestType: string = 'General') => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/request?request_type=${encodeURIComponent(requestType)}`, { method: 'POST' });
    return res.json();
  },
  clearRequest: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/request/clear`, { method: 'POST' });
    return res.json();
  },

  // IV Management
  refillIV: async (patientId: string, volumeMl: number = 500) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/iv-refill?volume_ml=${volumeMl}`, { method: 'POST' });
    return res.json();
  },

  // Code Blue Emergency & Hospital Management (ADT / eMAR)
  triggerCodeBlue: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/code-blue`, { method: 'POST' });
    return res.json();
  },
  clearCodeBlue: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/code-blue/clear`, { method: 'POST' });
    return res.json();
  },
  updateBedStatus: async (patientId: string, bedStatus: string, isolation: string) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/bed-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bed_status: bedStatus, isolation }),
    });
    return res.json();
  },
  setInfusionOrder: async (patientId: string, fluidName: string, flowRate: number) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/emar/infusion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fluid_name: fluidName, flow_rate: flowRate }),
    });
    return res.json();
  },

  // Management Overview
  getManagementOverview: async (): Promise<import('../types').ManagementOverview> => {
    const res = await fetch(`${API_BASE}/management/overview`);
    return res.json();
  },

  // =========================================================================
  // HOSPITAL MANAGEMENT SYSTEM (HMS) & EMR CLIENT METHODS
  // =========================================================================

  // 1. Clinical Encounters (OpenEMR SOAP Notes)
  getEncounters: async (patientId?: string): Promise<import('../types').ClinicalEncounter[]> => {
    const url = patientId ? `${API_BASE}/emr/encounters?patient_id=${patientId}` : `${API_BASE}/emr/encounters`;
    const res = await fetch(url);
    return res.json();
  },
  createEncounter: async (data: Partial<import('../types').ClinicalEncounter>): Promise<import('../types').ClinicalEncounter> => {
    const res = await fetch(`${API_BASE}/emr/encounters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 2. Prescriptions & eMAR (OpenEMR / Danphe)
  getPrescriptions: async (patientId?: string): Promise<import('../types').Prescription[]> => {
    const url = patientId ? `${API_BASE}/emr/prescriptions?patient_id=${patientId}` : `${API_BASE}/emr/prescriptions`;
    const res = await fetch(url);
    return res.json();
  },
  createPrescription: async (data: Partial<import('../types').Prescription>): Promise<import('../types').Prescription> => {
    const res = await fetch(`${API_BASE}/emr/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  administerMedication: async (rxId: string) => {
    const res = await fetch(`${API_BASE}/emr/prescriptions/${rxId}/administer`, { method: 'POST' });
    return res.json();
  },
  discontinueMedication: async (rxId: string) => {
    const res = await fetch(`${API_BASE}/emr/prescriptions/${rxId}/discontinue`, { method: 'POST' });
    return res.json();
  },

  // 3. Laboratory Orders & Results (Danphe EMR)
  getLabOrders: async (patientId?: string): Promise<import('../types').LabOrder[]> => {
    const url = patientId ? `${API_BASE}/emr/labs?patient_id=${patientId}` : `${API_BASE}/emr/labs`;
    const res = await fetch(url);
    return res.json();
  },
  createLabOrder: async (data: Partial<import('../types').LabOrder>): Promise<import('../types').LabOrder> => {
    const res = await fetch(`${API_BASE}/emr/labs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  enterLabResult: async (orderId: string, resultValue: string, flag: string = 'NORMAL') => {
    const res = await fetch(`${API_BASE}/emr/labs/${orderId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_value: resultValue, flag }),
    });
    return res.json();
  },

  // 4. Ward Bed Management & ADT (Frappe Health)
  getWardBeds: async (): Promise<import('../types').WardBed[]> => {
    const res = await fetch(`${API_BASE}/hospital/beds`);
    return res.json();
  },
  updateWardBedStatus: async (bedId: string, status: string, isolation: string = 'Standard') => {
    const res = await fetch(`${API_BASE}/hospital/beds/${bedId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, isolation }),
    });
    return res.json();
  },
  transferPatientBed: async (patientId: string, fromBedId: string, toBedId: string, reason: string) => {
    const res = await fetch(`${API_BASE}/hospital/beds/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, from_bed_id: fromBedId, to_bed_id: toBedId, reason }),
    });
    return res.json();
  },

  // 5. Pharmacy & Consumables Inventory (Frappe Health)
  getPharmacyInventory: async (): Promise<import('../types').PharmacyItem[]> => {
    const res = await fetch(`${API_BASE}/hospital/inventory`);
    return res.json();
  },
  restockInventory: async (itemId: string, quantity: number = 10) => {
    const res = await fetch(`${API_BASE}/hospital/inventory/${itemId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    return res.json();
  },
  deductInventory: async (itemId: string, quantity: number = 1) => {
    const res = await fetch(`${API_BASE}/hospital/inventory/${itemId}/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    return res.json();
  },

  // 6. Fluid Intake & Output (I/O) Balance (Danphe EMR)
  getFluidBalance: async (patientId: string): Promise<import('../types').FluidBalance[]> => {
    const res = await fetch(`${API_BASE}/nursing/fluid-balance/${patientId}`);
    return res.json();
  },
  recordFluidBalance: async (data: Partial<import('../types').FluidBalance>): Promise<import('../types').FluidBalance> => {
    const res = await fetch(`${API_BASE}/nursing/fluid-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 7. Nursing Care Tasks (Danphe EMR)
  getNursingTasks: async (patientId?: string): Promise<import('../types').NursingCareTask[]> => {
    const url = patientId ? `${API_BASE}/nursing/tasks?patient_id=${patientId}` : `${API_BASE}/nursing/tasks`;
    const res = await fetch(url);
    return res.json();
  },
  createNursingTask: async (data: Partial<import('../types').NursingCareTask>): Promise<import('../types').NursingCareTask> => {
    const res = await fetch(`${API_BASE}/nursing/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  toggleNursingTask: async (taskId: string) => {
    const res = await fetch(`${API_BASE}/nursing/tasks/${taskId}/toggle`, { method: 'POST' });
    return res.json();
  },

  // 8. Consultation Appointments (MERN HMS)
  getAppointments: async (patientId?: string): Promise<import('../types').Appointment[]> => {
    const url = patientId ? `${API_BASE}/appointments?patient_id=${patientId}` : `${API_BASE}/appointments`;
    const res = await fetch(url);
    return res.json();
  },
  bookAppointment: async (data: Partial<import('../types').Appointment>): Promise<import('../types').Appointment> => {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateAppointmentStatus: async (aptId: string, status: string) => {
    const res = await fetch(`${API_BASE}/appointments/${aptId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // 9. Bedside Care Team Messages (MERN HMS)
  getClinicalMessages: async (patientId: string): Promise<import('../types').ClinicalMessage[]> => {
    const res = await fetch(`${API_BASE}/clinical-messages/${patientId}`);
    return res.json();
  },
  sendClinicalMessage: async (data: Partial<import('../types').ClinicalMessage>): Promise<import('../types').ClinicalMessage> => {
    const res = await fetch(`${API_BASE}/clinical-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  markMessageRead: async (msgId: string) => {
    const res = await fetch(`${API_BASE}/clinical-messages/${msgId}/read`, { method: 'POST' });
    return res.json();
  },
};

