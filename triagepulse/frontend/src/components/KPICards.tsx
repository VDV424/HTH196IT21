import React from 'react';
import { Users, AlertTriangle, Bell, UserCheck, ShieldAlert, Droplets, AlertOctagon, Phone } from 'lucide-react';
import { KPIs } from '../types';

interface KPICardsProps {
  kpis: KPIs | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const cards = [
    {
      title: 'Total Patients',
      value: kpis ? kpis.total_patients : '12',
      subtext: 'Monitored beds',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'High Attention',
      value: kpis ? kpis.high_priority_count : '2',
      subtext: 'Trajectory alerts',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      badge: kpis && kpis.high_priority_count > 0 ? 'NEEDS ATTENTION' : 'STABLE',
    },
    {
      title: 'SOS Active',
      value: kpis ? kpis.sos_active_count : '0',
      subtext: 'Emergency panic buttons',
      icon: AlertOctagon,
      color: 'text-red-400',
      bgColor: kpis && kpis.sos_active_count > 0 ? 'bg-red-500/20 border-red-500/40 animate-pulse' : 'bg-red-500/5 border-red-500/10',
      badge: kpis && kpis.sos_active_count > 0 ? '🚨 ACTIVE' : undefined,
    },
    {
      title: 'Nurse Requests',
      value: kpis ? kpis.request_active_count : '0',
      subtext: 'Patient call buttons',
      icon: Phone,
      color: 'text-violet-400',
      bgColor: kpis && kpis.request_active_count > 0 ? 'bg-violet-500/15 border-violet-500/30' : 'bg-violet-500/5 border-violet-500/10',
      badge: kpis && kpis.request_active_count > 0 ? '📞 PENDING' : undefined,
    },
    {
      title: 'Active Alerts',
      value: kpis ? kpis.active_alerts_count : '3',
      subtext: kpis ? `${kpis.alert_compression_ratio}% fatigue reduction` : 'Compressed episodes',
      icon: Bell,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Nurses Online',
      value: kpis ? kpis.nurses_online : '3/3',
      subtext: 'Active shift staff',
      icon: UserCheck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Available Capacity',
      value: kpis ? `${kpis.available_capacity_slots} slots` : '6 slots',
      subtext: 'Safe triage margin',
      icon: ShieldAlert,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'IV Tasks',
      value: kpis ? kpis.iv_tasks_count : '2',
      subtext: 'Near-empty / Flow watch',
      icon: Droplets,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`p-3 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:border-slate-600 ${card.bgColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-tight">{card.title}</span>
              <Icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold tracking-tight text-white">{card.value}</span>
              {card.badge && (
                <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 leading-none">
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};
