import React, { useState } from 'react';
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
  Lock
} from 'lucide-react';

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
    // Simulated save to backend
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
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-800',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-800',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-800',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-800',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-800',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-800',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-800',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-800',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">System Administration</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-400">
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
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
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
        <div className="space-y-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 h-fit shadow-lg">
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
                    ? `bg-slate-800 text-white shadow-sm`
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <SIcon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="flex-1 text-left">{s.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
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
              <div className="mt-5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-400 mb-2">Preview — Header Bar</h4>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">{config.logoText}</span>
                    <p className="text-[10px] text-slate-400">{config.wardName} • {config.department}</p>
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
                      className="w-10 h-10 rounded-xl border border-slate-700 cursor-pointer bg-transparent" />
                    <span className="text-xs text-slate-300 font-mono">{config.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.accentColor} onChange={(e) => updateConfig('accentColor', e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-700 cursor-pointer bg-transparent" />
                    <span className="text-xs text-slate-300 font-mono">{config.accentColor}</span>
                  </div>
                </div>
              </div>
              {/* Color Preview */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-slate-800" style={{ background: config.primaryColor + '20' }}>
                  <div className="h-6 w-full rounded-lg mb-2" style={{ background: config.primaryColor }} />
                  <span className="text-[10px] text-slate-400">Primary</span>
                </div>
                <div className="p-4 rounded-2xl border border-slate-800" style={{ background: config.accentColor + '20' }}>
                  <div className="h-6 w-full rounded-lg mb-2" style={{ background: config.accentColor }} />
                  <span className="text-[10px] text-slate-400">Accent</span>
                </div>
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60">
                  <div className="h-6 w-full rounded-lg mb-2 bg-slate-800" />
                  <span className="text-[10px] text-slate-400">Background</span>
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
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="text-[11px] font-bold text-white block">ESP32-{String(i + 1).padStart(2, '0')}</span>
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

          {/* Staff Management */}
          {activeSection === 'users' && (
            <SectionCard title="Staff Management" icon={Users} color="rose" description="View and manage nurse/physician access credentials and role assignments.">
              <div className="space-y-3">
                {[
                  { name: 'Charge Nurse', id: 'N00', role: 'Charge Nurse', status: 'Active', ward: '4B' },
                  { name: 'Nurse A', id: 'N01', role: 'Critical Care (Tier 1)', status: 'Active', ward: '4B' },
                  { name: 'Nurse B', id: 'N02', role: 'Senior (Tier 2)', status: 'Active', ward: '4B' },
                  { name: 'Nurse C', id: 'N03', role: 'General (Tier 3)', status: 'Active', ward: '4B' },
                  { name: 'Dr. Michael Vance', id: 'D01', role: 'Attending Physician', status: 'Active', ward: '4B' },
                  { name: 'Dr. Sarah Chen', id: 'D02', role: 'Resident', status: 'Off-Shift', ward: '4B' },
                ].map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm ${
                        staff.id.startsWith('D') ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-teal-500 to-emerald-600'
                      }`}>
                        {staff.name[0]}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white">{staff.name}</span>
                        <span className="text-[10px] text-slate-400 block">{staff.role} • {staff.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        staff.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {staff.status}
                      </span>
                      <span className="text-[10px] text-slate-500">{staff.ward}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Staff credentials are managed centrally. In production, this connects to the hospital's Active Directory / LDAP for SSO authentication.</span>
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
    cyan: 'from-cyan-600 to-blue-500 shadow-cyan-500/20',
    purple: 'from-purple-600 to-pink-500 shadow-purple-500/20',
    teal: 'from-teal-600 to-emerald-500 shadow-teal-500/20',
    blue: 'from-blue-600 to-sky-500 shadow-blue-500/20',
    amber: 'from-amber-600 to-orange-500 shadow-amber-500/20',
    emerald: 'from-emerald-600 to-green-500 shadow-emerald-500/20',
    indigo: 'from-indigo-600 to-violet-500 shadow-indigo-500/20',
    rose: 'from-rose-600 to-pink-500 shadow-rose-500/20',
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${colorClasses[color]}`} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-xs text-slate-400">{description}</p>
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
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-600 transition-colors"
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
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-cyan-600 transition-colors"
    />
  </div>
);

const ToggleField: React.FC<{ label: string; description: string; value: boolean; onChange: (v: boolean) => void }> = ({
  label, description, value, onChange
}) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
    <div>
      <span className="text-xs font-bold text-white">{label}</span>
      <span className="text-[10px] text-slate-400 block">{description}</span>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all relative ${
        value ? 'bg-cyan-600' : 'bg-slate-700'
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
