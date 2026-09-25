import React, { useState, Suspense } from 'react';
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
import { LoginPage, LoginRole } from './pages/LoginPage';
import { PatientDetailModal } from './components/PatientDetailModal';
import { Patient } from './types';

// Lazy-load heavy portal pages for code-splitting (only loaded when user navigates to them)
const DoctorDashboardPage = React.lazy(() => import('./pages/DoctorDashboardPage').then(m => ({ default: m.DoctorDashboardPage })));
const PatientBedsidePage = React.lazy(() => import('./pages/PatientBedsidePage').then(m => ({ default: m.PatientBedsidePage })));
const ManagementDashboardPage = React.lazy(() => import('./pages/ManagementDashboardPage').then(m => ({ default: m.ManagementDashboardPage })));
const AdminPanelPage = React.lazy(() => import('./pages/AdminPanelPage').then(m => ({ default: m.AdminPanelPage })));

// Elegant loading fallback for lazy-loaded portals
const PortalLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <div className="text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center mx-auto mb-4 animate-float shadow-lg shadow-teal-500/20">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
      </div>
      <p className="text-sm font-semibold text-slate-600">Loading Portal...</p>
      <p className="text-xs text-slate-400 mt-1">Preparing your workspace</p>
    </div>
  </div>
);

export const App: React.FC = () => {
  const { patients, nurses, alerts, kpis, explanations, isConnected, simulationStatus } = useWebSocket();

  // Authentication State with localStorage session restoration
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('triagepulse_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isLoggedIn);
      }
    } catch (e) {}
    return false;
  });

  const [loggedInRole, setLoggedInRole] = useState<LoginRole>(() => {
    try {
      const saved = localStorage.getItem('triagepulse_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch (e) {}
    return 'nurse';
  });

  const [loggedInUser, setLoggedInUser] = useState<{ name: string; id: string }>(() => {
    try {
      const saved = localStorage.getItem('triagepulse_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user) return parsed.user;
      }
    } catch (e) {}
    return { name: '', id: '' };
  });

  const [currentPortal, setCurrentPortal] = useState<PortalType>(() => {
    try {
      const saved = localStorage.getItem('triagepulse_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role && parsed.role !== 'admin') return parsed.role as PortalType;
      }
    } catch (e) {}
    return 'nurse';
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<string>('Charge Nurse');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Initialize nurse specific shift view on reload
  React.useEffect(() => {
    if (loggedInRole === 'nurse') {
      if (loggedInUser.id === 'N01' || loggedInUser.name.toLowerCase().includes('sarah')) {
        setCurrentRole('Nurse A');
        setCurrentTab('my-patients');
      } else if (loggedInUser.id === 'N02' || loggedInUser.name.toLowerCase().includes('elena')) {
        setCurrentRole('Nurse B');
        setCurrentTab('my-patients');
      }
    }
  }, [loggedInRole, loggedInUser]);

  // Strict Role Guard: Ensure current portal strictly matches loggedInRole
  React.useEffect(() => {
    if (isLoggedIn && loggedInRole !== 'admin') {
      const expectedPortal = loggedInRole as PortalType;
      if (currentPortal !== expectedPortal) {
        setCurrentPortal(expectedPortal);
      }
    }
  }, [isLoggedIn, loggedInRole, currentPortal]);

  // Handle Login
  const handleLogin = (role: LoginRole, credentials: { name: string; id: string }) => {
    setLoggedInRole(role);
    setLoggedInUser(credentials);
    setIsLoggedIn(true);

    // Save session in localStorage for multi-device / refresh resilience
    try {
      localStorage.setItem('triagepulse_auth_session', JSON.stringify({
        isLoggedIn: true,
        role,
        user: credentials,
        savedAt: Date.now()
      }));
    } catch (e) {
      console.warn('Could not store session in localStorage', e);
    }

    // Auto-route strictly based on authenticated role
    if (role === 'admin') {
      // Admin goes to admin panel directly
    } else {
      const targetPortal = role as PortalType;
      setCurrentPortal(targetPortal);
      if (role === 'nurse') {
        if (credentials.id === 'N01' || credentials.name.toLowerCase().includes('sarah')) {
          setCurrentRole('Nurse A');
          setCurrentTab('my-patients');
        } else if (credentials.id === 'N02' || credentials.name.toLowerCase().includes('elena')) {
          setCurrentRole('Nurse B');
          setCurrentTab('my-patients');
        } else {
          setCurrentRole(credentials.name || 'Charge Nurse');
          setCurrentTab(credentials.name === 'Charge Nurse' ? 'dashboard' : 'my-patients');
        }
      }
    }
  };

  // Handle Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('triagepulse_auth_session');
    } catch (e) {}
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
  const codeBlueCount = patients.filter((p) => p.code_blue_active).length;

  // Show Login Page if not authenticated
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} isConnected={isConnected} />;
  }

  // Show Admin Panel if logged in as admin
  if (loggedInRole === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
        <SafetyBanner />
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div>
                  <span className="text-base font-bold text-slate-900">TriagePulse</span>
                  <span className="text-xs text-slate-500 ml-2">System Administration</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500">Signed in as <strong className="text-rose-600">{loggedInUser.name}</strong></span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<PortalLoader />}>
            <AdminPanelPage onLogout={handleLogout} />
          </Suspense>
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
          <p>
            <span className="font-semibold text-slate-700">TriagePulse</span> — System Administration Console
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Educational / Research Prototype Only • Not for Clinical Diagnosis, Medical Prescription, or Autonomous Equipment Control.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Prominent Safety Disclaimer */}
      <SafetyBanner />

      {/* Top Navigation with Multi-Role Portals */}
      <Navbar
        loggedInRole={loggedInRole}
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
        liveMode={simulationStatus.live_mode}
        activeAlertCount={alerts.length}
        pendingEscalationsCount={0}
        sosActiveCount={sosCount}
        codeBlueCount={codeBlueCount}
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area - Strictly Role-Guarded */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* DOCTOR CLINICAL PORTAL */}
        {loggedInRole === 'doctor' && (
          <Suspense fallback={<PortalLoader />}>
            <DoctorDashboardPage
              patients={patients}
              onSelectPatient={handleSelectPatient}
            />
          </Suspense>
        )}

        {/* PATIENT & FAMILY BEDSIDE COMPANION TABLET */}
        {loggedInRole === 'patient' && (
          <Suspense fallback={<PortalLoader />}>
            <PatientBedsidePage
              patients={patients}
              onSelectPatient={handleSelectPatient}
              loggedInPatientId={loggedInUser.id}
            />
          </Suspense>
        )}

        {/* HOSPITAL OPERATIONS & MANAGEMENT DASHBOARD */}
        {loggedInRole === 'management' && (
          <Suspense fallback={<PortalLoader />}>
            <ManagementDashboardPage
              patients={patients}
              nurses={nurses}
              onSelectPatient={handleSelectPatient}
            />
          </Suspense>
        )}

        {/* NURSE PORTAL (Tabs) */}
        {loggedInRole === 'nurse' && (
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
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <p>
          <span className="font-semibold text-slate-700">TriagePulse</span> — Trajectory-aware patient monitoring, IV oversight and capacity-aware nurse triage.
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Educational / Research Prototype Only • Not for Clinical Diagnosis, Medical Prescription, or Autonomous Equipment Control.
        </p>
      </footer>
    </div>
  );
};
