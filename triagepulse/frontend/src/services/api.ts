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
  login: async (role: string, username: string, password?: string, isDemo: boolean = false) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username, password, is_demo: isDemo })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
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

  // Management Overview
  getManagementOverview: async (): Promise<import('../types').ManagementOverview> => {
    const res = await fetch(`${API_BASE}/management/overview`);
    return res.json();
  },
};
