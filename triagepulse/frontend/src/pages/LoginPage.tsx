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
  KeyRound,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export type LoginRole = 'nurse' | 'doctor' | 'patient' | 'management' | 'admin';

interface LoginPageProps {
  onLogin: (role: LoginRole, credentials: { name: string; id: string }) => void;
  isConnected: boolean;
}

// Signup role options (Admin is never allowed in signup per security policy)
const signupRoles: { role: LoginRole; label: string; description: string; icon: React.ComponentType<any> }[] = [
  { role: 'nurse', label: 'Nurse Station', description: 'Triage command, patient monitoring & task dispatch', icon: User },
  { role: 'doctor', label: 'Physician Console', description: 'Clinical escalations, deterioration forensics & SBAR reviews', icon: Stethoscope },
  { role: 'patient', label: 'Bedside Kiosk (Patient)', description: 'Patient comfort requests, IV tracking & emergency SOS', icon: BedDouble },
  { role: 'management', label: 'Operations Hub', description: 'Bed capacity, burnout risk & alarm fatigue audit', icon: Building2 },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isConnected }) => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Signup role selector state
  const [signupRole, setSignupRole] = useState<LoginRole>('nurse');
  const [showSignupRoleDropdown, setShowSignupRoleDropdown] = useState(false);

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

  // One-Click Demonstration / Testing Accounts
  const quickAccounts: {
    username: string;
    label: string;
    sublabel: string;
    role: LoginRole;
    icon: React.ComponentType<any>;
    color: string;
    bg: string;
    border: string;
    badge?: string;
  }[] = [
    { username: 'nurse1', label: 'Nurse 1', sublabel: 'Nurse Sarah (Critical Care)', role: 'nurse' as LoginRole, icon: User, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', badge: 'N01' },
    { username: 'nurse2', label: 'Nurse 2', sublabel: 'Nurse Elena (Senior Triage)', role: 'nurse' as LoginRole, icon: User, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'N02' },
    { username: 'patient1', label: 'Patient 1', sublabel: 'Room 101 (ESP32 Stream)', role: 'patient' as LoginRole, icon: BedDouble, color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'ESP32' },
    { username: 'patient2', label: 'Patient 2', sublabel: 'Room 102 (ESP32 Stream)', role: 'patient' as LoginRole, icon: BedDouble, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'ESP32' },
    { username: 'doctor1', label: 'Doctor', sublabel: 'Dr. Michael Vance', role: 'doctor' as LoginRole, icon: Stethoscope, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', badge: 'D01' },
    { username: 'ops1', label: 'Operations', sublabel: 'Ward 4B Executive Hub', role: 'management' as LoginRole, icon: Building2, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'M01' },
    { username: 'admin', label: 'Super Admin', sublabel: 'System Administrator Console', role: 'admin' as LoginRole, icon: Shield, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', badge: 'Root' },
  ].filter((acc) => !(isMobile && acc.role === 'admin'));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (isSignUpMode) {
      await handleSignUp();
      return;
    }

    const inputUser = userName.trim();
    if (!inputUser) {
      setNotification({
        type: 'error',
        title: 'Username Required',
        message: 'Please enter your username (e.g., nurse1, nurse2, patient1, patient2, admin, doctor1, or ops1).'
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await api.login(inputUser, password || 'admin123', false, isMobile);
      const userRole = (res.role || 'nurse') as LoginRole;
      onLogin(userRole, {
        name: res.user || inputUser,
        id: res.id || 'N01',
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

  const handleQuickLogin = async (username: string) => {
    setIsLoggingIn(true);
    setNotification(null);
    setUserName(username);
    setPassword('admin123');

    try {
      const res = await api.login(username, 'admin123', true, isMobile);
      const userRole = (res.role || 'nurse') as LoginRole;
      onLogin(userRole, {
        name: res.user || username,
        id: res.id || 'N01',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Quick Access Failed',
        message: err.message || 'Unable to log into demo account.'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = async () => {
    if (signupRole === 'admin' || userName.toLowerCase().includes('admin')) {
      setNotification({
        type: 'error',
        title: 'Sign Up Restricted',
        message: 'SECURITY POLICY: System Administrator accounts cannot be self-registered. Only clinical and ward accounts can be created and require approval.'
      });
      return;
    }

    if (!userName.trim()) {
      setNotification({
        type: 'error',
        title: 'Username Required',
        message: 'Please choose a desired username or staff name.'
      });
      return;
    }

    if (password.length < 6) {
      setNotification({
        type: 'warning',
        title: 'Password Too Short',
        message: 'Password must be at least 6 characters long for security compliance.'
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await api.signup(signupRole, userName.trim(), password);
      setNotification({
        type: 'pending',
        title: 'Registration Submitted — Awaiting Approval',
        message: res.message || `Account for '${userName.trim()}' was registered. It is now PENDING approval by the System Administrator. Login will be permitted once authorized.`
      });
      setIsSignUpMode(false);
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

  const currentSignupRoleCfg = signupRoles.find((r) => r.role === signupRole) || signupRoles[0];
  const SignupIcon = currentSignupRoleCfg.icon;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/2 w-72 h-72 bg-blue-300/10 rounded-full blur-3xl" />
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
              <span className="text-amber-700 text-[11px]">System Admin console is disabled on mobile devices for safety and hospital regulatory compliance.</span>
            </div>
          </div>
        )}

        {/* Notification Alert Box */}
        {notification && (
          <div className={`mb-4 p-4 rounded-2xl border shadow-sm relative animate-in fade-in duration-200 ${
            notification.type === 'pending'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : notification.type === 'warning'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-red-50 border-red-300 text-red-900'
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 border border-teal-200">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TriagePulse</h1>
              <p className="text-[11px] text-slate-500 tracking-wider">Trajectory-Aware Smart Hospital Platform</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isSignUpMode
              ? 'Request new clinical access credentials. All signups require System Admin approval.'
              : 'Sign in with your username & access PIN. The system automatically detects your role.'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500" />

          <div className="p-7">
            {/* SIGN UP ONLY: Role Selection Dropdown */}
            {isSignUpMode ? (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                    Requested Clinical Role
                  </label>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    Admin Approval Required
                  </span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSignupRoleDropdown(!showSignupRoleDropdown)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                        <SignupIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{currentSignupRoleCfg.label}</span>
                        <span className="text-[10px] text-slate-500">{currentSignupRoleCfg.description}</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showSignupRoleDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showSignupRoleDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                      {signupRoles.map((cfg) => {
                        const RIcon = cfg.icon;
                        return (
                          <button
                            key={cfg.role}
                            onClick={() => {
                              setSignupRole(cfg.role);
                              setShowSignupRoleDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 ${
                              signupRole === cfg.role ? 'bg-teal-50/60' : ''
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                              <RIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{cfg.label}</span>
                              <span className="text-[10px] text-slate-500">{cfg.description}</span>
                            </div>
                            {signupRole === cfg.role && (
                              <Check className="w-4 h-4 text-teal-600 ml-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Standard Login / Sign Up Form (NO role asked for Login!) */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                  {isSignUpMode ? 'Desired Username / Staff Name' : 'Username / Staff ID'}
                </label>
                <div className="relative">
                  <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={isSignUpMode ? 'e.g., NurseVarun or DrSmith' : 'nurse1, nurse2, patient1, patient2, admin...'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">
                    {isSignUpMode ? 'Create Password / PIN (min 6 chars)' : 'Access PIN / Password'}
                  </label>
                  {!isSignUpMode && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Default: <strong className="text-teal-700">admin123</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUpMode ? 'At least 6 characters' : 'Enter PIN (default: admin123)'}
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isSignUpMode ? 'Submitting Registration...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUpMode ? 'Submit Registration for Approval' : 'Sign In to Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Toggle Sign Up / Sign In Mode */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setNotification(null);
                  }}
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold"
                >
                  {isSignUpMode
                    ? '← Back to Workstation Sign In'
                    : 'New Staff or Ward Account? Request Registration (Admin Approval)'}
                </button>
              </div>
            </form>

            {/* Quick 1-Click Demonstration Accounts (Requested 2 Nurses, 2 Patients, Super Admin, Doctor, Ops) */}
            {!isSignUpMode && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    One-Click Quick Access Accounts
                  </p>
                  <span className="text-[10px] font-mono text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    PIN: admin123
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {quickAccounts.map((acc) => {
                    const AccIcon = acc.icon;
                    return (
                      <button
                        key={acc.username}
                        onClick={() => handleQuickLogin(acc.username)}
                        disabled={isLoggingIn}
                        className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between ${acc.bg} ${acc.border}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <AccIcon className={`w-4 h-4 ${acc.color}`} />
                          {acc.badge && (
                            <span className="text-[9px] font-mono font-bold px-1 rounded bg-white text-slate-600 border border-slate-200">
                              {acc.badge}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block truncate">{acc.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{acc.sublabel}</span>
                        </div>
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
