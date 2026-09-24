import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Navbar, PortalType } from './components/Navbar';
import { SafetyBanner } from './components/SafetyBanner';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { NurseAllocationPage } from './pages/NurseAllocationPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NursePersonalPage } from './pages/NursePersonalPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { PatientBedsidePage } from './pages/PatientBedsidePage';
import { ManagementDashboardPage } from './pages/ManagementDashboardPage';
import { LoginPage, LoginRole } from './pages/LoginPage';
import { AdminPanelPage } from './pages/AdminPanelPage';
import { PatientDetailModal } from './components/PatientDetailModal';
import { Patient } from './types';

export const App: React.FC = () => {
  const { patients, nurses, alerts, kpis, explanations, isConnected, simulationStatus } = useWebSocket();

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInRole, setLoggedInRole] = useState<LoginRole>('nurse');
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; id: string }>({ name: '', id: '' });

  const [currentPortal, setCurrentPortal] = useState<PortalType>('nurse');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<string>('Charge Nurse');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Handle Login
  const handleLogin = (role: LoginRole, credentials: { name: string; id: string }) => {
    setLoggedInRole(role);
    setLoggedInUser(credentials);
    setIsLoggedIn(true);

    // Auto-route to the correct portal based on login role
    if (role === 'admin') {
      // Admin goes to admin panel directly
    } else {
      setCurrentPortal(role as PortalType);
      if (role === 'nurse') {
        setCurrentRole(credentials.name);
        setCurrentTab(credentials.name === 'Charge Nurse' ? 'dashboard' : 'my-patients');
      }
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInRole('nurse');
    setLoggedInUser({ name: '', id: '' });
    setCurrentPortal('nurse');
    setCurrentTab('dashboard');
    setCurrentRole('Charge Nurse');
    setSelectedPatient(null);
  };

  // When a patient is selected, open the modal
  const handleSelectPatient = (patient: Patient) => {
    // Keep it synced with the latest patient telemetry from state
    const latest = patients.find((p) => p.patient_id === patient.patient_id) || patient;
    setSelectedPatient(latest);
  };

  // Sync selected patient with streaming updates
  const activeSelectedPatient = selectedPatient
    ? patients.find((p) => p.patient_id === selectedPatient.patient_id) || selectedPatient
    : null;

  const sosCount = kpis?.sos_active_count || patients.filter((p) => p.sos_active).length;

  // Show Login Page if not authenticated
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} isConnected={isConnected} />;
  }

  // Show Admin Panel if logged in as admin
  if (loggedInRole === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <SafetyBanner />
        <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div>
                  <span className="text-base font-bold text-white">TriagePulse</span>
                  <span className="text-xs text-slate-400 ml-2">System Administration</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">Signed in as <strong className="text-rose-300">{loggedInUser.name}</strong></span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AdminPanelPage onLogout={handleLogout} />
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
          <p>
            <span className="font-semibold text-slate-400">TriagePulse</span> — System Administration Console
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            Educational / Research Prototype Only • Not for Clinical Diagnosis, Medical Prescription, or Autonomous Equipment Control.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Prominent Safety Disclaimer */}
      <SafetyBanner />

      {/* Top Navigation with Multi-Role Portals */}
      <Navbar
        currentPortal={currentPortal}
        setCurrentPortal={setCurrentPortal}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={(role) => {
          setCurrentRole(role);
          if (role !== 'Charge Nurse') {
            setCurrentTab('my-patients');
          } else {
            setCurrentTab('dashboard');
          }
        }}
        isConnected={isConnected}
        demoMode={simulationStatus.demo_mode}
        activeAlertCount={alerts.length}
        pendingEscalationsCount={0}
        sosActiveCount={sosCount}
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* DOCTOR CLINICAL PORTAL */}
        {currentPortal === 'doctor' && (
          <DoctorDashboardPage
            patients={patients}
            onSelectPatient={handleSelectPatient}
          />
        )}

        {/* PATIENT & FAMILY BEDSIDE COMPANION TABLET */}
        {currentPortal === 'patient' && (
          <PatientBedsidePage
            patients={patients}
            onSelectPatient={handleSelectPatient}
          />
        )}

        {/* HOSPITAL OPERATIONS & MANAGEMENT DASHBOARD */}
        {currentPortal === 'management' && (
          <ManagementDashboardPage
            patients={patients}
            nurses={nurses}
            onSelectPatient={handleSelectPatient}
          />
        )}

        {/* NURSE PORTAL (Tabs) */}
        {currentPortal === 'nurse' && (
          <>
            {currentTab === 'dashboard' && (
              <DashboardPage
                patients={patients}
                kpis={kpis}
                onSelectPatient={handleSelectPatient}
                isRunning={simulationStatus.is_running}
                speed={simulationStatus.speed}
                demoMode={simulationStatus.demo_mode}
              />
            )}

            {currentTab === 'patients' && (
              <PatientsPage
                patients={patients}
                onSelectPatient={handleSelectPatient}
              />
            )}

            {currentTab === 'allocation' && (
              <NurseAllocationPage
                nurses={nurses}
                explanations={explanations}
                patients={patients}
                onSelectPatient={handleSelectPatient}
              />
            )}

            {currentTab === 'alerts' && (
              <AlertsPage
                alerts={alerts}
                patients={patients}
                onSelectPatient={handleSelectPatient}
                rawObservationsCount={kpis?.total_raw_observations || 0}
                alertCompressionRatio={kpis?.alert_compression_ratio || 0}
              />
            )}

            {currentTab === 'analytics' && <AnalyticsPage />}

            {currentTab === 'settings' && <SettingsPage />}

            {currentTab === 'my-patients' && (
              <NursePersonalPage
                currentNurseName={currentRole}
                nurses={nurses}
                patients={patients}
                alerts={alerts}
                onSelectPatient={handleSelectPatient}
              />
            )}
          </>
        )}
      </main>

      {/* Patient Bedside Detail Modal with Live Charts & Decomposition */}
      <PatientDetailModal
        patient={activeSelectedPatient}
        onClose={() => setSelectedPatient(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          <span className="font-semibold text-slate-400">TriagePulse</span> — Trajectory-aware patient monitoring, IV oversight and capacity-aware nurse triage.
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Educational / Research Prototype Only • Not for Clinical Diagnosis, Medical Prescription, or Autonomous Equipment Control.
        </p>
      </footer>
    </div>
  );
};
