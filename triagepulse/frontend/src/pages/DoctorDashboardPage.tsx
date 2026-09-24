import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Clock, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  Droplet, 
  Heart, 
  Activity,
  UserCheck
} from 'lucide-react';
import { Patient, DoctorEscalationRecord, HandoverRecord } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface DoctorDashboardPageProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({ patients, onSelectPatient }) => {
  const [activeDoctorTab, setActiveDoctorTab] = useState<'deterioration' | 'escalations' | 'sbar' | 'iv_oversight'>('deterioration');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('Dr. Michael Vance (Attending Physician)');
  const [escalations, setEscalations] = useState<DoctorEscalationRecord[]>([]);
  const [handovers, setHandovers] = useState<Record<string, HandoverRecord>>({});
  const [selectedSbarPatientId, setSelectedSbarPatientId] = useState<string>(patients[0]?.patient_id || '');
  const [loadingEscalations, setLoadingEscalations] = useState<boolean>(false);

  // Doctor response form state for active escalation
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('Start O2 Supplementation (4L/min NC)');
  const [doctorCustomNote, setDoctorCustomNote] = useState<string>('');
  const [submittingResponse, setSubmittingResponse] = useState<boolean>(false);

  // Load escalations on mount and poll
  const loadEscalations = async () => {
    try {
      const data = await api.getDoctorEscalations();
      setEscalations(data);
    } catch (err) {
      console.error('Failed to load escalations', err);
    }
  };

  useEffect(() => {
    loadEscalations();
    const interval = setInterval(loadEscalations, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter patients by deterioration level
  const criticalPatients = patients.filter((p) => p.trajectory.physiological_level === 'HIGH' && p.trajectory.attention_priority >= 75);
  const highRiskPatients = patients.filter((p) => p.trajectory.physiological_level === 'HIGH' || p.trajectory.attention_priority >= 55);
  const pendingEscalations = escalations.filter((e) => e.status !== 'Orders Placed');

  // Handle responding to doctor escalation
  const handleDoctorSubmitOrder = async (esc: DoctorEscalationRecord) => {
    setSubmittingResponse(true);
    try {
      const note = doctorCustomNote.trim() || `Orders placed per clinical protocol: ${selectedProtocol}`;
      await api.respondDoctorEscalation(esc.id, selectedDoctor, note, selectedProtocol);
      sounds.playSuccessChime();
      setRespondingId(null);
      setDoctorCustomNote('');
      await loadEscalations();
    } catch (err) {
      console.error('Failed to respond to escalation', err);
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Generate or load SBAR
  const handleLoadSbar = async (patientId: string) => {
    setSelectedSbarPatientId(patientId);
    if (!handovers[patientId]) {
      try {
        const res = await api.generateHandover(patientId, 'N01');
        if (res.handover) {
          setHandovers((prev) => ({ ...prev, [patientId]: res.handover }));
        }
      } catch (err) {
        console.error('Failed to fetch SBAR handover', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Physician Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-violet-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-600">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Physician Clinical Portal</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-50 text-indigo-300 border border-violet-200">
                  Doctor Rounding Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Trajectory decomposition, MEWS2 trend forensics, SBAR handover review, and 1-click clinical protocol orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <UserCheck className="w-4 h-4 text-violet-600" />
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="Dr. Michael Vance (Attending Physician)" className="bg-white">Dr. Michael Vance (Attending)</option>
                <option value="Dr. Sarah Thorne (Hospitalist / On-Call)" className="bg-white">Dr. Sarah Thorne (Hospitalist)</option>
                <option value="Dr. Rajiv Patel (Intensivist Consult)" className="bg-white">Dr. Rajiv Patel (ICU Consult)</option>
              </select>
            </div>

            <button
              onClick={() => setActiveDoctorTab('escalations')}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                pendingEscalations.length > 0
                  ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{pendingEscalations.length} Escalations</span>
            </button>
          </div>
        </div>

        {/* Quick Clinical Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200/80">
          <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Critical Trajectory Patients</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-xl font-bold font-mono ${criticalPatients.length > 0 ? 'text-rose-400' : 'text-slate-700'}`}>
                {criticalPatients.length}
              </span>
              <span className="text-[10px] text-slate-500">Tier 1 Deterioration</span>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">High Risk & Watch</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400">{highRiskPatients.length}</span>
              <span className="text-[10px] text-slate-500">Early Warning Alerts</span>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Pending Physician Calls</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-xl font-bold font-mono ${pendingEscalations.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {pendingEscalations.length}
              </span>
              <span className="text-[10px] text-slate-500">Awaiting Orders</span>
            </div>
          </div>

          <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Lead Time Advantage</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-teal-600">14.8 min</span>
              <span className="text-[10px] text-slate-500">Pre-threshold warning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveDoctorTab('deterioration')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeDoctorTab === 'deterioration'
              ? 'bg-violet-600 text-slate-900 shadow-lg shadow-violet-600/30'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Deterioration Forensics ({patients.length})</span>
        </button>

        <button
          onClick={() => setActiveDoctorTab('escalations')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeDoctorTab === 'escalations'
              ? 'bg-violet-600 text-slate-900 shadow-lg shadow-violet-600/30'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Doctor Escalations Queue</span>
          {pendingEscalations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-slate-900">
              {pendingEscalations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveDoctorTab('sbar');
            if (patients.length > 0 && !selectedSbarPatientId) {
              handleLoadSbar(patients[0].patient_id);
            }
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeDoctorTab === 'sbar'
              ? 'bg-violet-600 text-slate-900 shadow-lg shadow-violet-600/30'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>SBAR Clinical Reviews</span>
        </button>

        <button
          onClick={() => setActiveDoctorTab('iv_oversight')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeDoctorTab === 'iv_oversight'
              ? 'bg-violet-600 text-slate-900 shadow-lg shadow-violet-600/30'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/60'
          }`}
        >
          <Droplet className="w-4 h-4" />
          <span>IV & Infusion Oversight</span>
        </button>
      </div>

      {/* TAB 1: Deterioration Forensics */}
      {activeDoctorTab === 'deterioration' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Multi-Vital Deterioration Ranking</h2>
              <p className="text-xs text-slate-500">
                Patients prioritized by continuous trajectory deterioration score, trend velocity, and baseline deviation.
              </p>
            </div>
            <span className="text-xs text-slate-500">Click any patient card to review live waveform & radar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => {
              const isCrit = p.trajectory.physiological_level === 'HIGH' && p.trajectory.attention_priority >= 75;
              const isHigh = p.trajectory.physiological_level === 'HIGH';
              const hrDeviation = p.current_vitals.heart_rate - p.baseline_hr;
              const spo2Deviation = p.current_vitals.spo2 - p.baseline_spo2;

              return (
                <div
                  key={p.patient_id}
                  onClick={() => onSelectPatient(p)}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer hover:scale-[1.01] hover:shadow-xl ${
                    isCrit
                      ? 'bg-rose-950/30 border-rose-700/80 shadow-rose-950/20'
                      : isHigh
                      ? 'bg-amber-950/20 border-amber-700/60'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                        <span className="text-xs text-slate-500 font-mono">({p.room})</span>
                      </div>
                      <span className="text-[10px] text-slate-500">ID: {p.patient_id} • Assigned: {p.assigned_nurse_name || 'Unassigned'}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isCrit
                          ? 'bg-rose-600 text-slate-900 animate-pulse'
                          : isHigh
                          ? 'bg-amber-600 text-slate-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.trajectory.physiological_level}
                    </span>
                  </div>

                  {/* Vitals Summary with Deltas from Baseline */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 mb-3">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Heart className="w-3 h-3 text-rose-400" />
                        <span>HR</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-bold font-mono text-slate-900">{p.current_vitals.heart_rate}</span>
                        <span className={`text-[10px] font-mono ${hrDeviation > 15 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                          {hrDeviation >= 0 ? `+${hrDeviation.toFixed(0)}` : hrDeviation.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Activity className="w-3 h-3 text-teal-600" />
                        <span>SpO₂</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-bold font-mono text-slate-900">{p.current_vitals.spo2}%</span>
                        <span className={`text-[10px] font-mono ${spo2Deviation < -4 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                          {spo2Deviation.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Droplet className="w-3 h-3 text-violet-600" />
                        <span>IV Rem.</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-bold font-mono text-slate-900">{p.current_iv.iv_remaining_ml.toFixed(0)}</span>
                        <span className="text-[10px] text-slate-500">ml</span>
                      </div>
                    </div>
                  </div>

                  {/* Trajectory Breakdown Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Attention Priority</span>
                      <span className="font-mono font-bold text-slate-900">{p.trajectory.attention_priority.toFixed(1)} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          p.trajectory.attention_priority >= 70
                            ? 'bg-rose-500'
                            : p.trajectory.attention_priority >= 45
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, p.trajectory.attention_priority)}%` }}
                      />
                    </div>
                  </div>

                  {/* Trajectory Clinical Factors */}
                  <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[190px]">
                      {p.trajectory.reasons_breakdown.slice(0, 2).map((r) => r.label).join(' • ') || 'Vitals stable'}
                    </span>
                    <span className="text-violet-600 hover:underline font-semibold">Inspect &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Doctor Escalations Queue */}
      {activeDoctorTab === 'escalations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pending Physician Escalations</h2>
              <p className="text-xs text-slate-500">
                Bedside nurse escalations triggered when patient trajectories exceed safe ward thresholds.
              </p>
            </div>
            <button
              onClick={loadEscalations}
              className="text-xs text-violet-600 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {escalations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900">No Open Doctor Escalations</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                All patient trajectories are currently within nurse ward management protocols. You will be alerted immediately if a nurse escalates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {escalations.map((esc) => {
                const isPending = esc.status !== 'Orders Placed';
                const isThisResponding = respondingId === esc.id;
                const matchedPatient = patients.find((p) => p.patient_id === esc.patient_id);

                return (
                  <div
                    key={esc.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isPending
                        ? 'bg-white/90 border-rose-700/80 shadow-lg shadow-rose-950/20'
                        : 'bg-white/50 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{esc.patient_name}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600">
                            {esc.room}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isPending ? 'bg-rose-600 text-slate-900 animate-pulse' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            {esc.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Escalated by <strong className="text-slate-700">{esc.nurse_name}</strong> • Priority: {esc.priority} • {new Date(esc.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      {matchedPatient && (
                        <button
                          onClick={() => onSelectPatient(matchedPatient)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5 self-start"
                        >
                          <Activity className="w-3.5 h-3.5 text-teal-600" />
                          <span>View Live Telemetry</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Nurse Escalation Reason:
                      </span>
                      <p className="text-slate-700 font-medium">{esc.reason}</p>
                      {esc.doctor_notes && (
                        <p className="text-indigo-300 mt-2 pt-2 border-t border-slate-200/60">
                          <strong>Note / Response:</strong> {esc.doctor_notes}
                        </p>
                      )}
                      {esc.protocol_action && (
                        <p className="text-emerald-400 mt-1">
                          <strong>Ordered Protocol:</strong> {esc.protocol_action}
                        </p>
                      )}
                    </div>

                    {/* Action Bar for Pending Escalations */}
                    {isPending && (
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        {!isThisResponding ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setRespondingId(esc.id);
                                setSelectedProtocol('Start O2 Supplementation (4L/min NC)');
                                setDoctorCustomNote('');
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-slate-900 transition-all shadow-md shadow-violet-600/20 flex items-center gap-2"
                            >
                              <Stethoscope className="w-4 h-4" />
                              <span>Prescribe Protocol & Place Clinical Orders</span>
                            </button>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-indigo-700/60 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                                <span>Physician Clinical Order Form ({selectedDoctor})</span>
                              </h4>
                              <button
                                onClick={() => setRespondingId(null)}
                                className="text-[11px] text-slate-500 hover:text-slate-900"
                              >
                                Cancel
                              </button>
                            </div>

                            {/* Preset Protocol Order Buttons */}
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-slate-500">Select Protocol Order:</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {[
                                  'Start O2 Supplementation (4L/min NC)',
                                  'Push 500ml Normal Saline IV Bolus',
                                  'Stat Arterial Blood Gas (ABG) & Chem7',
                                  'Urgent 12-Lead ECG & Troponin Panel',
                                  'Initiate Sepsis Step-1 Bundle',
                                  'Evaluate for Immediate ICU Step-Up',
                                ].map((proto) => (
                                  <button
                                    key={proto}
                                    type="button"
                                    onClick={() => setSelectedProtocol(proto)}
                                    className={`p-2 rounded-lg text-left text-xs transition-all border ${
                                      selectedProtocol === proto
                                        ? 'bg-violet-50 text-indigo-200 border-violet-500 font-semibold'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {proto}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Custom Note */}
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                                Additional Clinical Instructions & Physician Orders:
                              </label>
                              <textarea
                                value={doctorCustomNote}
                                onChange={(e) => setDoctorCustomNote(e.target.value)}
                                placeholder="e.g., Re-check vitals in 15 minutes. Notify if SpO2 remains <92%."
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                                rows={2}
                              />
                            </div>

                            <button
                              onClick={() => handleDoctorSubmitOrder(esc)}
                              disabled={submittingResponse}
                              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-900 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{submittingResponse ? 'Submitting Orders...' : 'Authorize Orders & Resolve Escalation'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SBAR Clinical Reviews */}
      {activeDoctorTab === 'sbar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Selector List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Select Patient for SBAR</h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {patients.map((p) => {
                const isSelected = p.patient_id === selectedSbarPatientId;
                return (
                  <button
                    key={p.patient_id}
                    onClick={() => handleLoadSbar(p.patient_id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isSelected
                        ? 'bg-violet-50/80 border-violet-500 text-slate-900'
                        : 'bg-slate-50/60 border-slate-200/80 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{p.room}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-1 text-slate-500">
                      <span>Pri: {p.trajectory.attention_priority.toFixed(0)}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        p.trajectory.physiological_level === 'HIGH' ? 'bg-rose-950 text-rose-300' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.trajectory.physiological_level}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SBAR Detail View */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            {selectedSbarPatientId ? (
              (() => {
                const currentP = patients.find((p) => p.patient_id === selectedSbarPatientId);
                const currentH = handovers[selectedSbarPatientId];

                return (
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">{currentP?.name}</h2>
                          <span className="text-xs font-mono text-slate-500">({currentP?.room})</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Assigned Nurse: {currentP?.assigned_nurse_name || 'Unassigned'} • Baseline HR: {currentP?.baseline_hr} bpm • SpO₂: {currentP?.baseline_spo2}%
                        </p>
                      </div>

                      <button
                        onClick={() => currentP && onSelectPatient(currentP)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-slate-900 transition-all flex items-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Open Telemetry Modal</span>
                      </button>
                    </div>

                    {currentH ? (
                      <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">
                            Structured SBAR Handover Summary:
                          </h4>
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                            {currentH.summary_text}
                          </pre>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                          <span>Generated: {new Date(currentH.created_at).toLocaleTimeString()}</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Clinical Review Ready</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        <p>Generating SBAR handover for this patient...</p>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Select a patient on the left to review SBAR handover.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: IV & Infusion Oversight */}
      {activeDoctorTab === 'iv_oversight' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ward-Wide Intravenous Fluid Oversight</h2>
            <p className="text-xs text-slate-500">
              Continuous load-cell telemetry tracking bag volume, infusion rate, and predicted runout times.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => {
              const iv = p.current_iv;
              const isNearEmpty = iv.iv_state === 'NEAR_EMPTY' || iv.iv_remaining_ml < 50;
              const isNoFlow = iv.iv_state === 'NO_FLOW' || iv.iv_flow === 0;

              return (
                <div
                  key={p.patient_id}
                  className={`rounded-2xl border p-4 transition-all ${
                    isNearEmpty
                      ? 'bg-rose-950/20 border-rose-700/80 shadow-md shadow-rose-950/20'
                      : isNoFlow
                      ? 'bg-amber-950/20 border-amber-700/60'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                      <span className="text-xs text-slate-500 ml-1">({p.room})</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isNearEmpty
                          ? 'bg-rose-600 text-slate-900 animate-pulse'
                          : isNoFlow
                          ? 'bg-amber-600 text-slate-900'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {iv.iv_state}
                    </span>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Remaining Volume</span>
                      <span className="font-mono font-bold text-slate-900">{iv.iv_remaining_ml.toFixed(0)} ml / 500 ml</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          iv.iv_remaining_ml < 50 ? 'bg-rose-500' : iv.iv_remaining_ml < 150 ? 'bg-amber-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, (iv.iv_remaining_ml / 500) * 100)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-500">
                      <div>
                        <span>Flow Rate: </span>
                        <strong className="text-slate-700">{iv.iv_flow.toFixed(1)} ml/hr</strong>
                      </div>
                      <div className="text-right">
                        <span>ETA Empty: </span>
                        <strong className={(iv.estimated_time_to_empty_min ?? 999) < 30 ? 'text-rose-400' : 'text-slate-700'}>
                          ~{(iv.estimated_time_to_empty_min ?? 0).toFixed(0)} min
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
