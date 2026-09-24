import React, { useState } from 'react';
import { 
  Heart, 
  Droplet, 
  Bell, 
  Coffee, 
  HelpCircle, 
  CheckCircle2, 
  AlertOctagon, 
  ShieldCheck, 
  Clock, 
  Volume2, 
  VolumeX, 
  UserCheck,
  Sparkles,
  BedDouble,
  Pill
} from 'lucide-react';
import { Patient } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface PatientBedsidePageProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
}

export const PatientBedsidePage: React.FC<PatientBedsidePageProps> = ({ patients }) => {
  // Allow picking which bed/room kiosk is being simulated
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.patient_id || 'P01');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [requestSubmitting, setRequestSubmitting] = useState<boolean>(false);
  const [recentActionMessage, setRecentActionMessage] = useState<string | null>(null);

  const currentPatient = patients.find((p) => p.patient_id === selectedPatientId) || patients[0];

  const handleToggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleBedsideRequest = async (type: string) => {
    if (!currentPatient) return;
    setRequestSubmitting(true);
    try {
      await api.triggerRequest(currentPatient.patient_id, type);
      sounds.playRequestChime();
      setRecentActionMessage(`Your request for "${type}" was sent to ${currentPatient.assigned_nurse_name || 'your nurse'}.`);
      setTimeout(() => setRecentActionMessage(null), 5000);
    } catch (err) {
      console.error('Failed to trigger bedside request', err);
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!currentPatient) return;
    try {
      await api.clearRequest(currentPatient.patient_id);
      sounds.playSuccessChime();
      setRecentActionMessage('Request cancelled.');
      setTimeout(() => setRecentActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to clear request', err);
    }
  };

  const handleTriggerSOS = async () => {
    if (!currentPatient) return;
    try {
      await api.triggerSOS(currentPatient.patient_id);
      sounds.playSOSAlarm();
      setRecentActionMessage('🚨 Emergency signal dispatched! Primary nurse notified with top priority.');
    } catch (err) {
      console.error('Failed to trigger SOS', err);
    }
  };

  const handleCancelSOS = async () => {
    if (!currentPatient) return;
    try {
      await api.clearSOS(currentPatient.patient_id);
      sounds.playSuccessChime();
      setRecentActionMessage('Emergency call cleared.');
      setTimeout(() => setRecentActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to clear SOS', err);
    }
  };

  if (!currentPatient) {
    return <div className="p-12 text-center text-slate-400">No patient telemetry available.</div>;
  }

  const iv = currentPatient.current_iv;
  const ivPct = Math.round(Math.min(100, Math.max(0, (iv.iv_remaining_ml / 500) * 100)));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Bedside Room Selector Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">Bedside Companion Tablet</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-950 text-teal-300 border border-teal-800">
                Patient & Family Kiosk
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Calming, non-intimidating real-time room monitor with 1-tap comfort requests and emergency nurse call.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Room Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">Room:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-transparent text-teal-300 font-semibold focus:outline-none cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id} className="bg-slate-900 text-slate-200">
                  {p.room} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-teal-950/80 text-teal-300 border-teal-800'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Toggle bedside chimes & audio feedback"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Active Banner */}
      {currentPatient.sos_active && (
        <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-5 shadow-2xl animate-pulse text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-rose-600 flex items-center justify-center shadow-lg">
              <AlertOctagon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">🚨 Emergency Call Activated</h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Your nurse <strong>{currentPatient.assigned_nurse_name || 'on duty'}</strong> has received an urgent priority notification and is coming to {currentPatient.room}.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelSOS}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-rose-900 hover:bg-rose-100 transition-all shadow-md"
          >
            Cancel / Nurse Arrived
          </button>
        </div>
      )}

      {/* Feedback Toast Notification */}
      {recentActionMessage && (
        <div className="bg-teal-950/90 border border-teal-500/60 rounded-xl p-3 text-xs text-teal-200 flex items-center gap-2 shadow-lg animate-fade-in">
          <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>{recentActionMessage}</span>
        </div>
      )}

      {/* Main Bedside Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Patient Greeting & Care Team */}
        <div className="space-y-6">
          {/* Welcome Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Safe & Monitored 24/7</span>
            </div>

            <h2 className="text-2xl font-bold text-white mt-2">{currentPatient.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Location: <strong className="text-slate-200">{currentPatient.room}</strong> • Admission ID: #{currentPatient.patient_id}
            </p>

            {/* Comfort Status Indicator */}
            <div className="mt-5 p-3.5 rounded-2xl bg-teal-950/40 border border-teal-800/60 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-teal-400 animate-ping" />
              <div>
                <span className="text-xs font-bold text-teal-300">Continuous Monitoring Active</span>
                <p className="text-[11px] text-teal-400/80">Vitals telemetry is stable & securely tracked.</p>
              </div>
            </div>
          </div>

          {/* Assigned Care Team Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-teal-400" />
              <span>Your Care Team On Duty</span>
            </h3>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {(currentPatient.assigned_nurse_name || 'N')[0]}
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Primary Nurse</span>
                <span className="text-sm font-bold text-white">{currentPatient.assigned_nurse_name || 'Assigned Floor Nurse'}</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">● On Shift • Stationed Nearby</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                Dr
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Attending Physician</span>
                <span className="text-sm font-bold text-white">Dr. Michael Vance, MD</span>
                <span className="text-[10px] text-indigo-300 block mt-0.5">● Daily Rounds: 10:00 & 16:30</span>
              </div>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Ward Routine Schedule</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60">
                <span className="text-slate-400">19:00</span>
                <span className="text-slate-200 font-medium">Evening Vitals Check</span>
                <span className="text-[10px] text-teal-400">Upcoming</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60">
                <span className="text-slate-400">20:30</span>
                <span className="text-slate-200 font-medium">Oral Medication Round</span>
                <span className="text-[10px] text-slate-500">Scheduled</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60">
                <span className="text-slate-400">22:00</span>
                <span className="text-slate-200 font-medium">Quiet Resting Hours</span>
                <span className="text-[10px] text-slate-500">Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right Column: IV Infusion Progress & Bedside Action Buttons */}
        <div className="md:col-span-2 space-y-6">
          {/* Friendly IV Infusion Progress Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Intravenous Infusion Tracker</h3>
                  <p className="text-[11px] text-slate-400">Hydration & IV fluid monitoring</p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                iv.iv_state === 'NORMAL'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {iv.iv_state === 'NORMAL' ? 'Infusing Smoothly' : iv.iv_state}
              </span>
            </div>

            {/* Visual Fluid Progress Bar */}
            <div className="space-y-2 my-4">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-400">Infusion Progress</span>
                <span className="font-bold text-white font-mono text-sm">{ivPct}% Remaining ({iv.iv_remaining_ml.toFixed(0)} ml)</span>
              </div>

              <div className="w-full bg-slate-950 rounded-2xl h-4 p-1 border border-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500 shadow-sm shadow-cyan-500/50"
                  style={{ width: `${ivPct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Drip rate: {iv.iv_flow.toFixed(0)} ml/hr</span>
                <span className="text-cyan-300 font-semibold">
                  Estimated ~{iv.estimated_time_to_empty_min.toFixed(0)} minutes remaining
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              💡 <strong>Peace of Mind:</strong> Our smart monitoring automatically alerts your nurse 15 minutes before the fluid bag finishes. You do not need to watch the bag.
            </p>
          </div>

          {/* Active Bedside Request Status */}
          {currentPatient.request_active && (
            <div className="bg-purple-950/70 border border-purple-500/60 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Request Pending: {currentPatient.request_type || 'Assistance'}
                  </h4>
                  <p className="text-xs text-purple-300">
                    Notified {currentPatient.assigned_nurse_name || 'nurse station'}. Nurse is en route.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelRequest}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700 transition-all"
              >
                Cancel Request
              </button>
            </div>
          )}

          {/* Interactive Bedside Comfort Touchpad */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">How Can We Help You?</h3>
                <p className="text-xs text-slate-400">Tap any button to dispatch a request to your nurse.</p>
              </div>
              <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">1-Tap Requests</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Button: Water */}
              <button
                onClick={() => handleBedsideRequest('Water')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coffee className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Drinking Water</span>
                <span className="text-[10px] text-slate-400">Fresh cold water</span>
              </button>

              {/* Button: Pain Check */}
              <button
                onClick={() => handleBedsideRequest('Pain')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Pill className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Pain Check</span>
                <span className="text-[10px] text-slate-400">Request review</span>
              </button>

              {/* Button: Bathroom */}
              <button
                onClick={() => handleBedsideRequest('Bathroom')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Restroom Help</span>
                <span className="text-[10px] text-slate-400">Walking assist</span>
              </button>

              {/* Button: Nurse Visit */}
              <button
                onClick={() => handleBedsideRequest('General')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bell className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white">Nurse Visit</span>
                <span className="text-[10px] text-slate-400">Ask a question</span>
              </button>
            </div>
          </div>

          {/* LARGE EMERGENCY SOS PANIC SWITCH */}
          <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-2 border-rose-600/70 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Emergency Assistance</h4>
                <p className="text-xs text-rose-200 mt-0.5">
                  Press if you feel sudden dizziness, severe shortness of breath, or sharp pain.
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerSOS}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-rose-600/40 active:scale-95 transition-all flex items-center justify-center gap-2 border border-rose-400"
            >
              <AlertOctagon className="w-5 h-5" />
              <span>Push For Emergency</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
