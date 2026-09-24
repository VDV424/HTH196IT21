import React from 'react';
import { Patient, KPIs } from '../types';
import { KPICards } from '../components/KPICards';
import { WardRoomMap } from '../components/WardRoomMap';
import { PatientQueue } from '../components/PatientQueue';
import { DemoControls } from '../components/DemoControls';
import { Activity, Clock } from 'lucide-react';

interface DashboardPageProps {
  patients: Patient[];
  kpis: KPIs | null;
  onSelectPatient: (patient: Patient) => void;
  isRunning: boolean;
  speed: number;
  demoMode: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  patients,
  kpis,
  onSelectPatient,
  isRunning,
  speed,
  demoMode,
}) => {
  const criticalCount = patients.filter(p => p.trajectory.attention_priority > 70).length;
  const sosCount = patients.filter(p => p.sos_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 animate-float">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Command Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">Real-time ward overview & triage priority queue</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sosCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold animate-sos">
              🚨 {sosCount} SOS Active
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              ⚠️ {criticalCount} Critical
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Demo Controls Bar */}
      <DemoControls isRunning={isRunning} speed={speed} demoModeActive={demoMode} />

      {/* Top 8 KPI Cards */}
      <KPICards kpis={kpis} />

      {/* Ward Room Map */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <WardRoomMap patients={patients} onSelectPatient={onSelectPatient} />
      </div>

      {/* Dynamic Patient Attention Priority Queue */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <PatientQueue patients={patients} onSelectPatient={onSelectPatient} />
      </div>
    </div>
  );
};
