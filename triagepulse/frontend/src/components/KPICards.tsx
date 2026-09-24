import React from 'react';
import { Users, AlertTriangle, Bell, UserCheck, ShieldAlert, Droplets, AlertOctagon, Phone, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KPIs } from '../types';

interface KPICardsProps {
  kpis: KPIs | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const cards = [
    {
      title: 'Total Patients',
      value: kpis ? kpis.total_patients : '—',
      subtext: 'Monitored beds',
      icon: Users,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-500/12',
      bgColor: 'bg-white border-emerald-200/60',
      accentGradient: 'from-emerald-500/8 to-transparent',
    },
    {
      title: 'High Attention',
      value: kpis ? kpis.high_priority_count : '—',
      subtext: 'Trajectory alerts',
      icon: AlertTriangle,
      color: 'text-rose-500',
      iconBg: 'bg-rose-500/12',
      bgColor: 'bg-white border-rose-200/60',
      accentGradient: 'from-rose-500/8 to-transparent',
      badge: kpis && kpis.high_priority_count > 0 ? 'NEEDS ATTENTION' : undefined,
      urgent: kpis && kpis.high_priority_count > 0,
    },
    {
      title: 'SOS Active',
      value: kpis ? kpis.sos_active_count : '0',
      subtext: 'Emergency panic buttons',
      icon: AlertOctagon,
      color: 'text-red-500',
      iconBg: 'bg-red-500/12',
      bgColor: kpis && kpis.sos_active_count > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-red-200/40',
      accentGradient: 'from-red-500/8 to-transparent',
      badge: kpis && kpis.sos_active_count > 0 ? '🚨 ACTIVE' : undefined,
      urgent: kpis && kpis.sos_active_count > 0,
    },
    {
      title: 'Nurse Requests',
      value: kpis ? kpis.request_active_count : '0',
      subtext: 'Patient call buttons',
      icon: Phone,
      color: 'text-violet-500',
      iconBg: 'bg-violet-500/12',
      bgColor: kpis && kpis.request_active_count > 0 ? 'bg-violet-50 border-violet-300' : 'bg-white border-violet-200/40',
      accentGradient: 'from-violet-500/8 to-transparent',
      badge: kpis && kpis.request_active_count > 0 ? '📞 PENDING' : undefined,
    },
    {
      title: 'Active Alerts',
      value: kpis ? kpis.active_alerts_count : '—',
      subtext: kpis ? `${kpis.alert_compression_ratio}% fatigue reduction` : 'Compressed episodes',
      icon: Bell,
      color: 'text-amber-500',
      iconBg: 'bg-amber-500/12',
      bgColor: 'bg-white border-amber-200/60',
      accentGradient: 'from-amber-500/8 to-transparent',
    },
    {
      title: 'Nurses Online',
      value: kpis ? kpis.nurses_online : '—',
      subtext: 'Active shift staff',
      icon: UserCheck,
      color: 'text-emerald-500',
      iconBg: 'bg-emerald-500/12',
      bgColor: 'bg-white border-emerald-200/60',
      accentGradient: 'from-emerald-500/8 to-transparent',
    },
    {
      title: 'Available Capacity',
      value: kpis ? `${kpis.available_capacity_slots}` : '—',
      subtext: 'Safe triage margin',
      icon: ShieldAlert,
      color: 'text-teal-600',
      iconBg: 'bg-teal-500/12',
      bgColor: 'bg-white border-teal-200/60',
      accentGradient: 'from-teal-500/8 to-transparent',
    },
    {
      title: 'IV Tasks',
      value: kpis ? kpis.iv_tasks_count : '—',
      subtext: 'Near-empty / Flow watch',
      icon: Droplets,
      color: 'text-violet-600',
      iconBg: 'bg-violet-500/12',
      bgColor: 'bg-white border-violet-200/60',
      accentGradient: 'from-violet-500/8 to-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 stagger-children">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`relative p-3 rounded-xl border overflow-hidden transition-all duration-300 card-hover ${card.bgColor} ${card.urgent ? 'animate-attention' : ''}`}
          >
            {/* Subtle gradient accent */}
            <div className={`absolute inset-0 bg-gradient-to-b ${card.accentGradient} pointer-events-none`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">{card.title}</span>
                <div className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">{card.value}</span>
                {card.badge && (
                  <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap ${
                    card.urgent ? 'bg-red-500/15 text-red-600 border border-red-300' : 'bg-amber-500/15 text-amber-700 border border-amber-300'
                  }`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 truncate font-medium">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
