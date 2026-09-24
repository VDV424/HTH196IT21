import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Pill, 
  FlaskConical, 
  Calendar, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import { Patient, ClinicalMessage, Prescription, LabOrder, Appointment } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface PatientCarePortalProps {
  patient: Patient;
}

export const PatientCarePortal: React.FC<PatientCarePortalProps> = ({ patient }) => {
  const [activeTab, setActiveTab] = useState<'messaging' | 'medications' | 'labs' | 'appointments'>('messaging');

  // 1. Messaging State
  const [messages, setMessages] = useState<ClinicalMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [msgSuccess, setMsgSuccess] = useState<string | null>(null);

  // 2. Medications State
  const [meds, setMeds] = useState<Prescription[]>([]);
  const [loadingMeds, setLoadingMeds] = useState<boolean>(false);

  // 3. Labs State
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [loadingLabs, setLoadingLabs] = useState<boolean>(false);

  // 4. Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState<boolean>(false);

  const fetchPatientData = async () => {
    try {
      const [msgsData, medsData, labsData, aptsData] = await Promise.all([
        api.getClinicalMessages(patient.patient_id),
        api.getPrescriptions(patient.patient_id),
        api.getLabOrders(patient.patient_id),
        api.getAppointments(patient.patient_id)
      ]);
      setMessages(msgsData);
      setMeds(medsData);
      setLabs(labsData);
      setAppointments(aptsData);
    } catch (err) {
      console.error('Failed to fetch patient care portal data', err);
    }
  };

  useEffect(() => {
    fetchPatientData();
    const interval = setInterval(fetchPatientData, 4000);
    return () => clearInterval(interval);
  }, [patient.patient_id]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || newMessage).trim();
    if (!content) return;
    setSendingMsg(true);
    try {
      await api.sendClinicalMessage({
        patient_id: patient.patient_id,
        sender_role: 'PATIENT',
        sender_name: patient.name,
        message: content
      });
      sounds.playSuccessChime();
      setNewMessage('');
      setMsgSuccess('Message delivered to your assigned care team');
      setTimeout(() => setMsgSuccess(null), 3000);
      const updatedMsgs = await api.getClinicalMessages(patient.patient_id);
      setMessages(updatedMsgs);
    } catch (err) {
      console.error('Failed to send clinical message', err);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-5">
      {/* Header and Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700">
            <MessageSquare className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Bedside Care Team Communication & EMR Summary</h3>
            <p className="text-xs text-slate-500">
              Direct two-way messaging with Nurse {patient.assigned_nurse_name || 'Staff'} and live review of your orders.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-50 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('messaging')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === 'messaging'
                ? 'bg-white text-teal-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({messages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('medications')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === 'medications'
                ? 'bg-white text-teal-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>My Meds ({meds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('labs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === 'labs'
                ? 'bg-white text-teal-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Lab Results ({labs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === 'appointments'
                ? 'bg-white text-teal-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Consults ({appointments.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Care Team Messaging */}
      {/* ========================================================================= */}
      {activeTab === 'messaging' && (
        <div className="space-y-4">
          {/* Quick Prompts */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Quick Messages:</span>
            {[
              'Can I have a cup of warm water?',
              'Mild surgical incision pain (3/10)',
              'What time will the doctor visit today?',
              'Need assistance getting out of bed'
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={sendingMsg}
                className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700 hover:text-teal-900 text-[11px] font-medium transition-all disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {msgSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{msgSuccess}</span>
            </div>
          )}

          {/* Messages Thread Container */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-3">
            {messages.map((m) => {
              const isPatient = m.sender_role === 'PATIENT';
              return (
                <div
                  key={m.message_id}
                  className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs shadow-xs ${
                      isPatient
                        ? 'bg-teal-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] mb-1 opacity-80">
                      <span className="font-bold">{m.sender_name} ({m.sender_role})</span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No messages yet. Send a message to your assigned nurse or doctor below.
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message to the nursing station..."
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />
            <button
              type="submit"
              disabled={sendingMsg || !newMessage.trim()}
              className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Active Medications */}
      {/* ========================================================================= */}
      {activeTab === 'medications' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Active Prescriptions (OpenEMR / Danphe)
            </h4>
            <span className="text-[11px] text-slate-500">Administered by your assigned nurse</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {meds.map((rx) => (
              <div
                key={rx.prescription_id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
                      <Pill className="w-4 h-4" />
                    </span>
                    <strong className="text-xs text-slate-900">{rx.medication_name}</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {rx.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <div>Dosage: <strong className="text-slate-800">{rx.dosage}</strong> ({rx.route})</div>
                  <div>Frequency: <span className="text-slate-800">{rx.frequency}</span></div>
                  <div>Prescribed by: <span className="text-slate-800">{rx.prescribed_by}</span></div>
                </div>
              </div>
            ))}
            {meds.length === 0 && (
              <div className="col-span-2 py-8 text-center text-slate-400 text-xs italic">
                No active medications prescribed for your current admission.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Diagnostic Lab Results */}
      {/* ========================================================================= */}
      {activeTab === 'labs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Diagnostic & Pathology Tests (Danphe EMR)
            </h4>
            <span className="text-[11px] text-slate-500">Live laboratory updates</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
            {labs.map((lab) => (
              <div key={lab.order_id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-violet-50 text-violet-700">
                    <FlaskConical className="w-4 h-4" />
                  </span>
                  <div>
                    <strong className="text-xs text-slate-900 block">{lab.test_name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Category: {lab.category} • Ordered: {new Date(lab.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {lab.result_value ? (
                    <div>
                      <span className="text-xs font-bold font-mono text-slate-900">{lab.result_value}</span>
                      <span className={`block text-[10px] font-bold ${
                        lab.flag === 'NORMAL' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {lab.flag}
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                      Processing in Lab
                    </span>
                  )}
                </div>
              </div>
            ))}
            {labs.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No diagnostic labs ordered for this visit.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Consultation Appointments */}
      {/* ========================================================================= */}
      {activeTab === 'appointments' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Scheduled Physician Consultations (MERN HMS)
            </h4>
            <span className="text-[11px] text-slate-500">Rounds & Specialist Visits</span>
          </div>

          <div className="space-y-2.5">
            {appointments.map((apt) => (
              <div
                key={apt.appointment_id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <strong className="text-xs text-slate-900 block">{apt.doctor_name}</strong>
                    <span className="text-[11px] text-slate-600">{apt.department} • {apt.reason}</span>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Schedule: {apt.scheduled_date} at {apt.scheduled_time}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                  {apt.status}
                </span>
              </div>
            ))}
            {appointments.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No pending specialist consultations scheduled for today.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
