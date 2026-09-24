import React, { useState } from 'react';
import { Patient, Nurse, Alert } from '../types';
import { 
  User, 
  AlertTriangle, 
  Clock, 
  Droplets, 
  CheckCircle, 
  ExternalLink, 
  ShieldAlert, 
  ArrowUpRight,
  AlertOctagon,
  Bell,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface NursePersonalPageProps {
  currentNurseName: string;
  nurses: Nurse[];
  patients: Patient[];
  alerts: Alert[];
  onSelectPatient: (patient: Patient) => void;
}

export const NursePersonalPage: React.FC<NursePersonalPageProps> = ({
  currentNurseName,
  nurses,
  patients,
  alerts,
  onSelectPatient,
}) => {
  const [refillingPid, setRefillingPid] = useState<string | null>(null);
  const [clearingSosPid, setClearingSosPid] = useState<string | null>(null);
  const [clearingReqPid, setClearingReqPid] = useState<string | null>(null);

  const nurse = nurses.find((n) => n.name === currentNurseName) || nurses[0];
  const assignedPids = new Set(nurse?.assigned_patients || []);
  const myPatients = patients.filter((p) => assignedPids.has(p.patient_id));

  // Tiers for personal nurse view
  const sosPatients = myPatients.filter((p) => p.sos_active);
  const requestPatients = myPatients.filter((p) => p.request_active);
  const urgentPatients = myPatients.filter((p) => p.trajectory.attention_priority >= 65);
  const reviewPatients = myPatients.filter(
    (p) => p.trajectory.attention_priority >= 40 && p.trajectory.attention_priority < 65
  );
  const ivTaskPatients = myPatients.filter(
    (p) => p.trajectory.iv_urgency_score >= 45 || p.current_iv.iv_state !== 'NORMAL' || p.current_iv.iv_remaining_ml < 120
  );
  const stablePatients = myPatients.filter(
    (p) => p.trajectory.attention_priority < 40 && p.trajectory.iv_urgency_score < 45 && !p.sos_active && !p.request_active
  );

  const handleRefillIV = async (patientId: string) => {
    setRefillingPid(patientId);
    try {
      await api.refillIV(patientId, 500);
      sounds.playSuccessChime();
    } catch (err) {
      console.error('Failed to refill IV', err);
    } finally {
      setRefillingPid(null);
    }
  };

  const handleClearSOS = async (patientId: string) => {
    setClearingSosPid(patientId);
    try {
      await api.clearSOS(patientId);
      sounds.playSuccessChime();
    } catch (err) {
      console.error('Failed to clear SOS', err);
    } finally {
      setClearingSosPid(null);
    }
  };

  const handleClearRequest = async (patientId: string) => {
    setClearingReqPid(patientId);
    try {
      await api.clearRequest(patientId);
      sounds.playSuccessChime();
    } catch (err) {
      console.error('Failed to clear request', err);
    } finally {
      setClearingReqPid(null);
    }
  };

  const renderPatientRow = (p: Patient) => {
    const pri = p.trajectory.attention_priority;
    const isWorsening = p.trajectory.trajectory_state === 'WORSENING';
    const isLowIV = p.current_iv.iv_remaining_ml < 100 || p.current_iv.iv_state === 'NEAR_EMPTY';

    return (
      <div
        key={p.patient_id}
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          p.sos_active
            ? 'bg-rose-950/40 border-rose-600'
            : p.request_active
            ? 'bg-purple-950/30 border-purple-600'
            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{p.patient_id} — {p.name}</span>
            <span className="text-xs text-slate-500 font-mono">({p.room})</span>
            {p.sos_active && (
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-slate-900 animate-pulse">
                🚨 SOS ACTIVE
              </span>
            )}
            {p.request_active && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-slate-900">
                🔔 REQ: {p.request_type || 'Help'}
              </span>
            )}
            {isWorsening && !p.sos_active && (
              <span className="flex items-center text-[10px] text-rose-400 font-bold">
                <ArrowUpRight className="w-3 h-3" /> Worsening
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
            <span>HR: <strong className="text-slate-700">{p.current_vitals.heart_rate.toFixed(0)}</strong></span>
            <span>SpO₂: <strong className="text-slate-700">{p.current_vitals.spo2.toFixed(1)}%</strong></span>
            <span>Temp: <strong className="text-slate-700">{p.current_vitals.temperature.toFixed(1)}°C</strong></span>
            <span className={isLowIV ? 'text-amber-400 font-bold' : ''}>
              IV: {p.current_iv.iv_remaining_ml.toFixed(0)} mL ({p.current_iv.iv_state})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Quick Bedside Action Buttons */}
          {isLowIV && (
            <button
              onClick={() => handleRefillIV(p.patient_id)}
              disabled={refillingPid === p.patient_id}
              className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-cyan-300 hover:bg-cyan-900 border border-cyan-700 text-xs font-semibold flex items-center gap-1 transition-all"
              title="Hang fresh 500mL IV bag"
            >
              <RefreshCw className={`w-3 h-3 ${refillingPid === p.patient_id ? 'animate-spin' : ''}`} />
              <span>Hang 500ml Bag</span>
            </button>
          )}

          {p.sos_active && (
            <button
              onClick={() => handleClearSOS(p.patient_id)}
              disabled={clearingSosPid === p.patient_id}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-slate-900 text-xs font-bold transition-all shadow-md"
            >
              Clear SOS
            </button>
          )}

          {p.request_active && (
            <button
              onClick={() => handleClearRequest(p.patient_id)}
              disabled={clearingReqPid === p.patient_id}
              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-slate-900 text-xs font-bold transition-all shadow-md"
            >
              Clear Req
            </button>
          )}

          <div className="text-right px-2">
            <span className="text-[9px] text-slate-500 uppercase font-semibold block">Attention</span>
            <span className="text-sm font-bold font-mono text-teal-600">{pri.toFixed(0)}</span>
          </div>

          <button
            onClick={() => onSelectPatient(p)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-600 text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Bedside</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center">
            <User className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{nurse?.name} — Shift Care Queue</h2>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 font-mono">
                {nurse?.ward}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Role: <span className="text-slate-700">{nurse?.role}</span> • Capacity:{' '}
              <span className="text-emerald-400 font-bold font-mono">
                {nurse?.assigned_count} / {nurse?.max_capacity} beds ({nurse?.available_capacity} slots remaining)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-right">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Shift Workload</span>
            <span className="font-bold text-slate-900 font-mono">{nurse?.workload_percent.toFixed(0)}% Utilized</span>
          </div>
        </div>
      </div>

      {/* Emergency SOS Banner if assigned patient has triggered SOS */}
      {sosPatients.length > 0 && (
        <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl animate-pulse text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-7 h-7 text-slate-900 flex-shrink-0" />
            <div>
              <h3 className="text-base font-bold">🚨 ACTIVE EMERGENCY IN YOUR ASSIGNED ROOM</h3>
              <p className="text-xs text-rose-200">
                {sosPatients.map((p) => `${p.name} (${p.room})`).join(', ')} has activated the bedside emergency panic button.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sosPatients.map((p) => (
              <button
                key={p.patient_id}
                onClick={() => handleClearSOS(p.patient_id)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-rose-900 hover:bg-rose-100 transition-all shadow-md"
              >
                Clear {p.room} SOS
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Bedside Requests Banner */}
      {requestPatients.length > 0 && (
        <div className="bg-purple-950/80 border border-purple-500/70 rounded-2xl p-4 shadow-xl text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-purple-300 animate-bounce flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Bedside Assistance Requests Pending</h4>
              <p className="text-xs text-purple-200">
                {requestPatients.map((p) => `${p.room}: ${p.request_type || 'Help'}`).join(' • ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {requestPatients.map((p) => (
              <button
                key={p.patient_id}
                onClick={() => handleClearRequest(p.patient_id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-slate-900 transition-all shadow-md"
              >
                Mark {p.room} Attended
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 gap-5">
        {/* Urgent Attention */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Acute Attention Queue ({urgentPatients.length})</span>
          </h3>
          <div className="space-y-2.5">
            {urgentPatients.map(renderPatientRow)}
            {urgentPatients.length === 0 && (
              <p className="text-xs text-slate-500 italic py-2">No patients currently in acute high-attention band.</p>
            )}
          </div>
        </div>

        {/* Needs Review */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Trajectory Observation / Review ({reviewPatients.length})</span>
          </h3>
          <div className="space-y-2.5">
            {reviewPatients.map(renderPatientRow)}
            {reviewPatients.length === 0 && (
              <p className="text-xs text-slate-500 italic py-2">No patients currently requiring review.</p>
            )}
          </div>
        </div>

        {/* IV Care Tasks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wider flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              <span>IV Tasks & Fluid Vigilance ({ivTaskPatients.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">1-Click Bag Replacement</span>
          </div>
          <div className="space-y-2.5">
            {ivTaskPatients.map(renderPatientRow)}
            {ivTaskPatients.length === 0 && (
              <p className="text-xs text-slate-500 italic py-2">All IV infusions flowing normally.</p>
            )}
          </div>
        </div>

        {/* Stable Patients */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Stable Routine Monitoring ({stablePatients.length})</span>
          </h3>
          <div className="space-y-2.5">
            {stablePatients.map(renderPatientRow)}
            {stablePatients.length === 0 && (
              <p className="text-xs text-slate-500 italic py-2">No stable patients assigned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
