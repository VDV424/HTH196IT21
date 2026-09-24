import React, { useState, useEffect } from 'react';
import {
  Shield,
  Hospital,
  Palette,
  Users,
  Monitor,
  Wifi,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  Building2,
  Bell,
  Cpu,
  Radio,
  Settings,
  MapPin,
  Bed,
  AlertTriangle,
  Globe,
  Clock,
  Zap,
  Sliders,
  ChevronRight,
  Heart,
  Activity,
  Eye,
  Lock,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface AdminPanelPageProps {
  onLogout: () => void;
}

interface HospitalConfig {
  hospitalName: string;
  department: string;
  wardName: string;
  floorNumber: string;
  primaryColor: string;
  accentColor: string;
  logoText: string;
  totalBeds: number;
  maxNurses: number;
  shiftDuration: string;
  mqttBroker: string;
  mqttPort: number;
  esp32Count: number;
  alertThresholds: {
    hr_high: number;
    hr_low: number;
    spo2_critical: number;
    temp_high: number;
    iv_low_ml: number;
  };
  slaConfig: {
    sos_response_min: number;
    tier1_ack_min: number;
    iv_replacement_min: number;
  };
  displaySettings: {
    darkMode: boolean;
    animationsEnabled: boolean;
    refreshRateSec: number;
    soundsEnabled: boolean;
    showPatientNames: boolean;
  };
}

const defaultConfig: HospitalConfig = {
  hospitalName: 'TriagePulse General Hospital',
  department: 'Critical Care Unit',
  wardName: 'Ward 4B',
  floorNumber: '4th Floor — West Wing',
  primaryColor: '#0891b2',
  accentColor: '#6366f1',
  logoText: 'TriagePulse',
  totalBeds: 20,
  maxNurses: 4,
  shiftDuration: '12 hrs (Day: 07:00–19:00 | Night: 19:00–07:00)',
  mqttBroker: 'mqtt://192.168.1.100',
  mqttPort: 1883,
  esp32Count: 3,
  alertThresholds: {
    hr_high: 130,
    hr_low: 45,
    spo2_critical: 88,
    temp_high: 39.5,
    iv_low_ml: 50,
  },
  slaConfig: {
    sos_response_min: 2,
    tier1_ack_min: 5,
    iv_replacement_min: 15,
  },
  displaySettings: {
    darkMode: true,
    animationsEnabled: true,
    refreshRateSec: 2,
    soundsEnabled: true,
    showPatientNames: true,
  },
};

export const AdminPanelPage: React.FC<AdminPanelPageProps> = ({ onLogout }) => {
  const [config, setConfig] = useState<HospitalConfig>(defaultConfig);
  const [activeSection, setActiveSection] = useState('identity');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // User Accounts & Approvals State
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const list = await api.getAdminUsers();
      setUserAccounts(list);
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprove = async (username: string) => {
    try {
      await api.approveUser(username);
      setUserActionMessage(`✅ Approved '${username}'. User can now log in.`);
      setTimeout(() => setUserActionMessage(null), 4000);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async (username: string) => {
    try {
      await api.rejectUser(username);
      setUserActionMessage(`User '${username}' registration declined.`);
      setTimeout(() => setUserActionMessage(null), 4000);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`Permanently remove account for '${username}'?`)) return;
    try {
      await api.deleteUser(username);
      setUserActionMessage(`Deleted user '${username}'.`);
      setTimeout(() => setUserActionMessage(null), 4000);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const pendingUsers = userAccounts.filter((u) => u.status === 'PENDING');
  const activeUsers = userAccounts.filter((u) => u.status !== 'PENDING');

  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const parts = path.split('.');
      const newConfig = { ...prev };
      let obj: any = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return newConfig;
    });
    setUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    await new Promise((r) => setTimeout(r, 1500));
    setSaveStatus('saved');
    setUnsavedChanges(false);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setUnsavedChanges(false);
  };

  const sections = [
    { id: 'identity', label: 'Hospital Identity', icon: Hospital, color: 'cyan' },
    { id: 'branding', label: 'Branding & Theme', icon: Palette, color: 'purple' },
    { id: 'ward', label: 'Ward Configuration', icon: Bed, color: 'teal' },
    { id: 'hardware', label: 'IoT & Hardware', icon: Cpu, color: 'blue' },
    { id: 'alerts', label: 'Alert Thresholds', icon: AlertTriangle, color: 'amber' },
    { id: 'sla', label: 'SLA Policies', icon: Clock, color: 'emerald' },
    { id: 'display', label: 'Display Settings', icon: Monitor, color: 'indigo' },
    { id: 'users', label: 'Staff Management', icon: Users, color: 'rose' },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'text-teal-600 bg-teal-500/10 border-teal-200',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-800',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-800',
    blue: 'text-emerald-600 bg-emerald-500/10 border-emerald-200',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-800',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-800',
    indigo: 'text-violet-600 bg-violet-500/10 border-violet-200',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-800',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 border border-slate-200 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Shield className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">System Administration</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Complete control over hospital branding, ward setup, IoT hardware, alert policies, and system personalization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unsavedChanges && (
            <span className="text-[10px] text-amber-400 font-semibold px-2 py-1 bg-amber-950/60 rounded-lg border border-amber-800">
              Unsaved Changes
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-slate-900 shadow-md shadow-teal-500/20 hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Navigation */}
        <div className="space-y-1.5 bg-white/60 border border-slate-200 rounded-2xl p-4 h-fit shadow-lg">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2 pb-2">Sections</p>
          {sections.map((s) => {
            const SIcon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? `bg-slate-100 text-slate-900 shadow-sm`
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <SIcon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-500'}`} />
                <span className="flex-1 text-left">{s.label}</span>
                {s.id === 'users' && pendingUsers.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-900 animate-pulse">
                    {pendingUsers.length}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-200">
            <button
              onClick={onLogout}
              className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/60 transition-all flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Right Content: Config Panels */}
        <div className="lg:col-span-3 space-y-6">
          {/* Hospital Identity */}
          {activeSection === 'identity' && (
            <SectionCard title="Hospital Identity" icon={Hospital} color="cyan" description="Core hospital and department information displayed across all portals.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Hospital Name" value={config.hospitalName} onChange={(v) => updateConfig('hospitalName', v)} />
                <InputField label="Department" value={config.department} onChange={(v) => updateConfig('department', v)} />
                <InputField label="Ward Name" value={config.wardName} onChange={(v) => updateConfig('wardName', v)} />
                <InputField label="Floor / Location" value={config.floorNumber} onChange={(v) => updateConfig('floorNumber', v)} />
              </div>
              <div className="mt-5 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-500 mb-2">Preview — Header Bar</h4>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-slate-900" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900">{config.logoText}</span>
                    <p className="text-[10px] text-slate-500">{config.wardName} • {config.department}</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Branding */}
          {activeSection === 'branding' && (
            <SectionCard title="Branding & Theme" icon={Palette} color="purple" description="Customize the visual identity — colors, logo text, and accent palette used system-wide.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Logo Text" value={config.logoText} onChange={(v) => updateConfig('logoText', v)} />
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.primaryColor} onChange={(e) => updateConfig('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer bg-transparent" />
                    <span className="text-xs text-slate-600 font-mono">{config.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.accentColor} onChange={(e) => updateConfig('accentColor', e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer bg-transparent" />
                    <span className="text-xs text-slate-600 font-mono">{config.accentColor}</span>
                  </div>
                </div>
              </div>
              {/* Color Preview */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200" style={{ background: config.primaryColor + '20' }}>
                  <div className="h-6 w-full rounded-lg mb-2" style={{ background: config.primaryColor }} />
                  <span className="text-[10px] text-slate-500">Primary</span>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200" style={{ background: config.accentColor + '20' }}>
                  <div className="h-6 w-full rounded-lg mb-2" style={{ background: config.accentColor }} />
                  <span className="text-[10px] text-slate-500">Accent</span>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                  <div className="h-6 w-full rounded-lg mb-2 bg-slate-100" />
                  <span className="text-[10px] text-slate-500">Background</span>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Ward Configuration */}
          {activeSection === 'ward' && (
            <SectionCard title="Ward Configuration" icon={Bed} color="teal" description="Define bed capacity, nurse staffing ratio, and shift schedules for this ward.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberField label="Total Beds" value={config.totalBeds} onChange={(v) => updateConfig('totalBeds', v)} min={4} max={50} />
                <NumberField label="Max Nurses per Shift" value={config.maxNurses} onChange={(v) => updateConfig('maxNurses', v)} min={1} max={10} />
                <InputField label="Shift Duration / Schedule" value={config.shiftDuration} onChange={(v) => updateConfig('shiftDuration', v)} />
              </div>
              <div className="mt-5 p-4 rounded-2xl bg-teal-950/30 border border-teal-800/40 text-xs text-teal-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>Nurse-to-Patient Ratio: <strong>1:{Math.ceil(config.totalBeds / config.maxNurses)}</strong> — {config.totalBeds / config.maxNurses <= 5 ? 'Within recommended limits' : '⚠️ Consider adding more nurses'}</span>
              </div>
            </SectionCard>
          )}

          {/* IoT & Hardware */}
          {activeSection === 'hardware' && (
            <SectionCard title="IoT & Hardware Configuration" icon={Cpu} color="blue" description="MQTT broker settings, ESP32 device slots, and telemetry ingestion configuration.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="MQTT Broker Address" value={config.mqttBroker} onChange={(v) => updateConfig('mqttBroker', v)} />
                <NumberField label="MQTT Port" value={config.mqttPort} onChange={(v) => updateConfig('mqttPort', v)} min={1} max={65535} />
                <NumberField label="ESP32 Device Slots" value={config.esp32Count} onChange={(v) => updateConfig('esp32Count', v)} min={1} max={20} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {Array.from({ length: config.esp32Count }, (_, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 block">ESP32-{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[9px] text-slate-500">Patient P{String(i + 1).padStart(2, '0')} bound</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Alert Thresholds */}
          {activeSection === 'alerts' && (
            <SectionCard title="Clinical Alert Thresholds" icon={AlertTriangle} color="amber" description="Define the vital sign boundaries that trigger clinical alerts. Exceeding these values creates a new alert episode.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberField label="Heart Rate — High (bpm)" value={config.alertThresholds.hr_high} onChange={(v) => updateConfig('alertThresholds.hr_high', v)} min={90} max={200} />
                <NumberField label="Heart Rate — Low (bpm)" value={config.alertThresholds.hr_low} onChange={(v) => updateConfig('alertThresholds.hr_low', v)} min={30} max={60} />
                <NumberField label="SpO₂ — Critical (%)" value={config.alertThresholds.spo2_critical} onChange={(v) => updateConfig('alertThresholds.spo2_critical', v)} min={70} max={95} />
                <NumberField label="Temperature — High (°C)" value={config.alertThresholds.temp_high} onChange={(v) => updateConfig('alertThresholds.temp_high', v)} min={37.5} max={42} step={0.1} />
                <NumberField label="IV Bag — Low (ml)" value={config.alertThresholds.iv_low_ml} onChange={(v) => updateConfig('alertThresholds.iv_low_ml', v)} min={10} max={200} />
              </div>
              <div className="mt-5 p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>These thresholds apply to the trajectory engine. The alarm-fatigue compression system will still batch raw observations into clinical episodes to reduce noise.</span>
              </div>
            </SectionCard>
          )}

          {/* SLA Policies */}
          {activeSection === 'sla' && (
            <SectionCard title="SLA & Response Policies" icon={Clock} color="emerald" description="Service Level Agreements for nurse response times. These define the performance benchmarks shown on the Operations dashboard.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NumberField label="SOS Response Target (min)" value={config.slaConfig.sos_response_min} onChange={(v) => updateConfig('slaConfig.sos_response_min', v)} min={1} max={10} />
                <NumberField label="Tier-1 Acknowledge (min)" value={config.slaConfig.tier1_ack_min} onChange={(v) => updateConfig('slaConfig.tier1_ack_min', v)} min={1} max={15} />
                <NumberField label="IV Replacement (min)" value={config.slaConfig.iv_replacement_min} onChange={(v) => updateConfig('slaConfig.iv_replacement_min', v)} min={5} max={30} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <SLACard label="SOS Response" value={`< ${config.slaConfig.sos_response_min} min`} status="green" />
                <SLACard label="Deterioration Ack" value={`< ${config.slaConfig.tier1_ack_min} min`} status="green" />
                <SLACard label="IV Replacement" value={`< ${config.slaConfig.iv_replacement_min} min`} status="yellow" />
              </div>
            </SectionCard>
          )}

          {/* Display Settings */}
          {activeSection === 'display' && (
            <SectionCard title="Display & UI Settings" icon={Monitor} color="indigo" description="Control visual behavior, animation preferences, data refresh rates, and privacy settings.">
              <div className="space-y-4">
                <ToggleField label="Dark Mode" description="Use dark theme across all portals" value={config.displaySettings.darkMode} onChange={(v) => updateConfig('displaySettings.darkMode', v)} />
                <ToggleField label="Animations" description="Enable micro-animations and transitions" value={config.displaySettings.animationsEnabled} onChange={(v) => updateConfig('displaySettings.animationsEnabled', v)} />
                <ToggleField label="Audio Alerts" description="Enable sound notifications for SOS and critical alerts" value={config.displaySettings.soundsEnabled} onChange={(v) => updateConfig('displaySettings.soundsEnabled', v)} />
                <ToggleField label="Show Patient Names" description="Display real patient names (disable for privacy)" value={config.displaySettings.showPatientNames} onChange={(v) => updateConfig('displaySettings.showPatientNames', v)} />
                <NumberField label="Data Refresh Rate (seconds)" value={config.displaySettings.refreshRateSec} onChange={(v) => updateConfig('displaySettings.refreshRateSec', v)} min={1} max={30} />
              </div>
            </SectionCard>
          )}

          {/* Staff Management & User Approvals */}
          {activeSection === 'users' && (
            <SectionCard title="Staff & User Management" icon={Users} color="rose" description="Review and approve new clinical sign-ups, authorize roles, and manage hospital system credentials.">
              {/* Action Message Toast */}
              {userActionMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{userActionMessage}</span>
                </div>
              )}

              {/* Status Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Total Registered</span>
                  <span className="text-xl font-extrabold text-slate-800">{userAccounts.length}</span>
                </div>
                <div className={`p-3.5 rounded-xl border text-center ${
                  pendingUsers.length > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm ring-1 ring-amber-300'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block mb-1">Awaiting Approval</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xl font-extrabold">{pendingUsers.length}</span>
                    {pendingUsers.length > 0 && <Clock className="w-4 h-4 text-amber-600 animate-spin" />}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Active / Approved</span>
                  <span className="text-xl font-extrabold text-emerald-700">{activeUsers.length}</span>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Account Registry</h3>
                  <span className="text-[11px] text-slate-500">• {userAccounts.length} Total</span>
                </div>
                <button
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* ── 1. PENDING APPROVALS QUEUE ──────────────────────────── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Pending Sign-ups Requiring Admin Approval ({pendingUsers.length})
                  </h4>
                  {pendingUsers.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                      Action Required
                    </span>
                  )}
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="p-5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    <span className="font-semibold block text-slate-700">No Pending Approvals</span>
                    <span>All submitted user sign-ups have been authorized or reviewed.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((user) => (
                      <div
                        key={user.username}
                        className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-slate-900 font-bold text-sm shadow-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{user.username}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {user.role.toUpperCase()}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                PENDING APPROVAL
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Registered: {new Date(user.registered_at).toLocaleString()} • Needs Administrator Sign-off
                            </span>
                          </div>
                        </div>

                        {/* Approval Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleApprove(user.username)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Approve Access
                          </button>
                          <button
                            onClick={() => handleReject(user.username)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs transition-all flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 2. AUTHORIZED & ACTIVE ACCOUNTS ─────────────────────── */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Authorized Staff & Active Accounts ({activeUsers.length})
                </h4>

                <div className="space-y-2.5">
                  {activeUsers.map((user) => (
                    <div
                      key={user.username}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-slate-900 font-bold text-xs shadow-sm ${
                          user.role === 'doctor'
                            ? 'bg-gradient-to-br from-violet-500 to-purple-500'
                            : user.role === 'admin'
                            ? 'bg-gradient-to-br from-rose-500 to-pink-500'
                            : user.role === 'management'
                            ? 'bg-gradient-to-br from-emerald-500 to-green-500'
                            : 'bg-gradient-to-br from-teal-500 to-emerald-500'
                        }`}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{user.username}</span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              {user.role}
                            </span>
                            {user.status === 'APPROVED' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ACTIVE
                              </span>
                            )}
                            {user.status === 'REJECTED' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                DECLINED
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {user.approved_by ? `Authorized by ${user.approved_by}` : 'Pre-configured'} • Registered: {new Date(user.registered_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {user.username !== 'admin' && (
                          <button
                            onClick={() => handleDelete(user.username)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Notice */}
              <div className="mt-5 p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-900 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">Hospital Security Policy</span>
                  Every user registration is subjected to mandatory System Administrator sign-off before credential issuance. System Administrator console logins are restricted to local hospital workstations for HIPAA/GDPR clinical compliance.
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Reusable Sub-components ----

const SectionCard: React.FC<{
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, color, description, children }) => {
  const colorClasses: Record<string, string> = {
    cyan: 'from-teal-600 to-emerald-500 shadow-teal-500/20',
    purple: 'from-purple-600 to-pink-500 shadow-purple-500/20',
    teal: 'from-teal-600 to-emerald-500 shadow-teal-500/20',
    blue: 'from-emerald-600 to-emerald-500 shadow-emerald-500/20',
    amber: 'from-amber-600 to-orange-500 shadow-amber-500/20',
    emerald: 'from-emerald-600 to-green-500 shadow-emerald-500/20',
    indigo: 'from-violet-600 to-violet-500 shadow-violet-500/20',
    rose: 'from-rose-600 to-pink-500 shadow-rose-500/20',
  };

  return (
    <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${colorClasses[color]}`} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

const InputField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600 transition-colors"
    />
  </div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }> = ({
  label, value, onChange, min, max, step = 1
}) => (
  <div>
    <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-600 transition-colors"
    />
  </div>
);

const ToggleField: React.FC<{ label: string; description: string; value: boolean; onChange: (v: boolean) => void }> = ({
  label, description, value, onChange
}) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
    <div>
      <span className="text-xs font-bold text-slate-900">{label}</span>
      <span className="text-[10px] text-slate-500 block">{description}</span>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all relative ${
        value ? 'bg-teal-600' : 'bg-slate-200'
      }`}
    >
      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
        value ? 'left-[26px]' : 'left-0.5'
      }`} />
    </button>
  </div>
);

const SLACard: React.FC<{ label: string; value: string; status: 'green' | 'yellow' | 'red' }> = ({ label, value, status }) => {
  const statusColors = {
    green: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
    yellow: 'bg-amber-950/60 border-amber-800 text-amber-300',
    red: 'bg-rose-950/60 border-rose-800 text-rose-300',
  };

  return (
    <div className={`p-3 rounded-xl border ${statusColors[status]} text-center`}>
      <span className="text-[10px] uppercase tracking-wider font-bold block mb-1 opacity-80">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
};
