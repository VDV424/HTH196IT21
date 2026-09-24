import React, { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, Sparkles, Activity, AlertOctagon, Droplets, Zap, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface DemoControlsProps {
  isRunning: boolean;
  speed: number;
  demoModeActive: boolean;
}

export const DemoControls: React.FC<DemoControlsProps> = ({ isRunning, speed, demoModeActive }) => {
  const [activeScenario, setActiveScenario] = useState<string>('Normal Ward');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleTogglePlay = async () => {
    try {
      const res = await api.pauseDemo();
      showNotice(res.is_running ? 'Simulation Resumed' : 'Simulation Paused');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetDemo();
      setActiveScenario('Normal Ward');
      showNotice('All 12 beds reset to baseline');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpeed = async (sp: number) => {
    try {
      await api.setSpeed(sp);
      showNotice(`Simulation speed set to ${sp}x`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInjectScenario = async (name: string, label: string) => {
    try {
      await api.injectScenario(name);
      setActiveScenario(label);
      showNotice(`Injected: ${label}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunDemo = async () => {
    try {
      await api.startDemo();
      setActiveScenario('3-Min Demo Running');
      showNotice('3-minute scripted demonstration started!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls & Speed */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-slate-900'
                : 'bg-emerald-600 hover:bg-emerald-500 text-slate-900'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause' : 'Start'}</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Speed Pills */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs font-mono">
            {[1, 2, 5, 10].map((sp) => (
              <button
                key={sp}
                onClick={() => handleSpeed(sp)}
                className={`px-2 py-1 rounded ${
                  speed === sp ? 'bg-teal-600 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          {/* Scripted 3-Min Demo Button */}
          <button
            onClick={handleRunDemo}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-slate-900 text-xs font-bold shadow-lg shadow-teal-600/20 transition-all animate-pulse"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span>RUN 3-MIN DEMO</span>
          </button>
        </div>

        {/* One-Click Scenarios */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:inline">
            Scenarios:
          </span>

          <button
            onClick={() => handleInjectScenario('NORMAL', 'Normal Ward')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              activeScenario === 'Normal Ward'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-slate-50/80 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Normal Ward
          </button>

          <button
            onClick={() => handleInjectScenario('DETERIORATION', 'Deterioration Event')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              activeScenario === 'Deterioration Event'
                ? 'bg-rose-950 text-rose-300 border-rose-700'
                : 'bg-slate-50/80 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Deterioration
          </button>

          <button
            onClick={() => handleInjectScenario('IV', 'IV Failure Event')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              activeScenario === 'IV Failure Event'
                ? 'bg-violet-50 text-indigo-300 border-indigo-700'
                : 'bg-slate-50/80 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            IV Failure
          </button>

          <button
            onClick={() => handleInjectScenario('SURGE', 'Multi-Patient Surge')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              activeScenario === 'Multi-Patient Surge'
                ? 'bg-orange-950 text-orange-300 border-orange-700'
                : 'bg-slate-50/80 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Multi-Patient Surge
          </button>

          <button
            onClick={() => handleInjectScenario('SENSOR', 'Sensor Failure')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              activeScenario === 'Sensor Failure'
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-slate-50/80 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Sensor Failure
          </button>

          <button
            onClick={() => handleInjectScenario('RECOVERY', 'Patient Recovery')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              activeScenario === 'Patient Recovery'
                ? 'bg-teal-950 text-teal-300 border-teal-700'
                : 'bg-slate-50/80 text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Recovery
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="mt-2 text-xs font-medium text-teal-600 bg-teal-50/50 border border-teal-200/40 px-3 py-1 rounded-md">
          {actionNotice}
        </div>
      )}
    </div>
  );
};
