import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Pill, 
  FlaskConical, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  Check, 
  XCircle,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Activity,
  Droplet
} from 'lucide-react';
import { Patient, ClinicalEncounter, Prescription, LabOrder, Appointment } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface DoctorEMRPanelProps {
  patients: Patient[];
  selectedPatientId?: string;
  onSelectPatient?: (patient: Patient) => void;
  activeSection: 'encounters' | 'prescriptions' | 'labs' | 'appointments';
}

export const DoctorEMRPanel: React.FC<DoctorEMRPanelProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  activeSection
}) => {
  const [currentPid, setCurrentPid] = useState<string>(selectedPatientId || patients[0]?.patient_id || 'P01');
  const activePatient = patients.find(p => p.patient_id === currentPid) || patients[0];

  // 1. Clinical Encounters State
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [encounterType, setEncounterType] = useState<string>('Daily Clinical Rounds');
  const [icd10Code, setIcd10Code] = useState<string>('A41.9 (Sepsis, unspecified organism)');
  const [subjective, setSubjective] = useState<string>('');
  const [objective, setObjective] = useState<string>('');
  const [assessment, setAssessment] = useState<string>('');
  const [plan, setPlan] = useState<string>('');
  const [savingEncounter, setSavingEncounter] = useState<boolean>(false);
  const [encounterSuccessMsg, setEncounterSuccessMsg] = useState<string | null>(null);

  // 2. Prescriptions State
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medication, setMedication] = useState<string>('0.9% Normal Saline');
  const [dosage, setDosage] = useState<string>('1000 mL');
  const [frequency, setFrequency] = useState<string>('Continuous Infusion');
  const [route, setRoute] = useState<string>('IV Infusion');
  const [duration, setDuration] = useState<string>('24 hours');
  const [savingRx, setSavingRx] = useState<boolean>(false);
  const [rxSuccessMsg, setRxSuccessMsg] = useState<string | null>(null);

  // 3. Lab Orders State
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [testName, setTestName] = useState<string>('Complete Blood Count (WBC)');
  const [category, setCategory] = useState<string>('Hematology');
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [refRange, setRefRange] = useState<string>('4.5 - 11.0 x10^9/L');
  const [savingLab, setSavingLab] = useState<boolean>(false);
  const [labSuccessMsg, setLabSuccessMsg] = useState<string | null>(null);
  const [enteringResultId, setEnteringResultId] = useState<string | null>(null);
  const [resultInput, setResultInput] = useState<string>('');
  const [flagInput, setFlagInput] = useState<string>('NORMAL');

  // 4. Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [aptDept, setAptDept] = useState<string>('Internal Medicine');
  const [aptTime, setAptTime] = useState<string>('03:30 PM');
  const [aptDate, setAptDate] = useState<string>('Today');
  const [aptReason, setAptReason] = useState<string>('Post-operative clinical recovery assessment');
  const [savingApt, setSavingApt] = useState<boolean>(false);
  const [aptSuccessMsg, setAptSuccessMsg] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    try {
      const [encData, rxData, labsData, aptData] = await Promise.all([
        api.getEncounters(currentPid),
        api.getPrescriptions(currentPid),
        api.getLabOrders(currentPid),
        api.getAppointments(currentPid),
      ]);
      setEncounters(encData);
      setPrescriptions(rxData);
      setLabOrders(labsData);
      setAppointments(aptData);
    } catch (e) {
      console.error('Failed to load EMR records', e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [currentPid]);

  // Pre-fill objective vitals when patient changes
  useEffect(() => {
    if (activePatient) {
      setObjective(
        `Vitals: HR ${activePatient.current_vitals.heart_rate} bpm, SpO2 ${activePatient.current_vitals.spo2}%, Temp ${activePatient.current_vitals.temperature}°C. IV Bag: ${activePatient.current_iv.iv_remaining_ml} mL (${activePatient.current_iv.iv_state}). Trajectory Priority: ${activePatient.trajectory.attention_priority.toFixed(1)}.`
      );
    }
  }, [activePatient]);

  // 1. Submit SOAP Encounter
  const handleSaveEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment.trim() || !plan.trim()) return;
    setSavingEncounter(true);
    try {
      await api.createEncounter({
        patient_id: currentPid,
        doctor_id: 'D01',
        doctor_name: 'Dr. Michael Vance',
        encounter_type: encounterType,
        subjective: subjective || 'Patient interviewed during clinical rounds.',
        objective: objective,
        assessment: assessment,
        plan: plan,
        icd10_code: icd10Code,
      });
      sounds.playSuccessChime();
      setEncounterSuccessMsg('Encounter note successfully signed & stored in patient EHR record.');
      setSubjective('');
      setAssessment('');
      setPlan('');
      setTimeout(() => setEncounterSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Error saving encounter: ${err.message}`);
    } finally {
      setSavingEncounter(false);
    }
  };

  // 2. Submit Prescription
  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRx(true);
    try {
      await api.createPrescription({
        patient_id: currentPid,
        doctor_id: 'D01',
        doctor_name: 'Dr. Michael Vance',
        medication,
        dosage,
        frequency,
        route,
        duration,
      });
      sounds.playSuccessChime();
      setRxSuccessMsg(`e-Prescription for "${medication} ${dosage}" authorized and transmitted to ward eMAR.`);
      setTimeout(() => setRxSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Error prescribing: ${err.message}`);
    } finally {
      setSavingRx(false);
    }
  };

  // Discontinue Rx
  const handleDiscontinueRx = async (rxId: string) => {
    try {
      await api.discontinueMedication(rxId);
      sounds.playSuccessChime();
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // 3. Submit Lab Order
  const handleSaveLabOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLab(true);
    try {
      await api.createLabOrder({
        patient_id: currentPid,
        doctor_name: 'Dr. Michael Vance',
        test_name: testName,
        category,
        priority,
        reference_range: refRange,
      });
      sounds.playSuccessChime();
      setLabSuccessMsg(`Laboratory investigation ordered: ${testName} (${priority}).`);
      setTimeout(() => setLabSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Error ordering lab: ${err.message}`);
    } finally {
      setSavingLab(false);
    }
  };

  // Enter Lab Result
  const handleEnterResult = async (orderId: string) => {
    if (!resultInput.trim()) return;
    try {
      await api.enterLabResult(orderId, resultInput, flagInput);
      sounds.playSuccessChime();
      setEnteringResultId(null);
      setResultInput('');
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // 4. Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingApt(true);
    try {
      await api.bookAppointment({
        patient_id: currentPid,
        patient_name: activePatient.name,
        doctor_name: 'Dr. Michael Vance',
        department: aptDept,
        appointment_date: aptDate,
        appointment_time: aptTime,
        reason: aptReason,
      });
      sounds.playSuccessChime();
      setAptSuccessMsg(`Consultation scheduled for ${activePatient.name} with ${aptDept}.`);
      setTimeout(() => setAptSuccessMsg(null), 4000);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingApt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Selector Bar for EMR Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center font-bold">
            {activePatient.room.replace('Room ', 'R')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{activePatient.name}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {activePatient.patient_id} • {activePatient.room}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activePatient.trajectory.physiological_level === 'HIGH'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {activePatient.trajectory.physiological_level} PRIORITY
              </span>
            </div>
            <p className="text-xs text-slate-500">Diagnosis: {activePatient.scenario} • Length of Stay: {activePatient.length_of_stay_hrs || 24}h</p>
          </div>
        </div>

        {/* Change Patient Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Switch Patient:</span>
          <select
            value={currentPid}
            onChange={(e) => {
              setCurrentPid(e.target.value);
              const p = patients.find(item => item.patient_id === e.target.value);
              if (p && onSelectPatient) onSelectPatient(p);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
          >
            {patients.map(p => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.room} — {p.name} ({p.patient_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CLINICAL ENCOUNTERS (OpenEMR SOAP Notes) */}
      {/* ========================================================================= */}
      {activeSection === 'encounters' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                <h3 className="font-bold text-slate-900 text-base">Author New Clinical Encounter (SOAP Format)</h3>
              </div>
              <span className="text-xs text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200 font-semibold">
                OpenEMR / ONC-Certified Architecture
              </span>
            </div>

            {encounterSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{encounterSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEncounter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Encounter Type</label>
                  <select
                    value={encounterType}
                    onChange={(e) => setEncounterType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="Daily Clinical Rounds">Daily Clinical Rounds</option>
                    <option value="Admission History & Physical (H&P)">Admission History & Physical (H&P)</option>
                    <option value="Emergency Deterioration Consult">Emergency Deterioration Consult</option>
                    <option value="Discharge Summary & Instructions">Discharge Summary & Instructions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ICD-10 Diagnostic Code</label>
                  <select
                    value={icd10Code}
                    onChange={(e) => setIcd10Code(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="A41.9 (Sepsis, unspecified organism)">A41.9 (Sepsis, unspecified organism)</option>
                    <option value="I50.9 (Heart Failure, unspecified)">I50.9 (Heart Failure, unspecified)</option>
                    <option value="J18.9 (Pneumonia, unspecified organism)">J18.9 (Pneumonia, unspecified organism)</option>
                    <option value="E86.0 (Dehydration & Hypovolemia)">E86.0 (Dehydration & Hypovolemia)</option>
                    <option value="I21.9 (Acute Myocardial Infarction)">I21.9 (Acute Myocardial Infarction)</option>
                    <option value="R68.89 (Other general symptoms and signs)">R68.89 (Other general symptoms)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* S - Subjective */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span className="text-violet-700 font-mono mr-1">[S]</span> Subjective (Symptoms & History)
                  </label>
                  <textarea
                    rows={3}
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    placeholder="Patient describes dizziness when standing, mild nausea overnight..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* O - Objective */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span className="text-violet-700 font-mono mr-1">[O]</span> Objective (Exam & Telemetry Vitals)
                  </label>
                  <textarea
                    rows={3}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* A - Assessment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span className="text-violet-700 font-mono mr-1">[A]</span> Assessment (Clinical Impression) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Hemodynamic stability compromised secondary to fluid deficit. NEWS2 score reflects moderate risk..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* P - Plan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span className="text-violet-700 font-mono mr-1">[P]</span> Plan (Orders & Disposition) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="1. Administer 500 mL LR bolus. 2. Stat CBC & Electrolytes. 3. Continue telemetry monitoring..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingEncounter}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-violet-600/30 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{savingEncounter ? 'Saving...' : 'Authorize & Store SOAP Note'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Historical Encounter Notes Timeline */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Historical Clinical Encounters ({encounters.length})</h4>
            {encounters.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No previous encounter records for {activePatient.name}.</p>
            ) : (
              <div className="space-y-3">
                {encounters.map(enc => (
                  <div key={enc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{enc.encounter_type}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-semibold">
                          {enc.icd10_code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {enc.doctor_name} • {new Date(enc.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <strong className="text-slate-700 font-mono">[S]</strong> <span className="text-slate-600">{enc.subjective}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700 font-mono">[O]</strong> <span className="text-slate-600">{enc.objective}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700 font-mono">[A]</strong> <span className="text-slate-800 font-medium">{enc.assessment}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700 font-mono">[P]</strong> <span className="text-slate-800 font-medium">{enc.plan}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. e-PRESCRIPTIONS & eMAR (OpenEMR / Danphe EMR) */}
      {/* ========================================================================= */}
      {activeSection === 'prescriptions' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base">Write Electronic Prescription (e-Prescription)</h3>
              </div>
              <span className="text-xs text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-semibold">
                Direct Pharmacy & eMAR Link
              </span>
            </div>

            {rxSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{rxSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePrescription} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medication Name</label>
                  <select
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 font-medium"
                  >
                    <option value="0.9% Normal Saline">0.9% Normal Saline (1000 mL)</option>
                    <option value="Lactated Ringer's Solution">Lactated Ringer's Solution (1000 mL)</option>
                    <option value="5% Dextrose in Water (D5W)">5% Dextrose in Water (500 mL)</option>
                    <option value="Ceftriaxone IV">Ceftriaxone IV</option>
                    <option value="Norepinephrine">Norepinephrine (Levophed)</option>
                    <option value="Paracetamol (Acetaminophen)">Paracetamol (Acetaminophen)</option>
                    <option value="Ondansetron (Zofran)">Ondansetron (Zofran)</option>
                    <option value="Furosemide (Lasix)">Furosemide (Lasix)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 1000 mL, 1g, 40mg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency & Timing</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                  >
                    <option value="Continuous Infusion">Continuous Infusion</option>
                    <option value="STAT Bolus over 1 hour">STAT Bolus over 1 hour</option>
                    <option value="Q24H (Once Daily)">Q24H (Once Daily)</option>
                    <option value="Q12H (Twice Daily)">Q12H (Twice Daily)</option>
                    <option value="Q8H (Every 8 Hours)">Q8H (Every 8 Hours)</option>
                    <option value="PRN (As Needed for Pain/Fever)">PRN (As Needed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Route of Administration</label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                  >
                    <option value="IV Infusion">IV Infusion (Peristaltic Pump)</option>
                    <option value="IV Push">IV Push (Slow)</option>
                    <option value="Oral">Oral (PO)</option>
                    <option value="Subcutaneous">Subcutaneous (SC)</option>
                    <option value="Nebulized">Nebulized Inhalation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 24 hours, 3 days, 7 days"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingRx}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-teal-600/30"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>{savingRx ? 'Submitting...' : 'Authorize & Sign Prescription'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Medication Orders Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Active & Administered Prescriptions ({prescriptions.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">Rx ID</th>
                    <th className="py-2.5 px-3">Medication</th>
                    <th className="py-2.5 px-3">Dosage / Route</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Prescribed At</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptions.map(rx => (
                    <tr key={rx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{rx.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{rx.medication}</td>
                      <td className="py-2.5 px-3 text-slate-700">{rx.dosage} • {rx.route}</td>
                      <td className="py-2.5 px-3 text-slate-600">{rx.frequency}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rx.status === 'Active'
                            ? 'bg-teal-100 text-teal-800'
                            : rx.status === 'Administered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {rx.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(rx.prescribed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {rx.status === 'Active' && (
                          <button
                            onClick={() => handleDiscontinueRx(rx.id)}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200"
                          >
                            Discontinue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LABORATORY & DIAGNOSTICS (Danphe EMR / Frappe Health) */}
      {/* ========================================================================= */}
      {activeSection === 'labs' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Order Laboratory Investigations & Pathology</h3>
              </div>
              <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold">
                Danphe EMR / Laboratory Module
              </span>
            </div>

            {labSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{labSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveLabOrder} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Investigation Name</label>
                <select
                  value={testName}
                  onChange={(e) => {
                    setTestName(e.target.value);
                    if (e.target.value.includes('WBC') || e.target.value.includes('CBC')) {
                      setCategory('Hematology');
                      setRefRange('4.5 - 11.0 x10^9/L');
                    } else if (e.target.value.includes('Lactate')) {
                      setCategory('Biochemistry');
                      setRefRange('0.5 - 2.0 mmol/L');
                    } else if (e.target.value.includes('Blood Gas')) {
                      setCategory('Blood Gas');
                      setRefRange('80 - 100 mmHg');
                    } else if (e.target.value.includes('Potassium')) {
                      setCategory('Biochemistry');
                      setRefRange('3.5 - 5.0 mmol/L');
                    } else if (e.target.value.includes('Troponin')) {
                      setCategory('Cardiac');
                      setRefRange('< 0.04 ng/mL');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 font-medium"
                >
                  <option value="Complete Blood Count (WBC)">Complete Blood Count (WBC)</option>
                  <option value="Serum Lactate">Serum Lactate (Sepsis marker)</option>
                  <option value="Arterial Blood Gas (PaO2)">Arterial Blood Gas (PaO2)</option>
                  <option value="Serum Potassium (K+)">Serum Potassium (K+)</option>
                  <option value="Troponin-I">Troponin-I (Cardiac injury)</option>
                  <option value="Blood Urea Nitrogen (BUN)">Blood Urea Nitrogen (BUN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  readOnly
                  value={category}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-100 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                >
                  <option value="ROUTINE">ROUTINE (Standard Run)</option>
                  <option value="URGENT">URGENT (30 min)</option>
                  <option value="STAT">STAT (Emergency Run)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingLab}
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>{savingLab ? 'Ordering...' : 'Order Lab Test'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Results Table with inline result entry */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Laboratory Diagnostic Records ({labOrders.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Test Name</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3">Ref Range</th>
                    <th className="py-2.5 px-3">Flag</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labOrders.map(lab => (
                    <tr key={lab.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{lab.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{lab.test_name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lab.priority === 'STAT'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : lab.priority === 'URGENT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {lab.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {lab.status === 'RESULT_AVAILABLE' ? 'Available' : 'Ordered'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {lab.result_value || <span className="text-slate-400 font-normal italic">Pending</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{lab.reference_range}</td>
                      <td className="py-2.5 px-3">
                        {lab.flag && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lab.flag === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : lab.flag === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {lab.flag}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {lab.status !== 'RESULT_AVAILABLE' && (
                          <button
                            onClick={() => {
                              setEnteringResultId(lab.id);
                              setResultInput('');
                              setFlagInput('NORMAL');
                            }}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                          >
                            Enter Result
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inline Enter Result Form */}
            {enteringResultId && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">Enter Pathology Result for {enteringResultId}</span>
                  <button onClick={() => setEnteringResultId(null)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={resultInput}
                    onChange={(e) => setResultInput(e.target.value)}
                    placeholder="Result value (e.g. 14.2 x10^9/L)"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                  <select
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="NORMAL">NORMAL (Within Limits)</option>
                    <option value="HIGH">HIGH (Above Range)</option>
                    <option value="LOW">LOW (Below Range)</option>
                    <option value="CRITICAL">CRITICAL (Alert Required)</option>
                  </select>
                  <button
                    onClick={() => handleEnterResult(enteringResultId)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Save Result to EHR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONSULTATION APPOINTMENTS (MERN HMS) */}
      {/* ========================================================================= */}
      {activeSection === 'appointments' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Schedule Inpatient Clinical Consultation</h3>
              </div>
              <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-semibold">
                MERN HMS Consultation Model
              </span>
            </div>

            {aptSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aptSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={aptDept}
                  onChange={(e) => setAptDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                >
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Infectious Disease">Infectious Disease</option>
                  <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                <input
                  type="text"
                  value={aptTime}
                  onChange={(e) => setAptTime(e.target.value)}
                  placeholder="e.g. 03:00 PM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Reason</label>
                <input
                  type="text"
                  value={aptReason}
                  onChange={(e) => setAptReason(e.target.value)}
                  placeholder="Reason for consult..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingApt}
                  className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{savingApt ? 'Booking...' : 'Book Consult'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Appointments Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Scheduled Consultations & Follow-ups ({appointments.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">Appt ID</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map(apt => (
                    <tr key={apt.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{apt.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{apt.patient_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{apt.department}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{apt.appointment_time}</td>
                      <td className="py-2.5 px-3 text-slate-600">{apt.reason}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {apt.status === 'SCHEDULED' && (
                          <button
                            onClick={async () => {
                              await api.updateAppointmentStatus(apt.id, 'COMPLETED');
                              sounds.playSuccessChime();
                              await loadData();
                            }}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-300"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
