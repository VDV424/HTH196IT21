import React, { useState } from 'react';
import { Patient } from '../types';
import {
  X,
  Heart,
  Wind,
  Thermometer,
  Droplets,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ShieldAlert,
  Send,
  FileText,
  CheckCircle2,
  Clock,
  Radio,
  HelpCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { api } from '../services/api';

interface PatientDetailModalProps {
  patient: Patient | null;
  onClose: () => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ patient, onClose }) => {
  const [escalating, setEscalating] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationSuccess, setEscalationSuccess] = useState(false);

  const [handoverRecord, setHandoverRecord] = useState<any>(null);
  const [generatingHandover, setGeneratingHandover] = useState(false);

  // SOS & Request handlers
  const handleTriggerSOS = async () => {
    if (!patient) return;
    await api.triggerSOS(patient.patient_id);
  };

  const handleClearSOS = async () => {
    if (!patient) return;
    await api.clearSOS(patient.patient_id);
  };

  const handleTriggerRequest = async (reqType: string) => {
    if (!patient) return;
    await api.triggerRequest(patient.patient_id, reqType);
  };

  const handleClearRequest = async () => {
    if (!patient) return;
    await api.clearRequest(patient.patient_id);
  };

  if (!patient) return null;

  const p = patient;
  const traj = p.trajectory;
  const isWorsening = traj.trajectory_state === 'WORSENING';
  const isImproving = traj.trajectory_state === 'IMPROVING';

  // Generate synthetic recent trajectory data points for plotting live trend
  const now = new Date();
  const historyData = Array.from({ length: 10 }).map((_, i) => {
    const t = new Date(now.getTime() - (9 - i) * 6000);
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const factor = (i - 5) / 5.0;

    let hr = p.current_vitals.heart_rate;
    let spo2 = p.current_vitals.spo2;
    let temp = p.current_vitals.temperature;
    let ivVol = p.current_iv.iv_remaining_ml;
    let pri = traj.attention_priority;

    if (isWorsening) {
      hr = Math.max(60, hr - (9 - i) * 1.8);
      spo2 = Math.min(100, spo2 + (9 - i) * 0.4);
      temp = Math.max(36.5, temp - (9 - i) * 0.08);
      pri = Math.max(10, pri - (9 - i) * 3.5);
    } else if (isImproving) {
      hr = Math.min(120, hr + (9 - i) * 1.5);
      spo2 = Math.max(88, spo2 - (9 - i) * 0.3);
      pri = Math.min(95, pri + (9 - i) * 3.0);
    }

    return {
      time: timeStr,
      heartRate: Math.round(hr),
      spo2: Number(spo2.toFixed(1)),
      temperature: Number(temp.toFixed(1)),
      ivRemaining: Math.round(ivVol + (9 - i) * 2),
      attentionPriority: Math.round(pri),
    };
  });

  const handleDoctorEscalation = async () => {
    if (!escalationReason) return;
    try {
      await api.escalateToDoctor(
        p.patient_id,
        p.assigned_nurse_id || 'N01',
        escalationReason,
        `Escalated from bedside trajectory panel. Attention priority: ${traj.attention_priority.toFixed(0)}`
      );
      setEscalationSuccess(true);
      setEscalating(false);
      setTimeout(() => setEscalationSuccess(false), 5000);
    } catch (e) {
      console.error('Escalation failed:', e);
    }
  };

  const handleGenerateHandover = async () => {
    setGeneratingHandover(true);
    try {
      const res = await api.generateHandover(p.patient_id, p.assigned_nurse_id || 'N01');
      if (res && res.handover) {
        setHandoverRecord(res.handover);
      }
    } catch (e) {
      console.error('Handover generation failed:', e);
    } finally {
      setGeneratingHandover(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-50/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-6xl bg-white border rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col ${p.sos_active ? 'border-red-500 ring-2 ring-red-500/50' : 'border-slate-200'}`}>

        {/* SOS Emergency Banner */}
        {p.sos_active && (
          <div className="px-6 py-3 bg-red-600 text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">🚨</span>
              <div>
                <span className="font-bold text-sm uppercase tracking-wider">SOS EMERGENCY ACTIVE</span>
                <p className="text-xs text-red-200 opacity-80">Patient has pressed the bedside panic button — immediate nurse response required</p>
              </div>
            </div>
            <button
              onClick={handleClearSOS}
              className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors border border-white/30"
            >
              ✓ SOS Responded — Clear
            </button>
          </div>
        )}

        {/* Nurse Request Banner */}
        {p.request_active && !p.sos_active && (
          <div className="px-6 py-2.5 bg-violet-600/90 text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📞</span>
              <div>
                <span className="font-bold text-sm uppercase tracking-wider">Nurse Request: {p.request_type || 'General'}</span>
                <p className="text-xs text-violet-200 opacity-80">Patient has pressed the nurse call button</p>
              </div>
            </div>
            <button
              onClick={handleClearRequest}
              className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors border border-white/30"
            >
              ✓ Request Attended — Clear
            </button>
          </div>
        )}
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
              <Activity className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{p.patient_id} — {p.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-slate-100 text-slate-600">
                  {p.room}
                </span>
                {p.data_source === 'PHYSICAL_DEVICE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-blue-300 border border-emerald-500/30 text-xs font-semibold">
                    <Radio className="w-3 h-3" />
                    PHYSICAL DEVICE ({p.device_id || 'ESP32_P01'})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Scenario: <span className="text-slate-700 font-medium">{p.scenario}</span> • Assigned Nurse:{' '}
                <span className="text-slate-700 font-medium">{p.assigned_nurse_name || 'Unassigned (In Queue)'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Attention Priority</span>
              <div className="text-2xl font-bold font-mono text-teal-600">
                {traj.attention_priority.toFixed(0)} <span className="text-xs text-slate-500 font-normal">/ 100</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 10: SEPARATE PHYSIOLOGY AND CARE-TASK / IV URGENCY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Physiological Deterioration Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Physiological Deterioration D(t)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-mono text-slate-900">
                    {traj.deterioration_score.toFixed(0)}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">/ 100</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Derived from baseline departure, velocity, persistence, and multi-vital concordance.
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  traj.physiological_level === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : traj.physiological_level === 'WATCH'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {traj.physiological_level}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1">Physiological Level</span>
              </div>
            </div>

            {/* IV Care-Task Urgency Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Care-Task / IV Urgency U(t)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-mono text-slate-900">
                    {traj.iv_urgency_score.toFixed(0)}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">/ 100</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Status: <span className="font-semibold text-indigo-300">{p.current_iv.iv_state}</span> ({p.current_iv.iv_remaining_ml.toFixed(0)} mL remaining)
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  traj.iv_level === 'HIGH'
                    ? 'bg-violet-500/20 text-indigo-300 border border-violet-500/40'
                    : traj.iv_level === 'WATCH'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {traj.iv_level}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1">IV Task Level</span>
              </div>
            </div>
          </div>

          {/* Section 9: TRAJECTORY ANALYSIS PANEL ("Why is this patient receiving attention?") */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-teal-600" />
                  Why is this patient receiving attention?
                </h3>
                <p className="text-xs text-slate-500">
                  Explainable additive decomposition of the continuous trajectory score
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200">
                  <span className="text-xs text-slate-500">Trajectory:</span>
                  {isWorsening ? (
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" /> WORSENING
                    </span>
                  ) : isImproving ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <ArrowDownRight className="w-4 h-4" /> IMPROVING
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <ArrowRight className="w-4 h-4" /> STABLE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200">
                  <span className="text-xs text-slate-500">Confidence:</span>
                  <span className="text-xs font-bold text-teal-600">{traj.confidence_level}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {traj.reasons_breakdown.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-white border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium truncate">{item.label}</span>
                    <span className="font-mono font-bold text-teal-600">+{item.points}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 8: LIVE TREND CHARTS */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Live Trajectory & Care-Task Telemetry Plots
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* HR Plot */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500" /> Heart Rate Trend
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {p.current_vitals.heart_rate.toFixed(0)} bpm
                  </span>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" textAnchor="end" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                      <ReferenceLine y={p.baseline_hr} stroke="#0284c7" strokeDasharray="4 4" label={{ value: 'Baseline', fill: '#0284c7', fontSize: 9 }} />
                      <Line type="monotone" dataKey="heartRate" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SpO2 Plot */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-teal-600" /> SpO₂ Trend
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {p.current_vitals.spo2.toFixed(1)}%
                  </span>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" domain={[85, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                      <ReferenceLine y={p.baseline_spo2} stroke="#0284c7" strokeDasharray="4 4" label={{ value: 'Baseline', fill: '#0284c7', fontSize: 9 }} />
                      <Line type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attention Priority Plot */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" /> Overall Attention P(t)
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-600">
                    {traj.attention_priority.toFixed(0)} / 100
                  </span>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                      <Line type="monotone" dataKey="attentionPriority" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Baseline & Analytical Metrics Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Personal Baseline & Trajectory Metrics
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-500 uppercase bg-white/60 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Current</th>
                    <th className="py-2.5 px-3">Personal Baseline</th>
                    <th className="py-2.5 px-3">Deviation</th>
                    <th className="py-2.5 px-3">Short-Term Slope</th>
                    <th className="py-2.5 px-3">Persistence</th>
                    <th className="py-2.5 px-3">Multi-Vital Agreement</th>
                    <th className="py-2.5 px-3">Signal Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Heart Rate</td>
                    <td className="py-2 px-3 text-slate-900">{p.current_vitals.heart_rate.toFixed(0)} bpm</td>
                    <td className="py-2 px-3 text-slate-500">{p.baseline_hr.toFixed(0)} bpm</td>
                    <td className="py-2 px-3 text-rose-400">+{traj.baseline_deviation_hr.toFixed(0)}</td>
                    <td className="py-2 px-3 text-slate-600">{traj.short_term_slope.toFixed(1)}</td>
                    <td className="py-2 px-3 text-slate-600">{traj.persistence_ticks} ticks</td>
                    <td className="py-2 px-3 font-sans text-emerald-400">{traj.multi_vital_agreement ? 'CONCORDANT' : 'Isolated'}</td>
                    <td className="py-2 px-3 font-sans text-teal-600">{traj.confidence_level}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">SpO₂</td>
                    <td className="py-2 px-3 text-slate-900">{p.current_vitals.spo2.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-slate-500">{p.baseline_spo2.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-rose-400">-{traj.baseline_deviation_spo2.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-slate-600">{traj.short_term_slope.toFixed(1)}</td>
                    <td className="py-2 px-3 text-slate-600">{traj.persistence_ticks} ticks</td>
                    <td className="py-2 px-3 font-sans text-emerald-400">{traj.multi_vital_agreement ? 'CONCORDANT' : 'Isolated'}</td>
                    <td className="py-2 px-3 font-sans text-teal-600">{traj.confidence_level}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">Body Temp</td>
                    <td className="py-2 px-3 text-slate-900">{p.current_vitals.temperature.toFixed(1)}°C</td>
                    <td className="py-2 px-3 text-slate-500">{p.baseline_temp.toFixed(1)}°C</td>
                    <td className="py-2 px-3 text-amber-400">+{traj.baseline_deviation_temp.toFixed(1)}°C</td>
                    <td className="py-2 px-3 text-slate-600">{traj.short_term_slope.toFixed(1)}</td>
                    <td className="py-2 px-3 text-slate-600">{traj.persistence_ticks} ticks</td>
                    <td className="py-2 px-3 font-sans text-emerald-400">{traj.multi_vital_agreement ? 'CONCORDANT' : 'Isolated'}</td>
                    <td className="py-2 px-3 font-sans text-teal-600">{traj.confidence_level}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">IV Remaining Volume</td>
                    <td className="py-2 px-3 text-indigo-300 font-semibold">{p.current_iv.iv_remaining_ml.toFixed(0)} mL</td>
                    <td className="py-2 px-3 text-slate-500">500 mL bag</td>
                    <td className="py-2 px-3 text-violet-600">Flow: {p.current_iv.iv_flow} mL/h</td>
                    <td className="py-2 px-3 text-slate-600">Empty: {p.current_iv.estimated_time_to_empty_min ? `${p.current_iv.estimated_time_to_empty_min.toFixed(0)}m` : 'N/A'}</td>
                    <td className="py-2 px-3 text-slate-500">--</td>
                    <td className="py-2 px-3 font-sans text-slate-500">IV Task Channel</td>
                    <td className="py-2 px-3 font-sans text-teal-600">HIGH</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SOS & Nurse Request Bedside Controls */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              🔘 Bedside Button Simulation
              <span className="text-[10px] font-normal text-slate-500">(ESP32 physical buttons or dashboard triggers)</span>
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              {/* SOS Button */}
              {!p.sos_active ? (
                <button
                  onClick={handleTriggerSOS}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-slate-900 font-bold text-sm transition-all shadow-lg shadow-red-600/30 hover:shadow-red-500/40 hover:scale-105 active:scale-95"
                >
                  <span className="text-lg">🚨</span>
                  SOS Emergency
                </button>
              ) : (
                <button
                  onClick={handleClearSOS}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-red-200 font-bold text-sm transition-colors border border-red-500/50 animate-pulse"
                >
                  <span className="text-lg">✓</span>
                  Clear SOS (Nurse Responded)
                </button>
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-slate-200"></div>

              {/* Nurse Request Buttons */}
              {!p.request_active ? (
                <>
                  <span className="text-[11px] text-slate-500 mr-1">Nurse Call:</span>
                  {['Water', 'Pain', 'Bathroom', 'General'].map((reqType) => (
                    <button
                      key={reqType}
                      onClick={() => handleTriggerRequest(reqType)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-500 text-slate-900 font-semibold text-xs transition-all hover:scale-105 active:scale-95"
                    >
                      <span className="text-sm">📞</span>
                      {reqType}
                    </button>
                  ))}
                </>
              ) : (
                <button
                  onClick={handleClearRequest}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-800 hover:bg-violet-700 text-violet-200 font-semibold text-xs transition-colors border border-violet-500/50"
                >
                  <span>✓</span>
                  Clear Request: {p.request_type || 'General'} (Attended)
                </button>
              )}
            </div>
          </div>

          {/* Action Row: Doctor Escalation & Handover Summary */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Doctor Escalation Trigger */}
              <button
                onClick={() => setEscalating(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-slate-900 font-semibold text-xs transition-colors shadow-lg shadow-rose-600/20"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Escalate to Doctor</span>
              </button>

              {/* Handover Summary Trigger */}
              <button
                onClick={handleGenerateHandover}
                disabled={generatingHandover}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{generatingHandover ? 'Generating Handover...' : 'Generate Handover Summary'}</span>
              </button>
            </div>

            {escalationSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Doctor Escalation logged in event audit trail.</span>
              </div>
            )}
          </div>

          {/* Doctor Escalation Form Inline Modal */}
          {escalating && (
            <div className="p-4 rounded-xl bg-slate-50 border border-rose-500/50 space-y-3">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Simulated Doctor Escalation Request
              </h4>
              <p className="text-xs text-slate-500">
                Log a clinical attention review request with the on-duty medical officer.
              </p>
              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Reason for escalation (e.g. Rapid multi-vital worsening trajectory, SpO2 persisting below 90% despite standard observation)..."
                className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500 resize-none h-20"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEscalating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDoctorEscalation}
                  disabled={!escalationReason}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-slate-900 font-semibold text-xs disabled:opacity-50"
                >
                  Confirm Escalation
                </button>
              </div>
            </div>
          )}

          {/* Handover Record Drawer */}
          {handoverRecord && (
            <div className="p-4 rounded-xl bg-slate-50 border border-teal-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Generated Shift Handover Record ({handoverRecord.id})
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  Recommended review: In {handoverRecord.recommended_next_review_min} min
                </span>
              </div>
              <pre className="p-3 rounded-lg bg-white text-slate-700 text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-200">
                {handoverRecord.summary_text}
              </pre>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Next Shift Nurse Review
                </span>
                <button
                  onClick={() => setHandoverRecord(null)}
                  className="text-slate-500 hover:text-slate-900 text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
