import React, { useState, useEffect } from 'react';
import { 
  Bed, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  UserPlus, 
  X,
  Filter,
  Activity,
  Layers
} from 'lucide-react';
import { WardBed, Patient } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface WardBedManagementProps {
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
}

export const WardBedManagement: React.FC<WardBedManagementProps> = ({
  patients,
  onSelectPatient,
}) => {
  const [beds, setBeds] = useState<WardBed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterWard, setFilterWard] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState<boolean>(false);
  const [transferFromBed, setTransferFromBed] = useState<WardBed | null>(null);
  const [transferToBedId, setTransferToBedId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('Acuity Step-Down Transfer');
  const [transferring, setTransferring] = useState<boolean>(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState<string | null>(null);

  const fetchBeds = async () => {
    try {
      const data = await api.getWardBeds();
      setBeds(data);
    } catch (err) {
      console.error('Failed to fetch ward beds', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
    const interval = setInterval(fetchBeds, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (bedId: string, newStatus: string, isolation: string = 'Standard') => {
    try {
      await api.updateWardBedStatus(bedId, newStatus, isolation);
      sounds.playSuccessChime();
      setStatusSuccessMsg(`Bed ${bedId} updated to ${newStatus}`);
      setTimeout(() => setStatusSuccessMsg(null), 3000);
      await fetchBeds();
    } catch (err) {
      console.error('Failed to update bed status', err);
    }
  };

  const handleOpenTransfer = (bed: WardBed) => {
    setTransferFromBed(bed);
    // Find first available bed that isn't the current bed
    const firstAvail = beds.find(b => b.status === 'AVAILABLE' && b.bed_id !== bed.bed_id);
    setTransferToBedId(firstAvail ? firstAvail.bed_id : '');
    setTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromBed || !transferToBedId || !transferFromBed.patient_id) return;
    setTransferring(true);
    try {
      await api.transferPatientBed(
        transferFromBed.patient_id,
        transferFromBed.bed_id,
        transferToBedId,
        transferReason
      );
      sounds.playSuccessChime();
      setStatusSuccessMsg(`Successfully transferred ${transferFromBed.patient_name} to Bed ${transferToBedId}`);
      setTimeout(() => setStatusSuccessMsg(null), 4000);
      setTransferModalOpen(false);
      await fetchBeds();
    } catch (err) {
      console.error('Failed to execute bed transfer', err);
    } finally {
      setTransferring(false);
    }
  };

  // Filtered beds
  const filteredBeds = beds.filter(b => {
    if (filterWard !== 'ALL' && b.ward !== filterWard) return false;
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    return true;
  });

  const availableBeds = beds.filter(b => b.status === 'AVAILABLE');
  const occupiedBeds = beds.filter(b => b.status === 'OCCUPIED');
  const cleaningBeds = beds.filter(b => b.status === 'CLEANING');
  const isolationBeds = beds.filter(b => b.status === 'ISOLATION');

  return (
    <div className="space-y-6">
      {/* Top Banner / ADT Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                <Bed className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Inpatient Bed Matrix & ADT Console
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time bed tracking adapted from Frappe Health & Danphe EMR with live transfers & sanitization turnover.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBeds}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Matrix</span>
            </button>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500 block">Total Capacity</span>
            <span className="text-xl font-bold font-mono text-slate-900">{beds.length}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Configured Beds</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
            <span className="text-[11px] font-medium text-blue-700 block">Occupied</span>
            <span className="text-xl font-bold font-mono text-blue-800">{occupiedBeds.length}</span>
            <span className="text-[10px] text-blue-600 block mt-0.5">
              {beds.length > 0 ? Math.round((occupiedBeds.length / beds.length) * 100) : 0}% Utilization
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] font-medium text-emerald-700 block">Available / Ready</span>
            <span className="text-xl font-bold font-mono text-emerald-800">{availableBeds.length}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Immediate Intake</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[11px] font-medium text-amber-700 block">Sanitizing / Turnover</span>
            <span className="text-xl font-bold font-mono text-amber-800">{cleaningBeds.length}</span>
            <span className="text-[10px] text-amber-600 block mt-0.5">Terminal Clean In Progress</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
            <span className="text-[11px] font-medium text-purple-700 block">Negative Pressure / Isolation</span>
            <span className="text-xl font-bold font-mono text-purple-800">{isolationBeds.length}</span>
            <span className="text-[10px] text-purple-600 block mt-0.5">Airborne / Contact</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {statusSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusSuccessMsg}</span>
        </div>
      )}

      {/* Filter and View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Filter By Ward:</span>
          <select
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium"
          >
            <option value="ALL">All Wards</option>
            <option value="Intensive Care Unit (ICU)">ICU (Intensive Care)</option>
            <option value="General Medical Ward A">General Medical Ward A</option>
            <option value="Telemetry & Step-Down">Telemetry & Step-Down</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="AVAILABLE">Available</option>
            <option value="CLEANING">Cleaning</option>
            <option value="ISOLATION">Isolation</option>
          </select>
        </div>
      </div>

      {/* Bed Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => {
          const isOccupied = bed.status === 'OCCUPIED';
          const isAvailable = bed.status === 'AVAILABLE';
          const isCleaning = bed.status === 'CLEANING';
          const isIsolation = bed.status === 'ISOLATION';

          const matchingPatient = patients.find(p => p.patient_id === bed.patient_id);

          return (
            <div
              key={bed.bed_id}
              className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                isOccupied
                  ? 'bg-white border-blue-200 shadow-sm'
                  : isAvailable
                  ? 'bg-emerald-50/40 border-emerald-200 shadow-sm'
                  : isCleaning
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-purple-50/40 border-purple-200'
              }`}
            >
              <div>
                {/* Bed Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-slate-900">{bed.bed_id}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {bed.room}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      isOccupied
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : isAvailable
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isCleaning
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {bed.status}
                  </span>
                </div>

                {/* Ward and Precaution Details */}
                <div className="py-2.5 space-y-1 text-xs">
                  <div className="text-[11px] text-slate-500 font-medium">
                    {bed.ward}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Isolation:</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      bed.isolation !== 'Standard'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {bed.isolation}
                    </span>
                  </div>
                </div>

                {/* Patient Information if Occupied */}
                {isOccupied && bed.patient_name ? (
                  <div className="mt-2 p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-slate-900">{bed.patient_name}</strong>
                      <span className="text-[10px] font-mono text-blue-700 font-semibold">{bed.patient_id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                      <div>
                        <span>LOS: </span>
                        <strong className="text-slate-800">{matchingPatient?.length_of_stay_hrs ? `${matchingPatient.length_of_stay_hrs.toFixed(1)} hrs` : '12.4 hrs'}</strong>
                      </div>
                      <div>
                        <span>Type: </span>
                        <strong className="text-teal-700">
                          {bed.bed_type}
                        </strong>
                      </div>
                    </div>

                    {matchingPatient && onSelectPatient && (
                      <button
                        onClick={() => onSelectPatient(matchingPatient)}
                        className="w-full mt-1 py-1 rounded-lg bg-white hover:bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                      >
                        <Activity className="w-3 h-3 text-blue-600" />
                        <span>Inspect Patient Telemetry</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-medium">
                      {isAvailable ? 'Bed sanitized and ready for admission' :
                       isCleaning ? 'Housekeeping terminal clean underway' :
                       'Special negative pressure isolation hold'}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isOccupied ? (
                  <button
                    onClick={() => handleOpenTransfer(bed)}
                    className="w-full py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer Bed (ADT)</span>
                  </button>
                ) : isCleaning ? (
                  <button
                    onClick={() => handleStatusChange(bed.bed_id, 'AVAILABLE')}
                    className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Clean & Free Bed</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(bed.bed_id, 'CLEANING')}
                      className="flex-1 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all"
                    >
                      Start Clean
                    </button>
                    <button
                      onClick={() => handleStatusChange(bed.bed_id, bed.status === 'ISOLATION' ? 'AVAILABLE' : 'ISOLATION', 'Airborne Isolation')}
                      className="py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold transition-all"
                      title="Toggle Airborne Isolation"
                    >
                      {bed.status === 'ISOLATION' ? 'Remove Iso' : 'Iso Hold'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADT Patient Bed Transfer Modal */}
      {transferModalOpen && transferFromBed && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <ArrowRightLeft className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Patient Bed Transfer (ADT)
                </h3>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 block">Transferring Patient:</span>
                <strong className="text-sm text-slate-900 block">{transferFromBed.patient_name}</strong>
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: {transferFromBed.patient_id} • Current Bed: {transferFromBed.bed_id} ({transferFromBed.room})
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Destination Available Bed:
                </label>
                <select
                  value={transferToBedId}
                  onChange={(e) => setTransferToBedId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="" disabled>Select Target Bed</option>
                  {beds
                    .filter(b => b.status === 'AVAILABLE' && b.bed_id !== transferFromBed.bed_id)
                    .map(b => (
                      <option key={b.bed_id} value={b.bed_id}>
                        {b.bed_id} — {b.room} ({b.ward})
                      </option>
                    ))}
                </select>
                {beds.filter(b => b.status === 'AVAILABLE').length === 0 && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    No available beds in the ward. Release or complete cleaning of another bed first.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Clinical Transfer Rationale:
                </label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Acuity Step-Down Transfer">Acuity Step-Down Transfer (ICU to General)</option>
                  <option value="Acuity Escalation / ICU Upgrade">Acuity Escalation / ICU Upgrade</option>
                  <option value="Airborne / Contact Isolation Required">Airborne / Contact Isolation Required</option>
                  <option value="Specialist Monitoring / Telemetry Bed">Specialist Monitoring / Telemetry Bed</option>
                  <option value="Patient Dignity & Private Room Accommodation">Patient Dignity & Private Room Accommodation</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferToBedId}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{transferring ? 'Executing Transfer...' : 'Confirm Transfer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
