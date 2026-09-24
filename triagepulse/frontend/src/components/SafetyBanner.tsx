import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const SafetyBanner: React.FC = () => {
  return (
    <div className="bg-amber-950/60 border-y border-amber-500/30 px-4 py-2 text-xs text-amber-200/90 flex flex-wrap items-center justify-between gap-2 shadow-inner">
      <div className="flex items-center gap-2 font-medium">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold uppercase tracking-wider text-[10px] border border-amber-500/40">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          SIMULATION / EDUCATIONAL PROTOTYPE
        </span>
        <span className="font-semibold text-amber-300">NOT FOR CLINICAL USE</span>
        <span className="hidden md:inline text-amber-400/70">—</span>
        <span className="hidden md:inline text-amber-200/80">
          This prototype provides workflow and research signals only. It does not diagnose, prescribe, or autonomously control medical equipment.
        </span>
      </div>
      <div className="flex items-center gap-2 text-slate-400 text-[11px] ml-auto">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Research Sandbox Mode</span>
      </div>
    </div>
  );
};
