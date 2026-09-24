import React from 'react';
import { Nurse, AllocationExplanation, Patient } from '../types';
import { UserCheck, ShieldCheck, AlertTriangle, MapPin, Award, CheckCircle, AlertOctagon, HelpCircle } from 'lucide-react';

interface NurseAllocationPageProps {
  nurses: Nurse[];
  explanations: AllocationExplanation[];
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const NurseAllocationPage: React.FC<NurseAllocationPageProps> = ({
  nurses,
  explanations,
  patients,
  onSelectPatient,
}) => {
  // Map of patient ID -> Patient object for quick lookup
  const patientMap = new Map(patients.map((p) => [p.patient_id, p]));

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            Capacity-Aware Nurse Triage & Allocation Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic load-balancing considering clinical attention priority, capability matching, ward proximity, and strict workload quotas (Max {nurses[0]?.max_capacity || 5} patients/nurse).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Nurses</span>
            <span className="font-bold text-slate-900">{nurses.length} on duty</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Available Slots</span>
            <span className="font-bold text-teal-600">
              {nurses.reduce((acc, n) => acc + n.available_capacity, 0)} capacity margin
            </span>
          </div>
        </div>
      </div>

      {/* Section 12: NURSE CAPACITY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {nurses.map((nurse) => {
          const isAtCapacity = nurse.available_capacity === 0;
          const assignedPatients = nurse.assigned_patients
            .map((pid) => patientMap.get(pid))
            .filter((p): p is Patient => p !== undefined);

          return (
            <div
              key={nurse.nurse_id}
              className={`rounded-xl border p-5 transition-all duration-200 bg-white flex flex-col justify-between ${
                isAtCapacity
                  ? 'border-amber-500/50 shadow-lg shadow-amber-950/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{nurse.name}</h3>
                      <span className="text-xs text-slate-500 font-mono">({nurse.nurse_id})</span>
                    </div>
                    <p className="text-xs text-teal-600 font-medium">{nurse.role}</p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{nurse.ward}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    isAtCapacity
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {nurse.status}
                  </span>
                </div>

                {/* Workload Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Workload Utilization</span>
                    <span className="font-mono font-bold text-slate-900">
                      {nurse.assigned_count} / {nurse.max_capacity} beds ({nurse.workload_percent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 rounded-full h-2.5 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        nurse.workload_percent >= 100
                          ? 'bg-amber-500'
                          : nurse.workload_percent >= 70
                          ? 'bg-teal-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, nurse.workload_percent)}%` }}
                    />
                  </div>
                </div>

                {/* Core Capabilities */}
                <div className="mt-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Specialized Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {nurse.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Active Assigned Patient Badges */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Assigned Patients ({nurse.assigned_count}):</span>
                    {nurse.high_priority_count > 0 && (
                      <span className="text-rose-400 font-bold">
                        {nurse.high_priority_count} High Priority
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {assignedPatients.map((p) => {
                      const pri = p.trajectory.attention_priority;
                      return (
                        <button
                          key={p.patient_id}
                          onClick={() => onSelectPatient(p)}
                          className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 flex items-center justify-between text-xs text-left transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900 mr-1.5">{p.patient_id}</span>
                            <span className="text-slate-500 text-[11px]">({p.room})</span>
                            <span className="text-[10px] text-slate-500 ml-2 truncate max-w-[120px] inline-block">
                              {p.scenario}
                            </span>
                          </div>
                          <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                            pri >= 60 ? 'bg-rose-500/20 text-rose-300' : pri >= 35 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            P: {pri.toFixed(0)}
                          </span>
                        </button>
                      );
                    })}
                    {assignedPatients.length === 0 && (
                      <p className="text-xs text-slate-500 italic py-2 text-center">No active beds assigned (Available for triage)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Availability Status */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Available Margin:</span>
                <span className="font-semibold text-teal-600 font-mono">
                  {nurse.available_capacity} bed slot{nurse.available_capacity !== 1 ? 's' : ''} left
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 13: DYNAMIC ALLOCATION EXPLANATION FEED */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-teal-600" />
              Allocation Decision Explanations ("Why was patient assigned to this nurse?")
            </h3>
            <p className="text-xs text-slate-500">
              Explainable transparent reasoning generated for every automated triage decision
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {explanations.length} Active Decisions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {explanations.map((exp) => {
            const isOverflow = exp.nurse_id === 'UNASSIGNED';
            return (
              <div
                key={exp.patient_id}
                className={`p-3.5 rounded-lg border text-xs ${
                  isOverflow
                    ? 'bg-rose-950/20 border-rose-500/50'
                    : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono">{exp.patient_id}</span>
                    <span className="text-slate-500">→</span>
                    <span className={`font-semibold ${isOverflow ? 'text-rose-400' : 'text-teal-600'}`}>
                      {exp.nurse_name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    exp.priority_level === 'HIGH' || isOverflow
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {exp.priority_level}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                  {exp.reason}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
