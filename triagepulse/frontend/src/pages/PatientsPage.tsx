import React, { useState } from 'react';
import { Patient } from '../types';
import { PatientCard } from '../components/PatientCard';
import { Search, Plus, LayoutGrid, List, Filter } from 'lucide-react';
import { api } from '../services/api';

interface PatientsPageProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const PatientsPage: React.FC<PatientsPageProps> = ({ patients, onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('PRIORITY');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAdding, setIsAdding] = useState(false);

  const filters = [
    { id: 'ALL', label: 'All Beds' },
    { id: 'STABLE', label: 'Stable' },
    { id: 'WATCH', label: 'Watch' },
    { id: 'REVIEW', label: 'Review' },
    { id: 'HIGH_ATTENTION', label: 'High Attention' },
    { id: 'IV_TASK', label: 'IV Task' },
    { id: 'SENSOR_ISSUE', label: 'Sensor Issue' },
    { id: 'UNASSIGNED', label: 'Unassigned' },
  ];

  // Filtering
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.assigned_nurse_name && p.assigned_nurse_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const pri = p.trajectory.attention_priority;
    if (activeFilter === 'STABLE') return pri < 35;
    if (activeFilter === 'WATCH') return pri >= 35 && pri < 55;
    if (activeFilter === 'REVIEW') return pri >= 55 && pri < 70;
    if (activeFilter === 'HIGH_ATTENTION') return pri >= 70;
    if (activeFilter === 'IV_TASK') return p.trajectory.iv_urgency_score >= 50 || p.current_iv.iv_state !== 'NORMAL';
    if (activeFilter === 'SENSOR_ISSUE') return p.current_vitals.signal_quality !== 'GOOD';
    if (activeFilter === 'UNASSIGNED') return !p.assigned_nurse_name || p.assigned_nurse_name === 'Unassigned';

    return true;
  });

  // Sorting
  filteredPatients.sort((a, b) => {
    if (sortBy === 'PRIORITY') return b.trajectory.attention_priority - a.trajectory.attention_priority;
    if (sortBy === 'DETERIORATION') return b.trajectory.deterioration_score - a.trajectory.deterioration_score;
    if (sortBy === 'IV_URGENCY') return b.trajectory.iv_urgency_score - a.trajectory.iv_urgency_score;
    if (sortBy === 'ROOM') return a.room.localeCompare(b.room);
    return 0;
  });

  const handleAddPatient = async () => {
    setIsAdding(true);
    try {
      await api.addPatient();
    } catch (e) {
      console.error('Failed to add patient:', e);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Filters, Add, View toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient ID, room, scenario, nurse..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sorting */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="PRIORITY">Attention Priority</option>
              <option value="DETERIORATION">Deterioration Score</option>
              <option value="IV_URGENCY">IV Urgency</option>
              <option value="ROOM">Room Number</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}
              title="Card Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Simulated Patient Button */}
          <button
            onClick={handleAddPatient}
            disabled={isAdding || patients.length >= 20}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Patient Bed ({patients.length}/20)</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
              activeFilter === f.id
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-slate-500 text-xs ml-auto">
          Showing {filteredPatients.length} of {patients.length} beds
        </span>
      </div>

      {/* Display: Grid or Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPatients.map((p) => (
            <PatientCard key={p.patient_id} patient={p} onSelect={onSelectPatient} />
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-3">Room</th>
                <th className="py-3 px-3">HR</th>
                <th className="py-3 px-3">SpO₂</th>
                <th className="py-3 px-3">Temp</th>
                <th className="py-3 px-3">IV Remaining</th>
                <th className="py-3 px-3">Attention Score</th>
                <th className="py-3 px-3">Nurse</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredPatients.map((p) => (
                <tr key={p.patient_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-sans font-bold text-white">{p.patient_id}</td>
                  <td className="py-3 px-3">{p.room}</td>
                  <td className="py-3 px-3">{p.current_vitals.heart_rate.toFixed(0)} bpm</td>
                  <td className="py-3 px-3">{p.current_vitals.spo2.toFixed(1)}%</td>
                  <td className="py-3 px-3">{p.current_vitals.temperature.toFixed(1)}°C</td>
                  <td className="py-3 px-3">{p.current_iv.iv_remaining_ml.toFixed(0)} mL</td>
                  <td className="py-3 px-3 text-cyan-400 font-bold">{p.trajectory.attention_priority.toFixed(0)}</td>
                  <td className="py-3 px-3 font-sans">{p.assigned_nurse_name || 'Unassigned'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectPatient(p)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 text-white font-sans text-xs"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
