import React from 'react';
import { Patient } from '../types';
import { ArrowUpRight, ArrowRight, ArrowDownRight, Droplets, Heart, Wind, Thermometer, Radio, ExternalLink } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  onSelect: (patient: Patient) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onSelect }) => {
  const p = patient;
  const traj = p.trajectory;
  const priority = traj.attention_priority;

  // Severity border styling
  let borderStyle = 'border-slate-800 bg-slate-900/90 hover:border-slate-700';
  let badgeColor = 'bg-slate-800 text-slate-300';

  if (p.sos_active) {
    borderStyle = 'border-red-500 bg-red-950/30 shadow-lg shadow-red-600/30 hover:border-red-400 ring-2 ring-red-500/50 animate-pulse';
    badgeColor = 'bg-red-500/30 text-red-200 border border-red-500/50';
  } else if (priority >= 70) {
    borderStyle = 'border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/20 hover:border-rose-500';
    badgeColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
  } else if (priority >= 50) {
    borderStyle = 'border-orange-500/40 bg-orange-950/15 hover:border-orange-500';
    badgeColor = 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
  } else if (priority >= 35) {
    borderStyle = 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500';
    badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  }

  const isWorsening = traj.trajectory_state === 'WORSENING';
  const isImproving = traj.trajectory_state === 'IMPROVING';

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${borderStyle}`}>
      {/* SOS Emergency Banner */}
      {p.sos_active && (
        <div className="mb-3 -mx-4 -mt-4 px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider text-center rounded-t-xl flex items-center justify-center gap-2">
          <span className="text-lg">🚨</span> SOS EMERGENCY — IMMEDIATE RESPONSE REQUIRED
        </div>
      )}

      {/* Nurse Request Banner */}
      {p.request_active && !p.sos_active && (
        <div className="mb-3 -mx-4 -mt-4 px-4 py-1.5 bg-violet-600/80 text-white text-xs font-semibold uppercase tracking-wider text-center rounded-t-xl flex items-center justify-center gap-2">
          <span className="text-sm">📞</span> Nurse Request: {p.request_type || 'General'}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-white">{p.patient_id}</h3>
              <span className="text-xs text-slate-400 font-mono">({p.room})</span>
              {p.data_source === 'PHYSICAL_DEVICE' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px]">
                  <Radio className="w-2.5 h-2.5" /> ESP32
                </span>
              )}
              {p.sos_active && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 border border-red-500/50 text-[9px] font-bold animate-pulse">
                  🚨 SOS
                </span>
              )}
              {p.request_active && !p.sos_active && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/25 text-violet-300 border border-violet-500/40 text-[9px] font-semibold">
                  📞 {p.request_type || 'Request'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{p.scenario}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Attention</span>
            <div className="text-xl font-bold font-mono text-cyan-400">
              {priority.toFixed(0)} <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </div>
          </div>
        </div>

        {/* Separated Physiology & IV scores */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Physiology D(t)</span>
            <span className={`font-bold font-mono ${traj.deterioration_score >= 60 ? 'text-rose-400' : 'text-slate-200'}`}>
              {traj.deterioration_score.toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">({traj.physiological_level})</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">IV Urgency U(t)</span>
            <span className={`font-bold font-mono ${traj.iv_urgency_score >= 60 ? 'text-indigo-400' : 'text-slate-200'}`}>
              {traj.iv_urgency_score.toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">({traj.iv_level})</span>
          </div>
        </div>

        {/* Vitals Quick Row */}
        <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-800 text-slate-300">
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-mono">{p.current_vitals.signal_quality === 'MISSING' ? '--' : p.current_vitals.heart_rate.toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-mono">{p.current_vitals.signal_quality === 'MISSING' ? '--' : `${p.current_vitals.spo2.toFixed(0)}%`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono">{p.current_vitals.signal_quality === 'MISSING' ? '--' : `${p.current_vitals.temperature.toFixed(1)}°C`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono">{p.current_iv.iv_remaining_ml.toFixed(0)}mL</span>
          </div>
        </div>

        {/* Trajectory Status & Signal Quality */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Trajectory:</span>
            {isWorsening ? (
              <span className="inline-flex items-center gap-0.5 text-rose-400 font-semibold text-[11px]">
                <ArrowUpRight className="w-3.5 h-3.5" /> Worsening
              </span>
            ) : isImproving ? (
              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold text-[11px]">
                <ArrowDownRight className="w-3.5 h-3.5" /> Improving
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-slate-400 font-medium text-[11px]">
                <ArrowRight className="w-3.5 h-3.5" /> Stable
              </span>
            )}
          </div>

          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
            p.current_vitals.signal_quality === 'GOOD' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
          }`}>
            {p.current_vitals.signal_quality}
          </span>
        </div>
      </div>

      {/* Footer with Nurse & Action */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
        <div className="text-[11px]">
          <span className="text-slate-500 block">Assigned</span>
          <span className="text-slate-200 font-medium truncate">{p.assigned_nurse_name || 'Unassigned'}</span>
        </div>

        <button
          onClick={() => onSelect(p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white font-medium text-xs transition-colors shadow-sm"
        >
          <span>OPEN PATIENT</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
