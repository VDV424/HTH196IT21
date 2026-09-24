import React from 'react';
import { Patient } from '../types';
import { Bed, Radio, Droplets, AlertCircle } from 'lucide-react';

interface WardRoomMapProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const WardRoomMap: React.FC<WardRoomMapProps> = ({ patients, onSelectPatient }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bed className="w-4 h-4 text-cyan-400" />
            Live Patient Attention Ward Map
          </h3>
          <p className="text-xs text-slate-400">Interactive telemetry overview across hospital care rooms</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
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
            <span>High Attention (70+)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5">
        {patients.map((p) => {
          const priority = p.trajectory.attention_priority;
          let borderCol = 'border-slate-800 hover:border-slate-600 bg-slate-950/70';
          let statusBadge = 'bg-slate-800 text-slate-300';
          let dotColor = 'bg-emerald-500';

          if (priority >= 70) {
            borderCol = 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30';
            statusBadge = 'bg-rose-500/20 text-rose-300 border border-rose-500/40';
            dotColor = 'bg-rose-500 animate-pulse';
          } else if (priority >= 55) {
            borderCol = 'border-orange-500/50 bg-orange-950/20';
            statusBadge = 'bg-orange-500/20 text-orange-300 border border-orange-500/40';
            dotColor = 'bg-orange-500';
          } else if (priority >= 35) {
            borderCol = 'border-amber-500/40 bg-amber-950/15';
            statusBadge = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
            dotColor = 'bg-amber-500';
          }

          const isPhysical = p.data_source === 'PHYSICAL_DEVICE';
          const hasIvIssue = p.current_iv.iv_state !== 'NORMAL' || p.current_iv.iv_remaining_ml <= 80;

          return (
            <button
              key={p.patient_id}
              onClick={() => onSelectPatient(p)}
              className={`text-left p-2.5 rounded-lg border transition-all duration-200 hover:scale-[1.02] cursor-pointer flex flex-col justify-between ${borderCol}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-semibold text-slate-200">{p.room}</span>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{p.patient_id}</span>
                  <span className={`text-[10px] font-bold px-1 rounded ${statusBadge}`}>
                    {priority.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">{p.assigned_nurse_name ? p.assigned_nurse_name.split(' ')[1] || p.assigned_nurse_name : 'Queue'}</span>
                <div className="flex items-center gap-1">
                  {isPhysical && <span title="Physical ESP32 device"><Radio className="w-2.5 h-2.5 text-blue-400" /></span>}
                  {hasIvIssue && <span title="IV Task"><Droplets className="w-2.5 h-2.5 text-indigo-400" /></span>}
                  {p.active_alerts_count > 0 && <span title="Active Alert"><AlertCircle className="w-2.5 h-2.5 text-rose-400" /></span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
