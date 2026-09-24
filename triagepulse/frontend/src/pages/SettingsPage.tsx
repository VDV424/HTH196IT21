import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Settings, Save, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [maxCapacity, setMaxCapacity] = useState(5);
  const [speed, setSpeed] = useState(1);
  const [wTrend, setWTrend] = useState(0.30);
  const [wRoc, setWRoc] = useState(0.20);
  const [wPers, setWPers] = useState(0.15);
  const [wMv, setWMv] = useState(0.15);
  const [wDev, setWDev] = useState(0.10);
  const [wConf, setWConf] = useState(0.10);
  const [wDetOverall, setWDetOverall] = useState(0.65);
  const [wIvOverall, setWIvOverall] = useState(0.35);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (res) {
          setMaxCapacity(res.max_nurse_capacity || 5);
          setSpeed(res.simulation_speed || 1);
          if (res.weights) {
            setWTrend(res.weights.weight_trend_severity ?? 0.30);
            setWRoc(res.weights.weight_rate_of_change ?? 0.20);
            setWPers(res.weights.weight_persistence ?? 0.15);
            setWMv(res.weights.weight_multi_vital ?? 0.15);
            setWDev(res.weights.weight_baseline_deviation ?? 0.10);
            setWConf(res.weights.weight_signal_confidence ?? 0.10);
            setWDetOverall(res.weights.weight_deterioration_overall ?? 0.65);
            setWIvOverall(res.weights.weight_iv_urgency_overall ?? 0.35);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        max_nurse_capacity: maxCapacity,
        simulation_speed: speed,
        alert_persistence_ticks: 3,
        weight_trend_severity: wTrend,
        weight_rate_of_change: wRoc,
        weight_persistence: wPers,
        weight_multi_vital: wMv,
        weight_baseline_deviation: wDev,
        weight_signal_confidence: wConf,
        weight_deterioration_overall: wDetOverall,
        weight_iv_urgency_overall: wIvOverall,
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setMaxCapacity(5);
    setSpeed(1);
    setWTrend(0.30);
    setWRoc(0.20);
    setWPers(0.15);
    setWMv(0.15);
    setWDev(0.10);
    setWConf(0.10);
    setWDetOverall(0.65);
    setWIvOverall(0.35);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" />
            TriagePulse Research Parameters & Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure algorithmic scoring weights, nurse capacity limits, and simulation telemetry cadence.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Project Disclaimer:</span> The weights below are{' '}
          <span className="underline font-bold">PROJECT-DEFINED EXPERIMENTAL PARAMETERS</span> and{' '}
          <span className="underline font-bold">NOT CLINICAL GUIDELINES</span>. Modifying these values alters mathematical triage sensitivity in the research demo.
        </div>
      </div>

      {/* Nurse Capacity & Simulation Speed */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Operational Capacity & Simulation Cadence
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Max capacity per nurse */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Nurse Bed Capacity Limit (Default: 5 beds/nurse)
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 5)}
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Patients exceeding total online nurse capacity trigger Queue Overflow.
            </p>
          </div>

          {/* Simulation Speed */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Simulation Telemetry Speed Multiplier
            </label>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-500"
            >
              <option value={1}>1x (Standard real-time, ~2.5s tick)</option>
              <option value={2}>2x (Accelerated demonstration, ~1.2s tick)</option>
              <option value={5}>5x (Fast presentation, ~0.5s tick)</option>
              <option value={10}>10x (Rapid test sweep, ~0.25s tick)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Controls how fast vitals drift and IV bags deplete.</p>
          </div>
        </div>
      </div>

      {/* Trajectory Calculation Weights */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Trajectory Scoring Factor Weights (Project Parameters)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Trend Severity: {(wTrend * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.05}
              value={wTrend}
              onChange={(e) => setWTrend(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Rate of Change: {(wRoc * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.05}
              value={wRoc}
              onChange={(e) => setWRoc(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Abnormal Persistence: {(wPers * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.05}
              value={wPers}
              onChange={(e) => setWPers(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Multi-Vital Concordance: {(wMv * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.05}
              value={wMv}
              onChange={(e) => setWMv(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Baseline Departure: {(wDev * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.4}
              step={0.05}
              value={wDev}
              onChange={(e) => setWDev(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Signal Confidence: {(wConf * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.3}
              step={0.05}
              value={wConf}
              onChange={(e) => setWConf(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-slate-600 mb-1 text-xs">
              <span>Overall Physiological D(t) Weight: {(wDetOverall * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={wDetOverall}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setWDetOverall(val);
                setWIvOverall(Number((1 - val).toFixed(2)));
              }}
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1 text-xs">
              <span>Overall IV Urgency U(t) Weight: {(wIvOverall * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.8}
              step={0.05}
              value={wIvOverall}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setWIvOverall(val);
                setWDetOverall(Number((1 - val).toFixed(2)));
              }}
              className="w-full accent-violet-500"
            />
          </div>
        </div>
      </div>

      {/* Save & Reset Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>

        <div className="flex items-center gap-3">
          {savedMsg && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Parameters saved successfully!
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-900 text-xs font-bold transition-all shadow-md shadow-teal-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Apply Parameters'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
