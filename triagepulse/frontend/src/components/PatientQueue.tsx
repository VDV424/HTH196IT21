import React from 'react';
import { Patient } from '../types';
import { ArrowUpRight, ArrowRight, ArrowDownRight, Droplets, ExternalLink, Cpu, Radio, ShieldAlert } from 'lucide-react';

interface PatientQueueProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const PatientQueue: React.FC<PatientQueueProps> = ({ patients, onSelectPatient }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Dynamic Patient Attention Priority Queue</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-teal-600 font-mono">
              Auto-Sorted by P(t)
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time multi-vital trajectory ranking with capacity-aware nurse triage
          </p>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Active queue size:</span>
          <span className="font-semibold text-slate-900">{patients.length} patients</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-3">Attention State</th>
              <th className="py-3 px-3">HR (bpm)</th>
              <th className="py-3 px-3">SpO₂ (%)</th>
              <th className="py-3 px-3">Temp (°C)</th>
              <th className="py-3 px-3">Trajectory</th>
              <th className="py-3 px-3">Deterioration D(t)</th>
              <th className="py-3 px-3">IV Task U(t)</th>
              <th className="py-3 px-3 font-bold text-teal-600">Attention P(t)</th>
              <th className="py-3 px-3">Assigned Nurse</th>
              <th className="py-3 px-3">Signal</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {patients.map((p) => {
              const priority = p.trajectory.attention_priority;
              const det = p.trajectory.deterioration_score;
              const ivScore = p.trajectory.iv_urgency_score;
              const isPhysical = p.data_source === 'PHYSICAL_DEVICE';

              // Priority Level formatting
              let stateBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              let stateLabel = 'Stable Trajectory';
              let rowHighlight = 'hover:bg-slate-100/40';

              if (priority >= 75) {
                stateBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse';
                stateLabel = 'Immediate Review';
                rowHighlight = 'bg-rose-950/20 hover:bg-rose-950/30';
              } else if (priority >= 60) {
                stateBadge = 'bg-rose-500/15 text-rose-400 border-rose-500/40';
                stateLabel = 'High Attention';
                rowHighlight = 'bg-rose-950/10 hover:bg-rose-950/20';
              } else if (priority >= 45) {
                stateBadge = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
                stateLabel = 'Review Needed';
                rowHighlight = 'hover:bg-slate-100/40';
              } else if (priority >= 30) {
                stateBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                stateLabel = 'Watch';
                rowHighlight = 'hover:bg-slate-100/40';
              }

              // Trajectory icon
              const isWorsening = p.trajectory.trajectory_state === 'WORSENING';
              const isImproving = p.trajectory.trajectory_state === 'IMPROVING';

              return (
                <tr key={p.patient_id} className={`transition-colors duration-150 ${rowHighlight}`}>
                  {/* Patient ID & Room */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="font-sans font-bold text-sm text-slate-900">{p.patient_id}</div>
                      <span className="text-[10px] text-slate-500 font-sans">({p.room})</span>
                      {isPhysical && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold">
                          <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                          {p.device_id || 'IoT Gateway'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans truncate max-w-[140px]">{p.scenario}</div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border font-sans ${stateBadge}`}>
                      {stateLabel}
                    </span>
                  </td>

                  {/* Heart Rate */}
                  <td className="py-3 px-3 text-slate-700">
                    <span className={`font-semibold ${p.current_vitals.heart_rate > 105 ? 'text-rose-400' : 'text-slate-700'}`}>
                      {p.current_vitals.signal_quality === 'MISSING' ? '--' : p.current_vitals.heart_rate.toFixed(0)}
                    </span>
                  </td>

                  {/* SpO2 */}
                  <td className="py-3 px-3 text-slate-700">
                    <span className={`font-semibold ${p.current_vitals.spo2 < 93 && p.current_vitals.spo2 > 0 ? 'text-rose-400' : 'text-slate-700'}`}>
                      {p.current_vitals.signal_quality === 'MISSING' ? '--' : `${p.current_vitals.spo2.toFixed(0)}%`}
                    </span>
                  </td>

                  {/* Temperature */}
                  <td className="py-3 px-3 text-slate-700">
                    <span className={`font-semibold ${p.current_vitals.temperature > 37.8 ? 'text-amber-400' : 'text-slate-700'}`}>
                      {p.current_vitals.signal_quality === 'MISSING' ? '--' : `${p.current_vitals.temperature.toFixed(1)}°C`}
                    </span>
                  </td>

                  {/* Trajectory */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 font-sans">
                      {isWorsening ? (
                        <span className="flex items-center gap-1 text-rose-400 font-medium">
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                          Worsening
                        </span>
                      ) : isImproving ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                          Improving
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          Stable
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Deterioration Score */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${det >= 60 ? 'text-rose-400' : det >= 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {det.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans">({p.trajectory.physiological_level})</span>
                    </div>
                  </td>

                  {/* IV Urgency */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <Droplets className={`w-3 h-3 ${ivScore >= 60 ? 'text-violet-600 animate-bounce' : 'text-slate-500'}`} />
                      <span className={`font-semibold ${ivScore >= 60 ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {p.current_iv.iv_state === 'NEAR_EMPTY' ? 'Near-Empty' : p.current_iv.iv_state === 'NO_FLOW' ? 'No-Flow' : `${p.current_iv.iv_remaining_ml.toFixed(0)} mL`}
                      </span>
                    </div>
                  </td>

                  {/* Overall Attention Priority */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${priority >= 70 ? 'bg-rose-500' : priority >= 50 ? 'bg-orange-500' : priority >= 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(100, priority)}%` }}
                        />
                      </div>
                      <span className="font-bold text-sm text-cyan-300">{priority.toFixed(0)}</span>
                    </div>
                  </td>

                  {/* Assigned Nurse */}
                  <td className="py-3 px-3 font-sans">
                    {p.assigned_nurse_name && p.assigned_nurse_name !== 'Unassigned' ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-300">
                        {p.assigned_nurse_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 text-[11px] border border-rose-800/40 font-semibold">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        Unassigned (Queue)
                      </span>
                    )}
                  </td>

                  {/* Signal Quality */}
                  <td className="py-3 px-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans uppercase font-semibold ${
                      p.current_vitals.signal_quality === 'GOOD'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : p.current_vitals.signal_quality === 'NOISY'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        : p.current_vitals.signal_quality === 'MOTION_ARTIFACT'
                        ? 'bg-emerald-50/60 text-emerald-600 border border-emerald-200/40'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                    }`}>
                      {p.current_vitals.signal_quality}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectPatient(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-teal-600 text-slate-700 hover:text-slate-900 font-sans font-medium text-xs transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
