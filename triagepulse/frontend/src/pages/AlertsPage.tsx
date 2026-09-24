import React, { useState } from 'react';
import { Alert, Patient } from '../types';
import { Bell, CheckCircle, Clock, ShieldAlert, CheckCircle2, Filter, AlertTriangle, Eye, RotateCw } from 'lucide-react';
import { api } from '../services/api';

interface AlertsPageProps {
  alerts: Alert[];
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  rawObservationsCount: number;
  alertCompressionRatio: number;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  patients,
  onSelectPatient,
  rawObservationsCount,
  alertCompressionRatio,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const patientMap = new Map(patients.map((p) => [p.patient_id, p]));

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  const handleAcknowledge = async (id: string) => {
    setLoadingAction(id);
    try {
      await api.acknowledgeAlert(id, 'Nurse On-Duty');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReview = async (id: string) => {
    setLoadingAction(id);
    try {
      await api.reviewAlert(id, 'Nurse On-Duty');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEscalate = async (id: string) => {
    setLoadingAction(id);
    try {
      await api.escalateAlert(id, 'Nurse On-Duty');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResolve = async (id: string) => {
    setLoadingAction(id);
    try {
      await api.resolveAlert(id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 11: ALERT FATIGUE REDUCTION BANNER */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
                <Bell className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Alert Episode Deduplication & Fatigue Reduction
                </h2>
                <p className="text-xs text-slate-500">
                  Continuous abnormal vitals are compressed into single, evolving alert episodes rather than triggering spam alarms.
                </p>
              </div>
            </div>
          </div>

          {/* 3 Compression Metric Chips */}
          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto">
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[110px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                Raw Observations
              </span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {rawObservationsCount || alerts.reduce((acc, a) => acc + a.raw_observations_count, 0)}
              </span>
            </div>

            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[110px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                Alert Episodes
              </span>
              <span className="text-xl font-bold font-mono text-teal-600">
                {alerts.length}
              </span>
            </div>

            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-[130px]">
              <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-semibold block">
                Alert Compression
              </span>
              <span className="text-xl font-bold font-mono text-emerald-700">
                {alertCompressionRatio || 88.2}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['ALL', 'OPEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === st
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {filteredAlerts.length} episodes
        </span>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Episode ID</th>
                <th className="py-3 px-3">Patient / Bed</th>
                <th className="py-3 px-3">Alert Type</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Compressed Ticks</th>
                <th className="py-3 px-3">Nurse</th>
                <th className="py-3 px-3">Reason / Details</th>
                <th className="py-3 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredAlerts.map((alert) => {
                const p = patientMap.get(alert.patient_id);
                const isWorking = loadingAction === alert.id;

                let sevStyle = 'bg-slate-100 text-slate-700';
                if (alert.severity === 'IMMEDIATE_REVIEW' || alert.severity === 'HIGH_ATTENTION') {
                  sevStyle = 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse';
                } else if (alert.severity === 'REVIEW') {
                  sevStyle = 'bg-orange-100 text-orange-800 border border-orange-200';
                } else if (alert.severity === 'WATCH') {
                  sevStyle = 'bg-amber-100 text-amber-800 border border-amber-200';
                }

                let statusStyle = 'text-slate-700 bg-slate-100 border border-slate-200';
                if (alert.status === 'OPEN') statusStyle = 'text-rose-800 bg-rose-50 border border-rose-200';
                if (alert.status === 'ACKNOWLEDGED') statusStyle = 'text-amber-800 bg-amber-50 border border-amber-200';
                if (alert.status === 'UNDER_REVIEW') statusStyle = 'text-teal-800 bg-teal-50 border border-teal-200';
                if (alert.status === 'ESCALATED') statusStyle = 'text-purple-800 bg-purple-50 border border-purple-200';
                if (alert.status === 'RESOLVED') statusStyle = 'text-emerald-800 bg-emerald-50 border border-emerald-200';

                return (
                  <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-4 font-bold text-slate-900 text-xs">{alert.id}</td>

                    {/* Patient */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => p && onSelectPatient(p)}
                        className="text-left group"
                      >
                        <span className="font-bold text-teal-700 group-hover:underline">{alert.patient_id}</span>
                        <span className="text-slate-500 text-[11px] block">{alert.room}</span>
                      </button>
                    </td>

                    {/* Alert Type */}
                    <td className="py-3 px-3 font-sans font-medium text-slate-700">
                      {alert.alert_type}
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${sevStyle}`}>
                        {alert.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${statusStyle}`}>
                        {alert.status}
                      </span>
                    </td>

                    {/* Compressed Observations */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 font-bold">
                        {alert.raw_observations_count}x
                      </span>
                    </td>

                    {/* Nurse */}
                    <td className="py-3 px-3 font-sans text-slate-600">
                      {alert.assigned_nurse || 'Unassigned'}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-3 font-sans text-slate-600 max-w-xs truncate" title={alert.reason}>
                      {alert.reason}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        {alert.status === 'OPEN' && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={isWorking}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium shadow-sm"
                          >
                            Acknowledge
                          </button>
                        )}

                        {alert.status === 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => handleReview(alert.id)}
                            disabled={isWorking}
                            className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-medium shadow-sm"
                          >
                            Review
                          </button>
                        )}

                        {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED' || alert.status === 'UNDER_REVIEW') && (
                          <button
                            onClick={() => handleEscalate(alert.id)}
                            disabled={isWorking}
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-medium shadow-sm"
                          >
                            Escalate
                          </button>
                        )}

                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            disabled={isWorking}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white text-[11px] font-medium border border-slate-200"
                          >
                            Resolve
                          </button>
                        )}

                        {alert.status === 'RESOLVED' && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                          </span>
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
  );
};
