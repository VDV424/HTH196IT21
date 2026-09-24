import React from 'react';
import { 
  Activity, 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Bell, 
  BarChart3, 
  Settings, 
  Radio, 
  Cpu, 
  User,
  Stethoscope,
  BedDouble,
  Building2,
  LogOut
} from 'lucide-react';

export type PortalType = 'nurse' | 'doctor' | 'patient' | 'management';

interface NavbarProps {
  currentPortal: PortalType;
  setCurrentPortal: (portal: PortalType) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: string;
  setCurrentRole: (role: string) => void;
  isConnected: boolean;
  demoMode: boolean;
  lastUpdate?: string;
  activeAlertCount: number;
  pendingEscalationsCount?: number;
  sosActiveCount?: number;
  loggedInUser?: { name: string; id: string };
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPortal,
  setCurrentPortal,
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  isConnected,
  demoMode,
  lastUpdate,
  activeAlertCount,
  pendingEscalationsCount = 0,
  sosActiveCount = 0,
  loggedInUser,
  onLogout,
}) => {
  const nurseTabs = [
    { id: 'dashboard', label: 'Command Grid', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'allocation', label: 'Nurse Dispatch', icon: UserCheck },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: activeAlertCount > 0 ? activeAlertCount : null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isPersonalNurse = currentRole.startsWith('Nurse');

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar: Brand, Role Portals, and Hardware Status */}
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Activity className="h-5 w-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">TriagePulse</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-600 border border-teal-200">
                  MVP v1.0
                </span>
                {sosActiveCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-slate-900 animate-pulse">
                    🚨 {sosActiveCount} SOS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Trajectory-Aware Triage & IV Oversight</p>
            </div>
          </div>

          {/* Primary Role Switcher: Nurse / Doctor / Patient / Management */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner">
            {/* Nurse Portal */}
            <button
              onClick={() => setCurrentPortal('nurse')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentPortal === 'nurse'
                  ? 'bg-teal-600 text-slate-900 shadow-md shadow-teal-600/30'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Nurse</span>
            </button>

            {/* Doctor Portal */}
            <button
              onClick={() => setCurrentPortal('doctor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentPortal === 'doctor'
                  ? 'bg-violet-600 text-slate-900 shadow-md shadow-violet-600/30'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor</span>
              {pendingEscalationsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            {/* Patient Bedside Kiosk */}
            <button
              onClick={() => setCurrentPortal('patient')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentPortal === 'patient'
                  ? 'bg-teal-600 text-slate-900 shadow-md shadow-teal-600/30'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Patient Kiosk</span>
            </button>

            {/* Management Portal */}
            <button
              onClick={() => setCurrentPortal('management')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentPortal === 'management'
                  ? 'bg-emerald-600 text-slate-900 shadow-md shadow-emerald-600/30'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Operations</span>
            </button>
          </div>

          {/* System Status Indicators & Nurse Role Selector */}
          <div className="flex items-center gap-3">
            {/* Telemetry connection status */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-600 font-mono text-[11px]">{isConnected ? 'LIVE WS' : 'RECONNECTING'}</span>
            </div>

            {/* MQTT Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              <span>MQTT Ready</span>
            </div>

            {/* Hardware ESP32 Slots Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>3 ESP32 Slots</span>
            </div>

            {/* Sub-role selector for Nurse */}
            {currentPortal === 'nurse' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                <User className="w-3.5 h-3.5 text-slate-500 ml-1" />
                <select
                  value={currentRole}
                  onChange={(e) => {
                    setCurrentRole(e.target.value);
                    if (e.target.value !== 'Charge Nurse') {
                      setCurrentTab('my-patients');
                    } else {
                      setCurrentTab('dashboard');
                    }
                  }}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="Charge Nurse" className="bg-white text-slate-800">Charge Nurse (Command)</option>
                  <option value="Nurse A" className="bg-white text-slate-800">Nurse A (Critical)</option>
                  <option value="Nurse B" className="bg-white text-slate-800">Nurse B (Senior)</option>
                  <option value="Nurse C" className="bg-white text-slate-800">Nurse C (General)</option>
                </select>
              </div>
            )}

            {/* Logout Button */}
            {loggedInUser && onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
                title={`Signed in as ${loggedInUser.name}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Level Navigation: Only shown when Nurse Portal is active */}
        {currentPortal === 'nurse' && (
          <div className="flex items-center justify-between py-2 border-t border-slate-200/80 overflow-x-auto text-xs">
            <nav className="flex items-center gap-1">
              {nurseTabs.map((t) => {
                const Icon = t.icon;
                const isActive = currentTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setCurrentTab(t.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-slate-100 text-teal-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                    {t.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-slate-900">
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {isPersonalNurse && (
                <button
                  onClick={() => setCurrentTab('my-patients')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    currentTab === 'my-patients'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                      : 'text-emerald-400/90 hover:bg-emerald-950/40'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Shift ({currentRole})</span>
                </button>
              )}
            </nav>

            <span className="hidden md:inline text-[11px] text-slate-500">
              Ward 4B • Telemetry Ingestion Active
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
