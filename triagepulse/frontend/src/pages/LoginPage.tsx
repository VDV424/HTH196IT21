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
  Clock,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldAlert,
  X,
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
    description: 'Hospital branding, ward configuration & user approval administration',
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

  // Mobile Device & Viewport Detection
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    return false;
  });

  // User Notification modal / alert state
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error' | 'pending';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Enforce Security Rule: If mobile or sign up, NEVER allow admin selection!
  useEffect(() => {
    if ((isMobile || isSignUpMode) && selectedRole === 'admin') {
      setSelectedRole('nurse');
    }
  }, [isMobile, isSignUpMode, selectedRole]);

  // Roles available based on portal context:
  // - Mobile Portal: NEVER show System Administrator
  // - Sign Up: NEVER allow System Administrator
  const availableRoles = (Object.entries(roleConfig) as [LoginRole, typeof roleConfig[LoginRole]][]).filter(([role]) => {
    if (isMobile && role === 'admin') return false;
    if (isSignUpMode && role === 'admin') return false;
    return true;
  });

  const config = roleConfig[selectedRole] || roleConfig.nurse;
  const Icon = config.icon;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (isSignUpMode) {
      await handleSignUp();
      return;
    }

    // Client-side guard for mobile admin restriction
    if (isMobile && selectedRole === 'admin') {
      setNotification({
        type: 'warning',
        title: 'Mobile Access Restricted',
        message: 'SECURITY POLICY: System Administrator portal is disabled on mobile devices. Please access from an authorized hospital workstation console.'
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const username = userName.trim() || config.defaultUser;
      const res = await api.login(selectedRole, username, password, false, isMobile);
      onLogin(selectedRole as LoginRole, {
        name: res.user,
        id: config.defaultId,
      });
    } catch (err: any) {
      const errDetail = err.message || 'Login failed.';
      if (errDetail.includes('APPROVAL PENDING')) {
        setNotification({
          type: 'pending',
          title: 'Account Awaiting Administrator Approval',
          message: 'Your registration is currently PENDING System Administrator approval. A hospital administrator must approve your account in the Staff Management console before you can log in.'
        });
      } else if (errDetail.includes('ACCESS DECLINED') || errDetail.includes('REJECTED')) {
        setNotification({
          type: 'error',
          title: 'Registration Declined',
          message: 'Your account registration was reviewed and declined by the System Administrator. Please contact hospital administration.'
        });
      } else if (errDetail.includes('MOBILE ACCESS') || errDetail.includes('MOBILE RESTRICTION')) {
        setNotification({
          type: 'warning',
          title: 'Mobile Device Restricted',
          message: errDetail
        });
      } else {
        setNotification({
          type: 'error',
          title: 'Authentication Failed',
          message: errDetail
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = async () => {
    // Security check: Block admin in signup
    if (selectedRole === 'admin' || userName.toLowerCase().includes('admin')) {
      setNotification({
        type: 'error',
        title: 'Sign Up Restricted',
        message: 'System Administrator accounts cannot be created via public registration. Admin accounts are provisioned internally.'
      });
      return;
    }

    if (!userName.trim() || !password) {
      setNotification({
        type: 'warning',
        title: 'Required Information Missing',
        message: 'Both Staff Name / Username and Access Pin (password) are required for account creation.'
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await api.signup(selectedRole, userName.trim(), password);
      setNotification({
        type: 'pending',
        title: 'Registration Submitted — Awaiting Approval',
        message: res.message || `Account for '${userName.trim()}' was registered. It is now PENDING approval by the System Administrator. Login will be permitted once authorized.`
      });
      setIsSignUpMode(false); // Switch back to sign-in screen
      setPassword('');
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Account registration failed.'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async (role: LoginRole) => {
    if (isMobile && role === 'admin') {
      setNotification({
        type: 'warning',
        title: 'Mobile Access Restricted',
        message: 'System Administrator console is disabled on mobile devices.'
      });
      return;
    }

    setSelectedRole(role);
    setIsLoggingIn(true);
    setNotification(null);

    try {
      const c = roleConfig[role];
      const res = await api.login(role, c.defaultUser, 'admin123', true, isMobile);
      onLogin(role, { name: res.user, id: c.defaultId });
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Login Error',
        message: err.message || 'Quick demo access failed.'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite alternate' }} />
        <div className="absolute top-3/4 left-1/2 w-72 h-72 bg-teal-600/6 rounded-full blur-3xl" style={{ animation: 'pulse 6s ease-in-out infinite alternate-reverse' }} />

        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Mobile Detection Notice */}
        {isMobile && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-left text-xs">
              <span className="font-bold text-amber-900 block">Mobile Portal Active</span>
              <span className="text-amber-700 text-[11px]">System Admin login is restricted to hospital desktop consoles for safety & compliance.</span>
            </div>
          </div>
        )}

        {/* Notification Modal / Card */}
        {notification && (
          <div className={`mb-4 p-4 rounded-2xl border shadow-lg relative animate-in fade-in duration-200 ${
            notification.type === 'pending'
              ? 'bg-amber-50/90 border-amber-300 text-amber-900'
              : notification.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              : notification.type === 'warning'
              ? 'bg-rose-50/90 border-rose-300 text-rose-900'
              : 'bg-red-50/90 border-red-300 text-red-900'
          }`}>
            <button
              onClick={() => setNotification(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {notification.type === 'pending' && <Clock className="w-5 h-5 text-amber-600 animate-spin" />}
                {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {notification.type === 'warning' && <ShieldAlert className="w-5 h-5 text-rose-600" />}
                {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
              </div>
              <div className="pr-6 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider">{notification.title}</h4>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-xl shadow-teal-500/20">
              <Activity className="h-6 w-6 text-slate-900" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TriagePulse</h1>
              <p className="text-[11px] text-slate-500 tracking-wider">Trajectory-Aware Smart Hospital Platform</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isSignUpMode
              ? 'Request new clinical credentials. All signups require System Admin approval.'
              : 'Secure role-based access to patient telemetry, nurse triage, and clinical escalation.'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          {/* Role Indicator Bar */}
          <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />

          <div className="p-7">
            {/* Role Selection */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                  {isSignUpMode ? 'Registering Role' : 'Access Portal'}
                </label>
                {isSignUpMode && (
                  <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    Admin Approval Required
                  </span>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border bg-slate-50/80 hover:bg-slate-50 transition-all ${
                    showRoleDropdown ? 'border-teal-600' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md ${config.shadow}`}>
                      <Icon className="w-4 h-4 text-slate-900" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-900 block">{config.label}</span>
                      <span className="text-[10px] text-slate-500">{config.description}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showRoleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    {availableRoles.map(([role, cfg]) => {
                      const RoleIcon = cfg.icon;
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            setSelectedRole(role);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-slate-100/80 ${
                            selectedRole === role ? 'bg-slate-100/60' : ''
                          }`}
                        >
                          <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-sm ${cfg.shadow}`}>
                            <RoleIcon className="w-3.5 h-3.5 text-slate-900" />
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

            {/* Login / Sign Up Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                  {isSignUpMode ? 'Desired Username / Staff Name' : 'Staff Name / ID'}
                </label>
                <div className="relative">
                  <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={isSignUpMode ? 'e.g., NurseVarun or DrSmith' : config.defaultUser}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                  {isSignUpMode ? 'Create Access Pin / Password (min 6 chars)' : 'Access Pin'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUpMode ? 'At least 6 characters' : '••••••'}
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 transition-colors"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className={`w-full py-3 rounded-xl bg-gradient-to-r ${config.gradient} text-slate-900 font-bold text-xs uppercase tracking-wider shadow-md ${config.shadow} hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isSignUpMode ? 'Submitting Registration...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUpMode ? `Register for ${config.label}` : `Sign In to ${config.label}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Toggle Sign Up / Sign In */}
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setNotification(null);
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  {isSignUpMode
                    ? 'Already have an account? Sign In'
                    : "Need access? Sign Up (Requires Admin Approval)"}
                </button>
              </div>
            </form>

            {/* Quick Login Shortcuts (Available Roles Only) */}
            {!isSignUpMode && (
              <div className="mt-5 pt-5 border-t border-slate-200/60">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2.5 text-center">
                  Quick Demo Access
                </p>
                <div className={`grid gap-2 ${availableRoles.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  {availableRoles.map(([role, cfg]) => {
                    const QuickIcon = cfg.icon;
                    return (
                      <button
                        key={role}
                        onClick={() => handleQuickLogin(role)}
                        disabled={isLoggingIn}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                          selectedRole === role
                            ? 'bg-slate-100/90 border-slate-300 shadow-sm'
                            : 'bg-slate-50/60 border-slate-200/60 hover:border-slate-300'
                        }`}
                      >
                        <QuickIcon className="w-4 h-4 text-slate-600" />
                        <span className="text-[9px] font-semibold text-slate-600 leading-tight text-center">
                          {role === 'management' ? 'Ops' : role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Status Footer */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>{isConnected ? 'Telemetry Active' : 'Connecting...'}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              <span>MQTT Ingest Ready</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>ESP32 Hardware Stream</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Monitor className="w-3 h-3" />
            <span>{currentTime.toLocaleTimeString()} — Ward 4B • ICU Wing</span>
          </div>

          <p className="text-[10px] text-slate-400 text-center max-w-sm">
            TriagePulse • Academic & Hackathon IoT Prototype • All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};
