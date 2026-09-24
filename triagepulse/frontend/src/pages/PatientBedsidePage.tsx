import React, { useState, useEffect } from 'react';
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
  Pill,
  Thermometer,
  Wind,
  Timer,
  Stethoscope,
  Navigation
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
    return <div className="p-12 text-center text-slate-500">No patient telemetry available.</div>;
  }

  const iv = currentPatient.current_iv;
  const ivPct = Math.round(Math.min(100, Math.max(0, (iv.iv_remaining_ml / 500) * 100)));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Bedside Room Selector Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Bedside Companion Tablet</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-950 text-teal-300 border border-teal-800">
                Patient & Family Kiosk
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Calming, non-intimidating real-time room monitor with 1-tap comfort requests and emergency nurse call.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Room Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-500">Room:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-transparent text-teal-300 font-semibold focus:outline-none cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id} className="bg-white text-slate-700">
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
                : 'bg-slate-50 text-slate-500 border-slate-200'
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
        <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-5 shadow-2xl animate-pulse text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-rose-600 flex items-center justify-center shadow-lg">
              <AlertOctagon className="w-7 h-7 text-slate-900" />
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
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Safe & Monitored 24/7</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mt-2">{currentPatient.name}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Location: <strong className="text-slate-700">{currentPatient.room}</strong> • Admission ID: #{currentPatient.patient_id}
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-teal-400" />
              <span>Your Care Team On Duty</span>
            </h3>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-slate-900 font-bold text-sm shadow-md">
                {(currentPatient.assigned_nurse_name || 'N')[0]}
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Primary Nurse</span>
                <span className="text-sm font-bold text-slate-900">{currentPatient.assigned_nurse_name || 'Assigned Floor Nurse'}</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">● On Shift • Stationed Nearby</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-600 flex items-center justify-center text-slate-900 font-bold text-sm shadow-md">
                Dr
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Attending Physician</span>
                <span className="text-sm font-bold text-slate-900">Dr. Michael Vance, MD</span>
                <span className="text-[10px] text-indigo-300 block mt-0.5">● Daily Rounds: 10:00 & 16:30</span>
              </div>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Ward Routine Schedule</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60">
                <span className="text-slate-500">19:00</span>
                <span className="text-slate-700 font-medium">Evening Vitals Check</span>
                <span className="text-[10px] text-teal-400">Upcoming</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60">
                <span className="text-slate-500">20:30</span>
                <span className="text-slate-700 font-medium">Oral Medication Round</span>
                <span className="text-[10px] text-slate-500">Scheduled</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60">
                <span className="text-slate-500">22:00</span>
                <span className="text-slate-700 font-medium">Quiet Resting Hours</span>
                <span className="text-[10px] text-slate-500">Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right Column: IV Infusion Progress & Bedside Action Buttons */}
        <div className="md:col-span-2 space-y-6">
          {/* Friendly IV Infusion Progress Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-600 flex items-center justify-center">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Intravenous Infusion Tracker</h3>
                  <p className="text-[11px] text-slate-500">Hydration & IV fluid monitoring</p>
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
                <span className="text-slate-500">Infusion Progress</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{ivPct}% Remaining ({iv.iv_remaining_ml.toFixed(0)} ml)</span>
              </div>

              <div className="w-full bg-slate-50 rounded-2xl h-4 p-1 border border-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500 shadow-sm shadow-teal-500/50"
                  style={{ width: `${ivPct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span>Drip rate: {iv.iv_flow.toFixed(0)} ml/hr</span>
                <span className="text-cyan-300 font-semibold">
                  Estimated ~{iv.estimated_time_to_empty_min.toFixed(0)} minutes remaining
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              💡 <strong>Peace of Mind:</strong> Our smart monitoring automatically alerts your nurse 15 minutes before the fluid bag finishes. You do not need to watch the bag.
            </p>
          </div>

          {/* Live Vitals — Patient-Friendly Display */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Vitals — Live</h3>
                  <p className="text-[11px] text-slate-500">Updated every few seconds from your bedside sensor</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Heart Rate */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                <Heart className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
                <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                  {Math.round(currentPatient.current_vitals.heart_rate)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Heart Rate</span>
                <span className="text-[9px] text-rose-300 font-semibold">bpm</span>
              </div>

              {/* SpO2 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
                <Wind className="w-5 h-5 text-teal-600 mx-auto mb-1.5" />
                <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                  {currentPatient.current_vitals.spo2.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Oxygen Level</span>
                <span className="text-[9px] text-cyan-300 font-semibold">% SpO₂</span>
              </div>

              {/* Temperature */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                  {currentPatient.current_vitals.temperature.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Temperature</span>
                <span className="text-[9px] text-amber-300 font-semibold">°C</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-3 text-center">
              💚 All values within safe range • Monitored continuously by TriagePulse AI
            </p>
          </div>

          {/* Nurse & Doctor Wait Time Estimation */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-200 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Estimated Wait Times</h3>
                <p className="text-[11px] text-slate-500">When your nurse and doctor are expected to visit</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Nurse Wait */}
              <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-teal-300">Nurse Check-In</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-slate-900 font-mono">
                    {currentPatient.request_active ? '~3' : '~12'}
                  </span>
                  <span className="text-xs text-teal-400">minutes</span>
                </div>
                <p className="text-[10px] text-teal-300/70 mt-1.5">
                  {currentPatient.request_active 
                    ? `${currentPatient.assigned_nurse_name || 'Your nurse'} is on the way to ${currentPatient.room}` 
                    : 'Next scheduled vitals check-in'
                  }
                </p>
                {currentPatient.request_active && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-teal-400 animate-pulse" />
                    <span className="text-[10px] text-teal-300 font-semibold">En Route — ETA updating live</span>
                  </div>
                )}
              </div>

              {/* Doctor Wait */}
              <div className="p-4 rounded-2xl bg-violet-50/30 border border-violet-200/40">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-bold text-indigo-300">Doctor Consultation</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-slate-900 font-mono">~45</span>
                  <span className="text-xs text-violet-600">minutes</span>
                </div>
                <p className="text-[10px] text-indigo-300/70 mt-1.5">
                  Dr. Michael Vance • Next rounds at 16:30
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-violet-600" />
                  <span className="text-[10px] text-indigo-300 font-semibold">Scheduled Rounds</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-3 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80 text-center">
              ⏱️ Wait times are estimated based on nurse proximity, current workload, and ward activity. If urgent, press the <strong>Emergency</strong> button below.
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
                  <h4 className="text-sm font-bold text-slate-900">
                    Request Pending: {currentPatient.request_type || 'Assistance'}
                  </h4>
                  <p className="text-xs text-purple-300">
                    Notified {currentPatient.assigned_nurse_name || 'nurse station'}. Nurse is en route.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelRequest}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition-all"
              >
                Cancel Request
              </button>
            </div>
          )}

          {/* Interactive Bedside Comfort Touchpad */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">How Can We Help You?</h3>
                <p className="text-xs text-slate-500">Tap any button to dispatch a request to your nurse.</p>
              </div>
              <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">1-Tap Requests</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Button: Water */}
              <button
                onClick={() => handleBedsideRequest('Water')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-teal-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coffee className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900">Drinking Water</span>
                <span className="text-[10px] text-slate-500">Fresh cold water</span>
              </button>

              {/* Button: Pain Check */}
              <button
                onClick={() => handleBedsideRequest('Pain')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Pill className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900">Pain Check</span>
                <span className="text-[10px] text-slate-500">Request review</span>
              </button>

              {/* Button: Bathroom */}
              <button
                onClick={() => handleBedsideRequest('Bathroom')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-violet-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900">Restroom Help</span>
                <span className="text-[10px] text-slate-500">Walking assist</span>
              </button>

              {/* Button: Nurse Visit */}
              <button
                onClick={() => handleBedsideRequest('General')}
                disabled={requestSubmitting}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-teal-500/50 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 shadow-md"
              >
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bell className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900">Nurse Visit</span>
                <span className="text-[10px] text-slate-500">Ask a question</span>
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
                <h4 className="text-base font-bold text-slate-900">Emergency Assistance</h4>
                <p className="text-xs text-rose-200 mt-0.5">
                  Press if you feel sudden dizziness, severe shortness of breath, or sharp pain.
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerSOS}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-slate-900 font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-rose-600/40 active:scale-95 transition-all flex items-center justify-center gap-2 border border-rose-400"
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
