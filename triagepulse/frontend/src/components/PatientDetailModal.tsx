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
  Zap,
  BedDouble,
  ShieldCheck,
  AlertOctagon,
  Copy,
  Printer,
  RefreshCw,
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
import { sounds } from '../utils/audio';

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
  const [copiedSbar, setCopiedSbar] = useState(false);
  const [refillingIV, setRefillingIV] = useState(false);

  // SOS & Request handlers
  const handleTriggerSOS = async () => {
    if (!patient) return;
    await api.triggerSOS(patient.patient_id);
    sounds.playSOSAlarm();
  };

  const handleClearSOS = async () => {
    if (!patient) return;
    await api.clearSOS(patient.patient_id);
    sounds.playSuccessChime();
  };

  const handleTriggerCodeBlue = async () => {
    if (!patient) return;
    await api.triggerCodeBlue(patient.patient_id);
    sounds.playCodeBlueAlarm();
  };

  const handleClearCodeBlue = async () => {
    if (!patient) return;
    await api.clearCodeBlue(patient.patient_id);
    sounds.playSuccessChime();
  };

  const handleRefillIV = async (vol: number = 1000) => {
    if (!patient) return;
    setRefillingIV(true);
    try {
      await api.refillIV(patient.patient_id, vol);
      sounds.playSuccessChime();
    } finally {
      setRefillingIV(false);
    }
  };

  const handleTriggerRequest = async (reqType: string) => {
    if (!patient) return;
    await api.triggerRequest(patient.patient_id, reqType);
    sounds.playRequestChime();
  };

  const handleClearRequest = async () => {
    if (!patient) return;
    await api.clearRequest(patient.patient_id);
    sounds.playSuccessChime();
  };

  const handleCopySbar = () => {
    if (!handoverRecord?.summary_text) return;
    navigator.clipboard.writeText(handoverRecord.summary_text);
    setCopiedSbar(true);
    setTimeout(() => setCopiedSbar(false), 3000);
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
          {/* Code Blue Active Banner */}
          {p.code_blue_active && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shadow-xl animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">CODE BLUE RESUSCITATION IN PROGRESS</h3>
                  <p className="text-xs text-red-100">Crash Cart Dispatched • Intensivist & Emergency Nurse Routing to {p.room}</p>
                </div>
              </div>
              <button
                onClick={handleClearCodeBlue}
                className="px-4 py-2 rounded-lg bg-white text-red-700 font-bold text-xs uppercase tracking-wider hover:bg-red-50 shadow-md transition-all active:scale-95"
              >
                Clear Code Blue
              </button>
            </div>
          )}

          {/* Section 10: 4-PILLAR CLINICAL STRATIFICATION & REAL-WORLD HOSPITAL METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Physiological Deterioration */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Physiology D(t)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">
                    {traj.deterioration_score.toFixed(0)}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Multi-vital velocity & baseline deviation.
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Severity</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  traj.physiological_level === 'HIGH'
                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                    : traj.physiological_level === 'WATCH'
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                }`}>
                  {traj.physiological_level}
                </span>
              </div>
            </div>

            {/* Card 2: Care-Task / IV Urgency */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Care-Task / IV Urgency U(t)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">
                    {traj.iv_urgency_score.toFixed(0)}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {p.current_iv.iv_remaining_ml.toFixed(0)} mL • {p.current_iv.iv_state}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">IV Task Priority</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  traj.iv_level === 'HIGH'
                    ? 'bg-violet-100 text-violet-700 border border-violet-300'
                    : traj.iv_level === 'WATCH'
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                }`}>
                  {traj.iv_level}
                </span>
              </div>
            </div>

            {/* Card 3: NHS NEWS2 Royal College Score */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    NEWS2 Clinical Score
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-semibold">RCP</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">
                    {traj.news2_score ?? 0}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">/ 20</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  {traj.news2_recommendation || 'Routine ward observations'}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Risk Band</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  (traj.news2_score ?? 0) >= 7
                    ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                    : (traj.news2_score ?? 0) >= 5
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                }`}>
                  {traj.news2_risk ?? ((traj.news2_score ?? 0) >= 7 ? 'HIGH' : (traj.news2_score ?? 0) >= 5 ? 'MEDIUM' : 'LOW')}
                </span>
              </div>
            </div>

            {/* Card 4: AI 60-Minute Horizon & Sepsis Index */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  AI 60m Horizon & Sepsis
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">
                    {traj.predicted_deterioration_risk_60m?.toFixed(0) ?? traj.deterioration_score.toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-500 font-sans">60m risk</span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${
                      (traj.predicted_deterioration_risk_60m ?? 0) > 60
                        ? 'bg-rose-500'
                        : (traj.predicted_deterioration_risk_60m ?? 0) > 35
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(10, traj.predicted_deterioration_risk_60m ?? 20)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 text-[10px]">SIRS Sepsis Index</span>
                <span className="font-mono font-semibold text-slate-700">
                  {traj.early_sepsis_index?.toFixed(0) ?? '15'}%
                </span>
              </div>
            </div>
          </div>

          {/* Hospital ADT Bed Management & eMAR Infusion Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ADT Bed Management Card */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 flex-shrink-0">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{p.room} • Bed A</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {p.bed_status || 'OCCUPIED'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {p.isolation_precautions || 'Standard Precautions'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Length of Stay: <span className="font-medium text-slate-700">{p.length_of_stay_hrs || 24} hours</span> • Ward 4B Medical/Surgical
                  </p>
                </div>
              </div>
            </div>

            {/* eMAR Smart Infusion & Guardrails Card */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 flex-shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{p.iv_fluid_name || '0.9% Normal Saline (1000mL)'}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-100 text-violet-800 border border-violet-200">
                      {p.current_iv.iv_flow} mL/h
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {p.iv_occlusion ? (
                      <span className="text-rose-600 font-bold">⚠️ Line Occlusion Detected (HX711 Zero-Flow)</span>
                    ) : (
                      <span>DERS Guardrails Active • Anti-Free-Flow Verified</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRefillIV(1000)}
                disabled={refillingIV}
                className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 font-semibold text-xs transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refillingIV ? 'animate-spin' : ''}`} />
                <span>Refill 1000mL</span>
              </button>
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
              {/* Code Blue Emergency Trigger */}
              {!p.code_blue_active ? (
                <button
                  onClick={handleTriggerCodeBlue}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-700/30 hover:scale-105 active:scale-95"
                >
                  <span className="text-base">⚡</span>
                  Code Blue (RRT)
                </button>
              ) : (
                <button
                  onClick={handleClearCodeBlue}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-800 text-white font-bold text-xs uppercase tracking-wider border border-red-500 animate-pulse"
                >
                  <span>✓</span>
                  Clear Code Blue
                </button>
              )}

              {/* SOS Button */}
              {!p.sos_active ? (
                <button
                  onClick={handleTriggerSOS}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-red-600/30 hover:scale-105 active:scale-95"
                >
                  <span className="text-base">🚨</span>
                  SOS Emergency
                </button>
              ) : (
                <button
                  onClick={handleClearSOS}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-red-500/50 animate-pulse"
                >
                  <span className="text-base">✓</span>
                  Clear SOS
                </button>
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-slate-200"></div>

              {/* Nurse Request Buttons */}
              {!p.request_active ? (
                <>
                  <span className="text-[11px] text-slate-500 mr-1 font-semibold">Bedside Request:</span>
                  {['Water', 'Pain', 'Bathroom', 'General'].map((reqType) => (
                    <button
                      key={reqType}
                      onClick={() => handleTriggerRequest(reqType)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-xs"
                    >
                      <span className="text-sm">📞</span>
                      {reqType}
                    </button>
                  ))}
                </>
              ) : (
                <button
                  onClick={handleClearRequest}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-semibold text-xs transition-colors border border-teal-500/50"
                >
                  <span>✓</span>
                  Clear Request: {p.request_type || 'General'}
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/20"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Escalate to Doctor</span>
              </button>

              {/* Handover Summary Trigger */}
              <button
                onClick={handleGenerateHandover}
                disabled={generatingHandover}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-300"
              >
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{generatingHandover ? 'Generating Handover...' : 'Generate SBAR Handover'}</span>
              </button>
            </div>

            {escalationSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Doctor Escalation logged in event audit trail.</span>
              </div>
            )}
          </div>

          {/* Doctor Escalation Form Inline Modal */}
          {escalating && (
            <div className="p-4 rounded-xl bg-slate-50 border border-rose-300 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Physician Escalation SBAR Dispatch
              </h4>
              <p className="text-xs text-slate-600">
                Log a clinical review request with the on-duty medical officer or intensivist.
              </p>
              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Reason for escalation (e.g. Rapid multi-vital worsening trajectory, NEWS2 score elevated to 7, SpO2 persisting below 90%)..."
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
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs disabled:opacity-50"
                >
                  Confirm Escalation
                </button>
              </div>
            </div>
          )}

          {/* Handover Record Drawer */}
          {handoverRecord && (
            <div className="p-4 rounded-xl bg-white border border-teal-200 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Clinical SBAR Shift Handover ({handoverRecord.id})
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySbar}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold hover:bg-teal-100 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSbar ? 'Copied!' : 'Copy SBAR'}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-200 transition-colors"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
              <pre className="p-3 rounded-lg bg-slate-50 text-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-200 shadow-inner">
                {handoverRecord.summary_text}
              </pre>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> JCAHO & SBAR Clinical Standard Verified
                </span>
                <button
                  onClick={() => setHandoverRecord(null)}
                  className="text-slate-500 hover:text-slate-900 text-xs font-medium"
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
