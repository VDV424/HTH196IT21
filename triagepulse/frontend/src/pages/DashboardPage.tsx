import React from 'react';
import { Patient, KPIs } from '../types';
import { KPICards } from '../components/KPICards';
import { WardRoomMap } from '../components/WardRoomMap';
import { PatientQueue } from '../components/PatientQueue';
import { DemoControls } from '../components/DemoControls';

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
  return (
    <div className="space-y-6">
      {/* Demo Controls Bar */}
      <DemoControls isRunning={isRunning} speed={speed} demoModeActive={demoMode} />

      {/* Top 6 KPI Cards */}
      <KPICards kpis={kpis} />

      {/* Ward Room Map */}
      <WardRoomMap patients={patients} onSelectPatient={onSelectPatient} />

      {/* Dynamic Patient Attention Priority Queue */}
      <PatientQueue patients={patients} onSelectPatient={onSelectPatient} />
    </div>
  );
};
