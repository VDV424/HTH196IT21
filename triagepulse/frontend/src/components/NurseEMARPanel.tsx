import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Droplet, 
  Plus, 
  Check, 
  X, 
  Calendar, 
  Activity, 
  FileCheck,
  RefreshCw,
  Send,
  AlertTriangle
} from 'lucide-react';
import { Patient, Prescription, NursingCareTask, FluidBalance } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface NurseEMARPanelProps {
  patients: Patient[];
  currentNurseName: string;
  activeSubTab?: 'emar' | 'tasks' | 'fluids';
}

export const NurseEMARPanel: React.FC<NurseEMARPanelProps> = ({
  patients,
  currentNurseName,
  activeSubTab = 'emar'
}) => {
  const [currentTab, setCurrentTab] = useState<'emar' | 'tasks' | 'fluids'>(activeSubTab);
  const [selectedPid, setSelectedPid] = useState<string>(patients[0]?.patient_id || 'P01');

  // 1. eMAR Prescriptions State
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingRx, setLoadingRx] = useState<boolean>(true);
  const [administeringId, setAdministeringId] = useState<string | null>(null);
  const [rxSuccessMsg, setRxSuccessMsg] = useState<string | null>(null);

  // 2. Nursing Care Tasks State
  const [tasks, setTasks] = useState<NursingCareTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<string>('ROUTINE');
  const [taskDueTime, setTaskDueTime] = useState<string>('Next 1 Hour');
  const [creatingTask, setCreatingTask] = useState<boolean>(false);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState<string | null>(null);

  // 3. Fluid Balance State
  const [fluidRecords, setFluidRecords] = useState<FluidBalance[]>([]);
  const [loadingFluids, setLoadingFluids] = useState<boolean>(false);
  const [intakeType, setIntakeType] = useState<string>('IV Normal Saline');
  const [intakeMl, setIntakeMl] = useState<number>(250);
  const [outputType, setOutputType] = useState<string>('Urine Output');
  const [outputMl, setOutputMl] = useState<number>(200);
  const [fluidNotes, setFluidNotes] = useState<string>('');
  const [savingFluid, setSavingFluid] = useState<boolean>(false);
  const [fluidSuccessMsg, setFluidSuccessMsg] = useState<string | null>(null);

  // Fetch eMAR
  const fetchPrescriptions = async () => {
    try {
      const data = await api.getPrescriptions();
      setPrescriptions(data);
    } catch (err) {
      console.error('Failed to load eMAR prescriptions', err);
    } finally {
      setLoadingRx(false);
    }
  };

  // Fetch Tasks
  const fetchTasks = async () => {
    try {
      const data = await api.getNursingTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load nursing tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch Fluids for selected patient
  const fetchFluids = async (pid: string) => {
    setLoadingFluids(true);
    try {
      const data = await api.getFluidBalance(pid);
      setFluidRecords(data);
    } catch (err) {
      console.error('Failed to load fluid balance', err);
    } finally {
      setLoadingFluids(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchTasks();
    const interval = setInterval(() => {
      fetchPrescriptions();
      fetchTasks();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPid) {
      fetchFluids(selectedPid);
    }
  }, [selectedPid]);

  // Handle Medication Administration (eMAR)
  const handleAdministerMed = async (rx: Prescription) => {
    setAdministeringId(rx.prescription_id);
    try {
      await api.administerMedication(rx.prescription_id);
      sounds.playSuccessChime();
      setRxSuccessMsg(`Dose administered: ${rx.medication_name} (${rx.dosage}) to Patient ${rx.patient_id}`);
      setTimeout(() => setRxSuccessMsg(null), 3500);
      await fetchPrescriptions();
    } catch (err) {
      console.error('Failed to administer medication', err);
    } finally {
      setAdministeringId(null);
    }
  };

  // Handle Task Toggle
  const handleToggleTask = async (task: NursingCareTask) => {
    try {
      await api.toggleNursingTask(task.task_id);
      sounds.playSuccessChime();
      await fetchTasks();
    } catch (err) {
      console.error('Failed to toggle nursing task', err);
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setCreatingTask(true);
    try {
      const selP = patients.find(p => p.patient_id === selectedPid);
      await api.createNursingTask({
        patient_id: selectedPid,
        patient_name: selP ? selP.name : 'Unknown',
        room: selP ? selP.room : 'Ward',
        task_title: taskTitle.trim(),
        priority: taskPriority,
        due_time: taskDueTime,
        assigned_nurse: currentNurseName,
        status: 'PENDING'
      });
      sounds.playSuccessChime();
      setTaskTitle('');
      setTaskSuccessMsg('Nursing care task added to shift checklist');
      setTimeout(() => setTaskSuccessMsg(null), 3000);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to create nursing task', err);
    } finally {
      setCreatingTask(false);
    }
  };

  // Handle Record Fluid Balance
  const handleRecordFluid = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFluid(true);
    try {
      await api.recordFluidBalance({
        patient_id: selectedPid,
        intake_ml: intakeMl,
        intake_type: intakeType,
        output_ml: outputMl,
        output_type: outputType,
        recorded_by: currentNurseName,
        notes: fluidNotes.trim() || undefined
      });
      sounds.playSuccessChime();
      setFluidSuccessMsg(`Fluid balance recorded: +${intakeMl}ml in, -${outputMl}ml out`);
      setTimeout(() => setFluidSuccessMsg(null), 3000);
      setFluidNotes('');
      await fetchFluids(selectedPid);
    } catch (err) {
      console.error('Failed to record fluid balance', err);
    } finally {
      setSavingFluid(false);
    }
  };

  // Calculations for Fluid Balance
  const totalIntake = fluidRecords.reduce((acc, r) => acc + r.intake_ml, 0);
  const totalOutput = fluidRecords.reduce((acc, r) => acc + r.output_ml, 0);
  const netBalance = totalIntake - totalOutput;

  const activePatient = patients.find(p => p.patient_id === selectedPid) || patients[0];

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setCurrentTab('emar')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentTab === 'emar'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>eMAR Medication Administration</span>
          </button>

          <button
            onClick={() => setCurrentTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentTab === 'tasks'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Nursing Care Orders Checklist ({tasks.filter(t => t.status === 'PENDING').length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('fluids')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              currentTab === 'fluids'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Fluid Balance (I/O) Records</span>
          </button>
        </div>

        {/* Patient Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 whitespace-nowrap">Filter Patient:</span>
          <select
            value={selectedPid}
            onChange={(e) => setSelectedPid(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {patients.map(p => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name} ({p.room}) — {p.patient_id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: eMAR Medication Administration */}
      {/* ========================================================================= */}
      {currentTab === 'emar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                <span>Electronic Medication Administration Record (eMAR)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Verified doctor e-prescriptions with direct 1-tap administration logging and dosage tracking.
              </p>
            </div>
            <button
              onClick={fetchPrescriptions}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {rxSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2 shadow-sm animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{rxSuccessMsg}</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Patient & Room</th>
                    <th className="py-3 px-4">Medication & Strength</th>
                    <th className="py-3 px-4">Route & Frequency</th>
                    <th className="py-3 px-4">Prescribed By</th>
                    <th className="py-3 px-4">Last Administered</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Nurse Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptions.map((rx) => {
                    const isForSelected = rx.patient_id === selectedPid;
                    const isCompleted = rx.status === 'ADMINISTERED';
                    const isDiscontinued = rx.status === 'DISCONTINUED';

                    return (
                      <tr 
                        key={rx.prescription_id} 
                        className={`transition-colors ${isForSelected ? 'bg-teal-50/30' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{rx.patient_name}</strong>
                          <span className="text-[10px] font-mono text-slate-500">{rx.room} • {rx.patient_id}</span>
                        </td>

                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block text-xs">{rx.medication_name}</strong>
                          <span className="text-[11px] font-mono text-teal-700 font-semibold">{rx.dosage}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800 block">{rx.route}</span>
                          <span className="text-[10px] text-slate-500">{rx.frequency}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-700 block">{rx.prescribed_by}</span>
                          <span className="text-[10px] text-slate-400">Duration: {rx.duration}</span>
                        </td>

                        <td className="py-3 px-4">
                          {rx.last_administered ? (
                            <span className="font-mono text-slate-700 text-[11px] block">
                              {new Date(rx.last_administered).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Due for shift dose</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isDiscontinued
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {rx.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isDiscontinued && (
                              <button
                                onClick={() => handleAdministerMed(rx)}
                                disabled={administeringId === rx.prescription_id}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{administeringId === rx.prescription_id ? 'Logging...' : 'Administer Dose'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Danphe EMR Nursing Care Tasks Checklist */}
      {/* ========================================================================= */}
      {currentTab === 'tasks' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Checklist */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                    <span>Active Shift Care Tasks & Nursing Orders</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Danphe EMR integrated nursing workflow with 1-click status completion and stat prioritisation.
                  </p>
                </div>
                <button
                  onClick={fetchTasks}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {taskSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2 shadow-sm animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{taskSuccessMsg}</span>
                </div>
              )}

              {/* Task Items */}
              <div className="space-y-2.5">
                {tasks.map((task) => {
                  const isDone = task.status === 'COMPLETED';
                  const isStat = task.priority === 'STAT';
                  const isUrgent = task.priority === 'URGENT';

                  return (
                    <div
                      key={task.task_id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isDone
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isStat
                          ? 'bg-rose-50/60 border-rose-300 shadow-sm'
                          : isUrgent
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'bg-white border-slate-300 hover:border-teal-500'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isDone ? 'line-through text-slate-500' : 'text-slate-900'
                              }`}
                            >
                              {task.task_title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isStat
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                                  : isUrgent
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span>Patient: <strong className="text-slate-700">{task.patient_name} ({task.room})</strong></span>
                            <span>Due: <strong className="text-slate-700 font-mono">{task.due_time}</strong></span>
                            <span>Assigned: <strong className="text-slate-700">{task.assigned_nurse}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Add New Nursing Task Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <Plus className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">Add Nursing Order / Care Task</h4>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Patient:</label>
                  <select
                    value={selectedPid}
                    onChange={(e) => setSelectedPid(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.name} ({p.room})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Task Description:</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Check blood glucose before meal, Change surgical dressing..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Priority:</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium"
                    >
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent</option>
                      <option value="STAT">STAT (Immediate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Due Schedule:</label>
                    <select
                      value={taskDueTime}
                      onChange={(e) => setTaskDueTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium"
                    >
                      <option value="Immediately (STAT)">Immediately (STAT)</option>
                      <option value="Next 30 Minutes">Next 30 Min</option>
                      <option value="Next 1 Hour">Next 1 Hour</option>
                      <option value="Shift End Handover">Shift End</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingTask || !taskTitle.trim()}
                  className="w-full mt-2 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creatingTask ? 'Saving Task...' : 'Schedule Task'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Danphe EMR Fluid Balance (I/O) Records */}
      {/* ========================================================================= */}
      {currentTab === 'fluids' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Historical Fluid Log & Cumulative Balance */}
            <div className="lg:col-span-2 space-y-4">
              {/* Cumulative Balance Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-teal-600" />
                      <span>24-Hour Fluid Balance Summary: {activePatient.name}</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Room {activePatient.room} • Patient ID: {activePatient.patient_id}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold font-mono ${
                      netBalance >= 0 ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Net Balance: {netBalance > 0 ? `+${netBalance}` : netBalance} mL
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-center">
                    <span className="text-[10px] text-blue-700 font-semibold block uppercase">Total Intake</span>
                    <span className="text-lg font-bold font-mono text-blue-900">+{totalIntake} mL</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
                    <span className="text-[10px] text-amber-700 font-semibold block uppercase">Total Output</span>
                    <span className="text-lg font-bold font-mono text-amber-900">-{totalOutput} mL</span>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 text-center">
                    <span className="text-[10px] text-teal-700 font-semibold block uppercase">Fluid Status</span>
                    <span className="text-sm font-bold text-teal-900">
                      {Math.abs(netBalance) < 300 ? 'Euvolemic' : netBalance > 300 ? 'Positive Balance' : 'Negative Balance'}
                    </span>
                  </div>
                </div>
              </div>

              {fluidSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2 shadow-sm animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{fluidSuccessMsg}</span>
                </div>
              )}

              {/* Fluid Records Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Intake (mL)</th>
                        <th className="py-2.5 px-3">Output (mL)</th>
                        <th className="py-2.5 px-3">Net Step</th>
                        <th className="py-2.5 px-3">Recorded By</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fluidRecords.map((r) => (
                        <tr key={r.record_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {new Date(r.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-blue-700">+{r.intake_ml} mL</span>
                            <span className="text-[10px] text-slate-500 block">{r.intake_type}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-amber-700">-{r.output_ml} mL</span>
                            <span className="text-[10px] text-slate-500 block">{r.output_type}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {r.balance_ml > 0 ? `+${r.balance_ml}` : r.balance_ml} mL
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{r.recorded_by}</td>
                          <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">
                            {r.notes || '—'}
                          </td>
                        </tr>
                      ))}
                      {fluidRecords.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                            No fluid intake/output entries logged for this patient today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Col: Enter Fluid Entry Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <Droplet className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">Record Fluid Intake / Output</h4>
              </div>

              <form onSubmit={handleRecordFluid} className="space-y-3 text-xs">
                {/* Intake Sub-Section */}
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <span className="font-bold text-blue-900 block text-[11px] uppercase">Intake:</span>
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-0.5">Fluid Source / Type:</label>
                    <select
                      value={intakeType}
                      onChange={(e) => setIntakeType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium"
                    >
                      <option value="IV Normal Saline">IV 0.9% Normal Saline</option>
                      <option value="IV Lactated Ringers">IV Lactated Ringer's</option>
                      <option value="IV D5W">IV D5W 5% Dextrose</option>
                      <option value="Oral Water / Fluids">Oral Water / Clear Liquids</option>
                      <option value="Blood Products / PRBC">Blood Products (PRBC / Platelets)</option>
                      <option value="Enteral Tube Feed">Enteral Tube Feeding</option>
                      <option value="None">None (0 mL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-0.5">Volume (mL):</label>
                    <input
                      type="number"
                      value={intakeMl}
                      onChange={(e) => setIntakeMl(Number(e.target.value))}
                      min={0}
                      max={2000}
                      step={25}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Output Sub-Section */}
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
                  <span className="font-bold text-amber-900 block text-[11px] uppercase">Output:</span>
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-0.5">Output Type:</label>
                    <select
                      value={outputType}
                      onChange={(e) => setOutputType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium"
                    >
                      <option value="Urine Output">Urine Output (Catheter / Void)</option>
                      <option value="Surgical Wound Drain">Surgical Drain (JP / Hemovac)</option>
                      <option value="Nasogastric Aspirate">Nasogastric / GI Aspirate</option>
                      <option value="Emesis">Emesis</option>
                      <option value="None">None (0 mL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-0.5">Volume (mL):</label>
                    <input
                      type="number"
                      value={outputMl}
                      onChange={(e) => setOutputMl(Number(e.target.value))}
                      min={0}
                      max={2000}
                      step={25}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clinical Observation Notes:</label>
                  <input
                    type="text"
                    value={fluidNotes}
                    onChange={(e) => setFluidNotes(e.target.value)}
                    placeholder="e.g. Clear yellow urine, good peripheral perfusion..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingFluid}
                  className="w-full mt-2 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <Droplet className="w-3.5 h-3.5" />
                  <span>{savingFluid ? 'Saving Balance...' : 'Record I/O Balance'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
