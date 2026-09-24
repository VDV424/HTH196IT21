import React, { useState, useEffect } from 'react';
import {
  Activity,
  User,
  Stethoscope,
  BedDouble,
  Building2,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Cpu,
  ArrowRight,
  Sparkles,
  Heart,
  Radio,
  Monitor,
  Fingerprint,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api';

export type LoginRole = 'nurse' | 'doctor' | 'patient' | 'management' | 'admin';

interface LoginPageProps {
  onLogin: (role: LoginRole, credentials: { name: string; id: string }) => void;
  isConnected: boolean;
}

const roleConfig: Record<LoginRole, {
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
  shadow: string;
  description: string;
  defaultUser: string;
  defaultId: string;
}> = {
  nurse: {
    label: 'Nurse Station',
    icon: User,
    color: 'cyan',
    gradient: 'from-teal-600 to-emerald-500',
    shadow: 'shadow-teal-500/20',
    description: 'Triage command, patient monitoring & task dispatch',
    defaultUser: 'Charge Nurse',
    defaultId: 'N01',
  },
  doctor: {
    label: 'Physician Console',
    icon: Stethoscope,
    color: 'indigo',
    gradient: 'from-violet-600 to-purple-500',
    shadow: 'shadow-violet-500/20',
    description: 'Clinical escalations, deterioration forensics & SBAR reviews',
    defaultUser: 'Dr. Michael Vance',
    defaultId: 'D01',
  },
  patient: {
    label: 'Bedside Kiosk',
    icon: BedDouble,
    color: 'teal',
    gradient: 'from-teal-600 to-emerald-500',
    shadow: 'shadow-teal-500/20',
    description: 'Patient comfort requests, IV tracking & emergency SOS',
    defaultUser: 'Patient',
    defaultId: 'P01',
  },
  management: {
    label: 'Operations Hub',
    icon: Building2,
    color: 'blue',
    gradient: 'from-emerald-600 to-emerald-500',
    shadow: 'shadow-emerald-500/20',
    description: 'Bed capacity, burnout risk, alarm fatigue audit & SLA tracking',
    defaultUser: 'Admin',
    defaultId: 'M01',
  },
  admin: {
    label: 'System Admin',
    icon: Shield,
    color: 'rose',
    gradient: 'from-rose-600 to-pink-500',
    shadow: 'shadow-rose-500/20',
    description: 'Hospital branding, ward configuration & system personalization',
    defaultUser: 'Super Admin',
    defaultId: 'ADMIN',
  },
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isConnected }) => {
  const [selectedRole, setSelectedRole] = useState<LoginRole>('nurse');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const config = roleConfig[selectedRole];
  const Icon = config.icon;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUpMode) {
      await handleSignUp();
      return;
    }

    setIsLoggingIn(true);
    try {
      const username = userName || config.defaultUser;
      const res = await api.login(selectedRole, username, password, false);
      onLogin(selectedRole as LoginRole, {
        name: res.user,
        id: config.defaultId,
      });
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoggingIn(true);
    try {
      if (!userName || !password) {
        throw new Error('Username and password are required for sign up.');
      }
      const res = await api.signup(selectedRole, userName, password);
      alert(res.message); // Success message
      setIsSignUpMode(false); // Switch back to login mode after successful signup
    } catch (err: any) {
      alert(err.message || 'Sign up failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async (role: LoginRole) => {
    setSelectedRole(role);
    setIsLoggingIn(true);
    
    try {
      const c = roleConfig[role];
      // Quick Demo access sends isDemo=true to keep simulation data
      const res = await api.login(role, c.defaultUser, 'admin123', true);
      
      onLogin(role, { name: res.user, id: c.defaultId });
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite alternate' }} />
        <div className="absolute top-3/4 left-1/2 w-72 h-72 bg-teal-600/6 rounded-full blur-3xl" style={{ animation: 'pulse 6s ease-in-out infinite alternate-reverse' }} />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Floating Vital Signal Lines */}
        <svg className="absolute top-1/2 left-0 w-full h-20 -translate-y-1/2 opacity-5" viewBox="0 0 1200 80">
          <path
            d="M0,40 L100,40 L120,20 L140,60 L160,10 L180,70 L200,40 L400,40 L420,15 L440,65 L460,5 L480,75 L500,40 L700,40 L720,25 L740,55 L760,15 L780,65 L800,40 L1200,40"
            stroke="cyan"
            fill="none"
            strokeWidth="2"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-100" dur="3s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-xl shadow-teal-500/20">
              <Activity className="h-7 w-7 text-slate-900" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">TriagePulse</h1>
              <p className="text-xs text-slate-500 tracking-wider">Trajectory-Aware Smart Hospital Platform</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Secure role-based access to patient monitoring, nurse triage, and hospital operations.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">
          {/* Role Indicator Bar */}
          <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />

          <div className="p-8">
            {/* Role Selection */}
            <div className="mb-6">
              <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-2">
                Access Portal
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border bg-slate-50/80 hover:bg-slate-50 transition-all ${
                    showRoleDropdown ? 'border-teal-600' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md ${config.shadow}`}>
                      <Icon className="w-5 h-5 text-slate-900" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-900 block">{config.label}</span>
                      <span className="text-[11px] text-slate-500">{config.description}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showRoleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {(Object.entries(roleConfig) as [LoginRole, typeof config][]).map(([role, cfg]) => {
                      const RoleIcon = cfg.icon;
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            setSelectedRole(role);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-100/80 ${
                            selectedRole === role ? 'bg-slate-100/60' : ''
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm ${cfg.shadow}`}>
                            <RoleIcon className="w-4 h-4 text-slate-900" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{cfg.label}</span>
                            <span className="text-[10px] text-slate-500">{cfg.description}</span>
                          </div>
                          {selectedRole === role && (
                            <div className="ml-auto w-2 h-2 rounded-full bg-teal-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                  Staff Name / ID
                </label>
                <div className="relative">
                  <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={config.defaultUser}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-600 focus:outline-none focus:border-teal-600 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                  Access Pin
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-600 focus:outline-none focus:border-teal-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login/Signup Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${config.gradient} text-slate-900 font-bold text-sm uppercase tracking-wider shadow-lg ${config.shadow} hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isSignUpMode ? 'Creating Account...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUpMode ? `Create ${config.label} Account` : `Sign In to ${config.label}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => setIsSignUpMode(!isSignUpMode)}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  {isSignUpMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>

            {/* Quick Login Shortcuts */}
            <div className="mt-6 pt-6 border-t border-slate-200/60">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3 text-center">
                Quick Demo Access
              </p>
              <div className="grid grid-cols-5 gap-2">
                {(Object.entries(roleConfig) as [LoginRole, typeof config][]).map(([role, cfg]) => {
                  const QuickIcon = cfg.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => handleQuickLogin(role)}
                      disabled={isLoggingIn}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                        selectedRole === role
                          ? `bg-slate-100/80 border-slate-300`
                          : 'bg-slate-50/60 border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <QuickIcon className="w-4 h-4 text-slate-500" />
                      <span className="text-[9px] font-semibold text-slate-500 leading-tight text-center">
                        {role === 'management' ? 'Ops' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* System Status Footer */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{isConnected ? 'Telemetry Active' : 'Connecting...'}</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              <span>MQTT Ready</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>3 ESP32</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Monitor className="w-3 h-3" />
            <span>{currentTime.toLocaleTimeString()} — Ward 4B • ICU Wing</span>
          </div>

          <p className="text-[10px] text-slate-600 text-center max-w-sm">
            Educational / Research Prototype Only • Not for Clinical Diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
};
