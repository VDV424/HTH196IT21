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
  Navigation,
  Cpu
} from 'lucide-react';
import { Patient } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { PatientCarePortal } from '../components/PatientCarePortal';

interface PatientBedsidePageProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
  loggedInPatientId?: string;
}

export const PatientBedsidePage: React.FC<PatientBedsidePageProps> = ({ patients, loggedInPatientId }) => {
  // Allow picking which bed/room kiosk is being simulated
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    loggedInPatientId && patients.some((p) => p.patient_id === loggedInPatientId)
      ? loggedInPatientId
      : patients[0]?.patient_id || 'P01'
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [requestSubmitting, setRequestSubmitting] = useState<boolean>(false);
  const [recentActionMessage, setRecentActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loggedInPatientId && patients.some((p) => p.patient_id === loggedInPatientId)) {
      setSelectedPatientId(loggedInPatientId);
    }
  }, [loggedInPatientId, patients]);

  const currentPatient = patients.find((p) => p.patient_id === selectedPatientId) || patients[0];

  // Hardware Sensor Feeder Controls (ESP32 Telemetry)
  const [feedHr, setFeedHr] = useState<number>(78);
  const [feedSpo2, setFeedSpo2] = useState<number>(97);
  const [feedTemp, setFeedTemp] = useState<number>(36.8);
  const [feedIvWeight, setFeedIvWeight] = useState<number>(450);
  const [isSendingTelemetry, setIsSendingTelemetry] = useState<boolean>(false);
  const [telemetryFeedback, setTelemetryFeedback] = useState<string | null>(null);

  const handleToggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleSendHardwareTelemetry = async () => {
    if (!currentPatient) return;
    setIsSendingTelemetry(true);
    try {
      await api.sendHardwareTelemetry(currentPatient.patient_id, {
        heart_rate: Number(feedHr),
        spo2: Number(feedSpo2),
        temperature: Number(feedTemp),
        iv_weight: Number(feedIvWeight),
        iv_remaining_ml: Number(feedIvWeight),
        device_id: currentPatient.device_id || `ESP32_${currentPatient.patient_id}`,
      });
      setTelemetryFeedback(`✓ Live telemetry ingested for ${currentPatient.patient_id} (HR: ${feedHr}, SpO2: ${feedSpo2}%, Temp: ${feedTemp}°C, IV: ${feedIvWeight}mL)`);
      setTimeout(() => setTelemetryFeedback(null), 4000);
    } catch (e: any) {
      setTelemetryFeedback(`Error: ${e.message}`);
    } finally {
      setIsSendingTelemetry(false);
    }
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
          {/* Room Badge (Locked for logged in patient) or Selector */}
          {loggedInPatientId ? (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-1.5 text-xs text-teal-800 font-semibold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>{currentPatient.room} — {currentPatient.name}</span>
              <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold border border-teal-300">
                Assigned Room
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-500">Room:</span>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-transparent text-teal-700 font-semibold focus:outline-none cursor-pointer"
              >
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id} className="bg-white text-slate-700">
                    {p.room} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
            }`}
            title="Toggle bedside chimes & audio feedback"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4" />}
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
          <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-white border border-teal-200/80 rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Safe & Monitored 24/7</span>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">{currentPatient.name}</h2>
            <p className="text-xs text-slate-600 mt-1">
              Location: <strong className="text-slate-800">{currentPatient.room}</strong> • Bed A • #{currentPatient.patient_id}
            </p>

            {/* Comfort Status Indicator */}
            <div className="mt-5 p-3.5 rounded-2xl bg-white/90 border border-teal-200 flex items-center gap-3 shadow-xs">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-xs font-bold text-teal-900">Continuous Monitoring Active</span>
                <p className="text-[11px] text-teal-700">Vitals telemetry is stable & securely tracked.</p>
              </div>
            </div>
          </div>

          {/* Assigned Care Team Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>Your Care Team On Duty</span>
            </h3>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {(currentPatient.assigned_nurse_name || 'N')[0]}
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Primary Nurse</span>
                <span className="text-sm font-bold text-slate-900">{currentPatient.assigned_nurse_name || 'Assigned Floor Nurse'}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">● On Shift • Stationed Nearby</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                Dr
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Attending Physician</span>
                <span className="text-sm font-bold text-slate-900">Dr. Michael Vance, MD</span>
                <span className="text-[10px] text-violet-600 font-semibold block mt-0.5">● Daily Rounds: 10:00 & 16:30</span>
              </div>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Ward Routine Schedule</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-mono">19:00</span>
                <span className="text-slate-800 font-medium">Evening Vitals Check</span>
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">Upcoming</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-mono">20:30</span>
                <span className="text-slate-800 font-medium">Oral Medication Round</span>
                <span className="text-[10px] text-slate-500">Scheduled</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-mono">22:00</span>
                <span className="text-slate-800 font-medium">Quiet Resting Hours</span>
                <span className="text-[10px] text-slate-500">Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right Column: IV Infusion Progress & Bedside Action Buttons */}
        <div className="md:col-span-2 space-y-6">
          {/* Friendly IV Infusion Progress Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{currentPatient.iv_fluid_name || 'Intravenous Hydration Infusion'}</h3>
                  <p className="text-[11px] text-slate-500">Continuous IV Fluid Oversight & Safety Monitoring</p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                iv.iv_state === 'NORMAL'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {iv.iv_state === 'NORMAL' ? 'Infusing Smoothly' : iv.iv_state}
              </span>
            </div>

            {/* Visual Fluid Progress Bar */}
            <div className="space-y-2 my-4">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-500 font-medium">Remaining Infusion Volume</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{ivPct}% Remaining ({iv.iv_remaining_ml.toFixed(0)} ml)</span>
              </div>

              <div className="w-full bg-slate-100 rounded-2xl h-4 p-1 border border-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 shadow-xs"
                  style={{ width: `${ivPct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1">
                <span>Drip rate: <strong className="font-mono">{iv.iv_flow.toFixed(0)} ml/hr</strong></span>
                <span className="text-teal-700 font-semibold">
                  Estimated ~{iv.estimated_time_to_empty_min?.toFixed(0) || '120'} minutes remaining
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              💡 <strong>Peace of Mind:</strong> Our smart monitoring automatically alerts your nurse 15 minutes before the fluid bag finishes. You do not need to watch the bag.
            </p>
          </div>

          {/* Live Vitals — Patient-Friendly Display */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Vitals — Live</h3>
                  <p className="text-[11px] text-slate-500">Updated every few seconds from your bedside sensor</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE STREAM
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Heart Rate */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
                <Heart className="w-5 h-5 text-rose-500 mx-auto mb-1.5" />
                <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                  {Math.round(currentPatient.current_vitals.heart_rate)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Heart Rate</span>
                <span className="text-[9px] text-rose-600 font-semibold">bpm</span>
              </div>

              {/* SpO2 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
                <Wind className="w-5 h-5 text-teal-600 mx-auto mb-1.5" />
                <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                  {currentPatient.current_vitals.spo2.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Oxygen Level</span>
                <span className="text-[9px] text-teal-600 font-semibold">% SpO₂</span>
              </div>

              {/* Temperature */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
                <Thermometer className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                  {currentPatient.current_vitals.temperature.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Temperature</span>
                <span className="text-[9px] text-amber-600 font-semibold">°C</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-3 text-center">
              💚 All values within safe range • Monitored continuously by TriagePulse AI
            </p>
          </div>

          {/* Nurse & Doctor Wait Time Estimation */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Estimated Care Wait Times</h3>
                <p className="text-[11px] text-slate-500">Live proximity & dispatch forecast</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Nurse Wait */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold text-teal-900">Nurse Check-In</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">
                    {currentPatient.request_active ? '~2' : '~12'}
                  </span>
                  <span className="text-xs text-teal-700 font-medium">minutes</span>
                </div>
                <p className="text-[10px] text-teal-800 mt-1.5">
                  {currentPatient.request_active 
                    ? `${currentPatient.assigned_nurse_name || 'Your nurse'} is on the way to ${currentPatient.room}` 
                    : 'Next scheduled vitals check-in'
                  }
                </p>
                {currentPatient.request_active && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-teal-600 animate-pulse" />
                    <span className="text-[10px] text-teal-800 font-semibold">En Route — ETA updating live</span>
                  </div>
                )}
              </div>

              {/* Doctor Wait */}
              <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-200">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="w-4 h-4 text-violet-700" />
                  <span className="text-xs font-bold text-violet-900">Physician Consult</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">~35</span>
                  <span className="text-xs text-violet-700 font-medium">minutes</span>
                </div>
                <p className="text-[10px] text-violet-800 mt-1.5">
                  Dr. Michael Vance • Next rounds at 16:30
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-violet-600" />
                  <span className="text-[10px] text-violet-800 font-semibold">Scheduled Daily Rounds</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
              ⏱️ Wait times are estimated based on nurse proximity, current workload, and ward activity. If urgent, press the <strong>Emergency</strong> button below.
            </p>
          </div>

          {/* Active Bedside Request Status */}
          {currentPatient.request_active && (
            <div className="bg-teal-50 border border-teal-300 rounded-3xl p-5 shadow-md flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-200 text-teal-800 flex items-center justify-center">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-teal-900">
                    Request Pending: {currentPatient.request_type || 'Assistance'}
                  </h4>
                  <p className="text-xs text-teal-700">
                    Notified {currentPatient.assigned_nurse_name || 'nurse station'}. Nurse is en route.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelRequest}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-teal-800 hover:bg-teal-100 border border-teal-300 shadow-xs transition-all"
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

          {/* TWO-WAY CARE TEAM COMMUNICATION & EMR SUMMARY (MERN HMS / OpenEMR / Danphe) */}
          <PatientCarePortal patient={currentPatient} />

          {/* HARDWARE SENSOR TELEMETRY FEEDER (ESP32 Stream Testing) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span>Hardware Sensor Stream & Telemetry Feeder ({currentPatient.patient_id} • {currentPatient.room})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Feed physical sensor telemetry via HTTP REST or test live dynamic vitals for {currentPatient.device_id || `ESP32_${currentPatient.patient_id}`}.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                DEVICE: {currentPatient.device_id || `ESP32_${currentPatient.patient_id}`}
              </span>
            </div>

            {telemetryFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 animate-in fade-in">
                {telemetryFeedback}
              </div>
            )}

            {/* Live Sliders / Input Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* HR */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Heart Rate</span>
                  <span className="font-mono font-bold text-rose-600">{feedHr} BPM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={feedHr}
                  onChange={(e) => setFeedHr(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">SpO2 Level</span>
                  <span className="font-mono font-bold text-teal-600">{feedSpo2}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="100"
                  value={feedSpo2}
                  onChange={(e) => setFeedSpo2(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Temperature */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Temperature</span>
                  <span className="font-mono font-bold text-amber-600">{feedTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="35.0"
                  max="40.5"
                  step="0.1"
                  value={feedTemp}
                  onChange={(e) => setFeedTemp(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* HX711 IV Volume */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">IV Fluid Vol</span>
                  <span className="font-mono font-bold text-violet-600">{feedIvWeight} mL</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={feedIvWeight}
                  onChange={(e) => setFeedIvWeight(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-500">
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  POST /api/hardware/telemetry
                </span>
                <span className="ml-2 hidden md:inline">Connects physical ESP32 MAX30102, DS18B20 & HX711 sensors</span>
              </div>

              <button
                onClick={handleSendHardwareTelemetry}
                disabled={isSendingTelemetry}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{isSendingTelemetry ? 'Transmitting...' : `Inject Sensor Telemetry to ${currentPatient.patient_id}`}</span>
              </button>
            </div>
          </div>

          {/* LARGE EMERGENCY SOS PANIC SWITCH */}
          <div className="bg-rose-50 border-2 border-rose-500 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-rose-950">Emergency Assistance (SOS)</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Press if you feel sudden dizziness, severe shortness of breath, or sharp pain. Dispatches nurse immediately.
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerSOS}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 border border-rose-500"
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
