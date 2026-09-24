import React from 'react';
import { Patient } from '../types';
import { Bed, Radio, Droplets, AlertCircle } from 'lucide-react';

interface WardRoomMapProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const WardRoomMap: React.FC<WardRoomMapProps> = ({ patients, onSelectPatient }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Bed className="w-4 h-4 text-teal-600" />
            Live Patient Attention Ward Map
          </h3>
          <p className="text-xs text-slate-500">Interactive telemetry, NEWS2 scores, and bed status across hospital rooms</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Stable (&lt;35)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Watch (35-54)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Review (55-69)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>High (70+)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
        {patients.map((p) => {
          const priority = p.trajectory.attention_priority;
          let borderCol = 'border-slate-200 hover:border-teal-400 bg-slate-50/70 hover:bg-teal-50/20';
          let statusBadge = 'bg-slate-100 text-slate-700 border border-slate-200';
          let dotColor = 'bg-emerald-500';

          if (p.code_blue_active) {
            borderCol = 'border-rose-600 bg-rose-50 shadow-md ring-2 ring-rose-500 animate-pulse';
            statusBadge = 'bg-rose-600 text-white font-extrabold';
            dotColor = 'bg-rose-600 animate-ping';
          } else if (priority >= 70) {
            borderCol = 'border-rose-300 bg-rose-50/80 hover:border-rose-400 shadow-sm';
            statusBadge = 'bg-rose-100 text-rose-800 border border-rose-200';
            dotColor = 'bg-rose-500 animate-pulse';
          } else if (priority >= 55) {
            borderCol = 'border-orange-300 bg-orange-50/70 hover:border-orange-400';
            statusBadge = 'bg-orange-100 text-orange-800 border border-orange-200';
            dotColor = 'bg-orange-500';
          } else if (priority >= 35) {
            borderCol = 'border-amber-300 bg-amber-50/60 hover:border-amber-400';
            statusBadge = 'bg-amber-100 text-amber-800 border border-amber-200';
            dotColor = 'bg-amber-500';
          }

          const isPhysical = p.data_source === 'PHYSICAL_DEVICE';
          const hasIvIssue = p.current_iv.iv_state !== 'NORMAL' || p.current_iv.iv_remaining_ml <= 80 || p.iv_occlusion;
          const news2 = p.trajectory.news2_score ?? Math.min(12, Math.round(priority / 10));

          return (
            <button
              key={p.patient_id}
              onClick={() => onSelectPatient(p)}
              className={`text-left p-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer flex flex-col justify-between ${borderCol}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-bold text-slate-800">{p.room}</span>
                  <div className="flex items-center gap-1">
                    {p.code_blue_active && (
                      <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-rose-600 text-white animate-bounce">
                        BLUE
                      </span>
                    )}
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[70px]">{p.patient_id}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBadge}`}>
                    Pri {priority.toFixed(0)}
                  </span>
                </div>

                {/* NEWS2 & Bed Status Pills */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className={`text-[9px] font-semibold px-1 rounded ${
                    news2 >= 7 ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    news2 >= 5 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                    news2 >= 1 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    NEWS {news2}
                  </span>

                  {p.isolation_precautions && p.isolation_precautions !== 'NONE' && (
                    <span className="text-[9px] font-bold px-1 rounded bg-purple-100 text-purple-800 border border-purple-200">
                      {p.isolation_precautions}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate max-w-[65px] font-medium text-slate-600">
                  {p.assigned_nurse_name ? p.assigned_nurse_name.split(' ')[1] || p.assigned_nurse_name : 'Queue'}
                </span>
                <div className="flex items-center gap-1">
                  {isPhysical && <span title="Physical ESP32 device"><Radio className="w-2.5 h-2.5 text-emerald-600" /></span>}
                  {hasIvIssue && <span title="Smart IV issue/occlusion"><Droplets className="w-2.5 h-2.5 text-violet-600 animate-pulse" /></span>}
                  {p.active_alerts_count > 0 && <span title="Active Alert"><AlertCircle className="w-2.5 h-2.5 text-rose-500" /></span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
