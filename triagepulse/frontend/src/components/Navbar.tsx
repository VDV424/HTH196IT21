import React, { useState } from 'react';
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
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sounds } from '../utils/audio';

export type PortalType = 'nurse' | 'doctor' | 'patient' | 'management';

interface NavbarProps {
  loggedInRole?: string;
  currentPortal: PortalType;
  setCurrentPortal: (portal: PortalType) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: string;
  setCurrentRole: (role: string) => void;
  isConnected: boolean;
  demoMode: boolean;
  liveMode: boolean;
  lastUpdate?: string;
  activeAlertCount: number;
  pendingEscalationsCount?: number;
  sosActiveCount?: number;
  codeBlueCount?: number;
  loggedInUser?: { name: string; id: string };
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  loggedInRole,
  currentPortal,
  setCurrentPortal,
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  isConnected,
  demoMode,
  liveMode,
  lastUpdate,
  activeAlertCount,
  pendingEscalationsCount = 0,
  sosActiveCount = 0,
  codeBlueCount = 0,
  loggedInUser,
  onLogout,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(sounds.enabled);

  const toggleSound = () => {
    sounds.enabled = !soundOn;
    setSoundOn(!soundOn);
    if (!soundOn) {
      sounds.playSuccessChime();
    }
  };

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
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">TriagePulse</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  SMART HOSPITAL
                </span>
                {codeBlueCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-red-600 to-rose-700 text-white animate-pulse shadow-md">
                    ⚡ {codeBlueCount} CODE BLUE
                  </span>
                )}
                {sosActiveCount > 0 && !codeBlueCount && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                    🚨 {sosActiveCount} SOS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Trajectory-Aware Triage & IV Oversight</p>
            </div>
          </div>

          {/* Active Role Console Banner - Strictly isolated per authenticated role (No unauthorized switching) */}
          <div className="flex items-center">
            {loggedInRole === 'nurse' && (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 shadow-sm text-teal-900">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                <User className="w-4 h-4 text-teal-700" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-tight">NURSE STATION CONSOLE</span>
                  <span className="text-[10px] text-teal-700 font-medium">Ward 4B • Telemetry Ingestion Active</span>
                </div>
              </div>
            )}

            {loggedInRole === 'doctor' && (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-violet-50 border border-violet-200/80 shadow-sm text-violet-900">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-pulse" />
                <Stethoscope className="w-4 h-4 text-violet-700" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-tight">ATTENDING PHYSICIAN PORTAL</span>
                  <span className="text-[10px] text-violet-700 font-medium">Clinical Rounds & Escalation Orders</span>
                </div>
              </div>
            )}

            {loggedInRole === 'patient' && (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200/80 shadow-sm text-cyan-900">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse" />
                <BedDouble className="w-4 h-4 text-cyan-700" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-tight">BEDSIDE COMPANION TABLET</span>
                  <span className="text-[10px] text-cyan-700 font-medium">Patient & Family Care Monitor</span>
                </div>
              </div>
            )}

            {loggedInRole === 'management' && (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-sm text-emerald-900">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <Building2 className="w-4 h-4 text-emerald-700" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-tight">EXECUTIVE OPERATIONS HUB</span>
                  <span className="text-[10px] text-emerald-700 font-medium">Capacity, Workload & Ward Analytics</span>
                </div>
              </div>
            )}
          </div>

          {/* System Status Indicators & Nurse Role Selector */}
          <div className="flex items-center gap-3">
            {/* Telemetry connection status */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-600 font-mono text-[11px]">{isConnected ? 'LIVE WS' : 'RECONNECTING'}</span>
            </div>

            {/* DEMO / LIVE Mode Indicator */}
            {liveMode ? (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE IoT
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                DEMO MODE
              </div>
            )}
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

            {/* Clinical Sound Chime Toggle */}
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${
                soundOn
                  ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={soundOn ? 'Clinical Audio Alarms Enabled (IEC 60601-1-8 standard)' : 'Audio Muted'}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5 text-teal-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundOn ? 'Audio ON' : 'Muted'}</span>
            </button>

            {/* Sub-role selector for Nurse */}
            {currentPortal === 'nurse' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                <User className="w-3.5 h-3.5 text-slate-500 ml-1" />
                {loggedInUser?.id === 'N01' ? (
                  <span className="text-xs font-semibold text-teal-800 px-2 py-0.5">Nurse Sarah (N01)</span>
                ) : loggedInUser?.id === 'N02' ? (
                  <span className="text-xs font-semibold text-teal-800 px-2 py-0.5">Nurse Elena (N02)</span>
                ) : (
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
                )}
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
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
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
                      ? 'bg-teal-50 text-teal-700 border border-teal-300 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-teal-600" />
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
