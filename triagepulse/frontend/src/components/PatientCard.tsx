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
  let borderStyle = 'border-slate-200 bg-white/90 hover:border-slate-300';
  let badgeColor = 'bg-slate-100 text-slate-600';

  if (p.code_blue_active) {
    borderStyle = 'border-red-600 bg-red-100/90 shadow-2xl shadow-red-600/30 hover:border-red-700 ring-4 ring-red-500/80 animate-pulse';
    badgeColor = 'bg-red-600 text-white font-extrabold';
  } else if (p.sos_active) {
    borderStyle = 'border-red-400 bg-red-50/80 shadow-xl shadow-red-500/10 hover:border-red-500 ring-2 ring-red-500/50 animate-pulse';
    badgeColor = 'bg-red-100 text-red-700 border border-red-200 font-bold';
  } else if (priority >= 70) {
    borderStyle = 'border-rose-300 bg-rose-50/50 shadow-lg shadow-rose-500/5 hover:border-rose-400';
    badgeColor = 'bg-rose-100 text-rose-700 border border-rose-200 font-semibold';
  } else if (priority >= 50) {
    borderStyle = 'border-orange-300 bg-orange-50/50 hover:border-orange-400';
    badgeColor = 'bg-orange-100 text-orange-700 border border-orange-200 font-semibold';
  } else if (priority >= 35) {
    borderStyle = 'border-amber-300 bg-amber-50/50 hover:border-amber-400';
    badgeColor = 'bg-amber-100 text-amber-700 border border-amber-200 font-medium';
  }

  const isWorsening = traj.trajectory_state === 'WORSENING';
  const isImproving = traj.trajectory_state === 'IMPROVING';

  // Compute NEWS2 risk badge style
  const newsScore = traj.news2_score ?? 0;
  const newsRisk = traj.news2_risk ?? (newsScore >= 7 ? 'HIGH' : newsScore >= 5 ? 'MEDIUM' : 'LOW');
  const newsBadgeColor = newsRisk === 'HIGH' 
    ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
    : newsRisk === 'MEDIUM'
    ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${borderStyle}`}>
      {/* Code Blue Emergency Banner */}
      {p.code_blue_active && (
        <div className="mb-3 -mx-4 -mt-4 px-4 py-2 bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white text-xs font-black uppercase tracking-widest text-center rounded-t-xl flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <span className="text-xl">⚡</span> CODE BLUE — CARDIAC ARREST / RRT DISPATCHED
        </div>
      )}

      {/* SOS Emergency Banner */}
      {p.sos_active && !p.code_blue_active && (
        <div className="mb-3 -mx-4 -mt-4 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold uppercase tracking-wider text-center rounded-t-xl flex items-center justify-center gap-2 shadow-sm">
          <span className="text-lg">🚨</span> SOS EMERGENCY — IMMEDIATE RESPONSE REQUIRED
        </div>
      )}

      {/* Nurse Request Banner */}
      {p.request_active && !p.sos_active && !p.code_blue_active && (
        <div className="mb-3 -mx-4 -mt-4 px-4 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold uppercase tracking-wider text-center rounded-t-xl flex items-center justify-center gap-2 shadow-sm">
          <span className="text-sm">📞</span> Nurse Request: {p.request_type || 'General'}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-slate-900">{p.patient_id}</h3>
              <span className="text-xs text-slate-500 font-mono">({p.room})</span>
              
              {/* NEWS2 Clinical Risk Badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border shadow-xs ${newsBadgeColor}`}>
                NEWS2: {newsScore} ({newsRisk})
              </span>

              {p.isolation_precautions && p.isolation_precautions !== 'Standard' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-semibold">
                  ⚠️ {p.isolation_precautions}
                </span>
              )}

              {p.data_source === 'PHYSICAL_DEVICE' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold shadow-sm animate-pulse">
                  <Radio className="w-3 h-3 text-emerald-600" /> {p.device_id || 'IoT Gateway'}
                </span>
              )}
              {p.sos_active && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 text-[9px] font-bold animate-pulse shadow-sm">
                  🚨 SOS
                </span>
              )}
              {p.request_active && !p.sos_active && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200 text-[9px] font-semibold shadow-sm">
                  📞 {p.request_type || 'Request'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{p.scenario}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Attention</span>
            <div className="text-xl font-bold font-mono text-teal-600">
              {priority.toFixed(0)} <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </div>
          </div>
        </div>

        {/* eMAR Smart Infusion Guardrails Line */}
        <div className="flex items-center justify-between text-[11px] bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-200/80 mt-2 text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <Droplets className="w-3 h-3 text-violet-500 flex-shrink-0" />
            <span className="truncate font-medium">{p.iv_fluid_name || '0.9% Normal Saline'}</span>
          </div>
          <div className="flex items-center gap-2 font-mono flex-shrink-0">
            {p.iv_occlusion ? (
              <span className="text-rose-600 font-bold animate-pulse text-[10px]">⚠️ OCCLUDED</span>
            ) : p.iv_free_flow ? (
              <span className="text-rose-600 font-bold animate-pulse text-[10px]">⚠️ FREE FLOW</span>
            ) : (
              <span className="text-slate-500 text-[10px]">{p.current_iv.iv_flow} mL/h</span>
            )}
          </div>
        </div>

        {/* Separated Physiology & IV scores */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs shadow-inner">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Physiology D(t)</span>
            <span className={`font-bold text-base font-mono ${traj.deterioration_score >= 60 ? 'text-rose-500' : 'text-slate-700'}`}>
              {traj.deterioration_score.toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">({traj.physiological_level})</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">IV Urgency U(t)</span>
            <span className={`font-bold text-base font-mono ${traj.iv_urgency_score >= 60 ? 'text-violet-600' : 'text-slate-700'}`}>
              {traj.iv_urgency_score.toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">({traj.iv_level})</span>
          </div>
        </div>

        {/* Vitals Quick Row */}
        <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-200 text-slate-600">
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-mono">{p.current_vitals.signal_quality === 'MISSING' ? '--' : p.current_vitals.heart_rate.toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-teal-500" />
            <span className="font-mono">{p.current_vitals.signal_quality === 'MISSING' ? '--' : `${p.current_vitals.spo2.toFixed(0)}%`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono">{p.current_vitals.signal_quality === 'MISSING' ? '--' : `${p.current_vitals.temperature.toFixed(1)}°C`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-violet-600" />
            <span className="font-mono">{p.current_iv.iv_remaining_ml.toFixed(0)}mL</span>
          </div>
        </div>

        {/* Trajectory Status & Signal Quality */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Trajectory:</span>
            {isWorsening ? (
              <span className="inline-flex items-center gap-0.5 text-rose-400 font-semibold text-[11px]">
                <ArrowUpRight className="w-3.5 h-3.5" /> Worsening
              </span>
            ) : isImproving ? (
              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold text-[11px]">
                <ArrowDownRight className="w-3.5 h-3.5" /> Improving
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-slate-500 font-medium text-[11px]">
                <ArrowRight className="w-3.5 h-3.5" /> Stable
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 opacity-85" title="AI 60-Min Deterioration Horizon">
              <span className="text-[9px] font-bold text-slate-500">60m AI</span>
              <div className="w-8 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${priority > 60 ? 'bg-rose-500' : priority > 30 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                  style={{ width: `${Math.max(10, traj.predicted_deterioration_risk_60m ?? traj.deterioration_score)}%` }} 
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500">{traj.predicted_deterioration_risk_60m?.toFixed(0) ?? traj.deterioration_score.toFixed(0)}%</span>
            </div>

            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
            p.current_vitals.signal_quality === 'GOOD' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {p.current_vitals.signal_quality}
          </span>
          </div>
        </div>
      </div>

      {/* Footer with Nurse & Action */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
        <div className="text-[11px]">
          <span className="text-slate-500 block">Assigned</span>
          <span className="text-slate-700 font-medium truncate">{p.assigned_nurse_name || 'Unassigned'}</span>
        </div>

        <button
          onClick={() => onSelect(p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold text-[11px] transition-all shadow-sm active:scale-95"
        >
          <span>OPEN PATIENT</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
