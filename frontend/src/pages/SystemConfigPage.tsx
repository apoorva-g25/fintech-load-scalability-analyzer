import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle, RefreshCw, Sliders } from 'lucide-react';
import { api } from '../services/api';
import { SystemConfig } from '../types';

export const SystemConfigPage: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchCfg = async () => {
      try {
        const c = await api.getConfig();
        setConfig(c);
      } catch (err) {
        console.error('Failed to load system config', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCfg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.updateConfig({
        fraud_amount_threshold: config.fraud_amount_threshold,
        default_fx_fee_pct: config.default_fx_fee_pct,
        base_fx_delay_ms: config.base_fx_delay_ms,
        base_notification_delay_ms: config.base_notification_delay_ms
      });
      setSuccessMsg('System configuration successfully updated and applied.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-800 shadow-xl">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Global System & Simulation Parameters
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Modify baseline microservice latency simulations, fraud velocity parameters, and cross-border fee policies.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center gap-2.5 text-emerald-300 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {config && (
        <form onSubmit={handleSave} className="space-y-6 bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl">
          {/* Section 1: Financial & FX Defaults */}
          <div>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Currency & Foreign Exchange Defaults
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Domestic Currency (Bypasses FX)</label>
                <input
                  type="text"
                  disabled
                  value={config.domestic_currency}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Default FX Conversion Fee (%)</label>
                <input
                  type="number"
                  step={0.1}
                  value={config.default_fx_fee_pct}
                  onChange={(e) => setConfig({ ...config, default_fx_fee_pct: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Fraud Detection Rules */}
          <div className="pt-4 border-t border-gray-800">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Explainable Fraud Detection Thresholds
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">High Amount Threshold (INR)</label>
                <input
                  type="number"
                  value={config.fraud_amount_threshold}
                  onChange={(e) => setConfig({ ...config, fraud_amount_threshold: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Velocity Time Window (Seconds)</label>
                <input
                  type="number"
                  value={config.fraud_velocity_window_seconds}
                  onChange={(e) => setConfig({ ...config, fraud_velocity_window_seconds: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Velocity Max Transactions</label>
                <input
                  type="number"
                  value={config.fraud_velocity_max_txns}
                  onChange={(e) => setConfig({ ...config, fraud_velocity_max_txns: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Microservice Simulated Delays */}
          <div className="pt-4 border-t border-gray-800">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Simulated Subsystem Base Latencies (Milliseconds)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Payment Engine (ms)</label>
                <input
                  type="number"
                  value={config.base_payment_delay_ms}
                  onChange={(e) => setConfig({ ...config, base_payment_delay_ms: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">FX Lookup (ms)</label>
                <input
                  type="number"
                  value={config.base_fx_delay_ms}
                  onChange={(e) => setConfig({ ...config, base_fx_delay_ms: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Fraud Evaluation (ms)</label>
                <input
                  type="number"
                  value={config.base_fraud_delay_ms}
                  onChange={(e) => setConfig({ ...config, base_fraud_delay_ms: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Notification Delivery (ms)</label>
                <input
                  type="number"
                  value={config.base_notification_delay_ms}
                  onChange={(e) => setConfig({ ...config, base_notification_delay_ms: Number(e.target.value) })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save System Configuration</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
