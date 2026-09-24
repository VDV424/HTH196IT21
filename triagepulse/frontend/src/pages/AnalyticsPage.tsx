import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, Clock, ShieldCheck, Droplets, Radio, Activity } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return <div className="text-slate-500 p-8 text-center text-sm">Loading telemetry metrics...</div>;
  }

  const kpis = data.kpis;
  const charts = data.charts;

  const COLORS = ['#0284c7', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Healthcare IoT Telemetry & Workflow Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time evaluation of alert fatigue reduction, nurse capacity utilization, and trajectory lead-time detection.
          </p>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
            Alert Compression Ratio
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
            {kpis.alert_compression_ratio}%
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Alarm fatigue suppression</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
            Avg Acknowledgement Time
          </span>
          <span className="text-2xl font-bold font-mono text-teal-600 mt-1 block">
            {kpis.avg_acknowledgement_latency_sec}s
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Target: &lt; 30 seconds</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
            Early Detection Lead-Time
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
            {data.detection_lead_time_minutes} min
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Ahead of static threshold failure</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
            IV Event Capture Rate
          </span>
          <span className="text-2xl font-bold font-mono text-violet-600 mt-1 block">
            {data.iv_event_detection_rate}%
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Near-empty & no-flow vigilance</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nurse Workload Utilization Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            Nurse Staff Workload & Capacity Utilization
          </h3>
          <p className="text-xs text-slate-500 mb-4">Patient bed count vs capacity ceiling (5 beds/nurse)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.nurse_workload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 6]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                <Bar dataKey="assigned" fill="#0284c7" name="Assigned Patients" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" fill="#334155" name="Max Capacity" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Episodes by Category Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            Alert Episodes by Clinical / Care Category
          </h3>
          <p className="text-xs text-slate-500 mb-4">Breakdown of physiological vs technical vs IV tasks</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.alert_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="type" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={140} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Attention Priority Tiers */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            Patient Bed Population by Priority Tier
          </h3>
          <p className="text-xs text-slate-500 mb-4">Distribution across continuous triage bands</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.priority_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="tier" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
