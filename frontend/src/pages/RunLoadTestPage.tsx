import React, { useState, useEffect } from 'react';
import {
  Play,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Users,
  Shield,
  Bell,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { TestRun } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onNavigate: (tab: string, runId?: string) => void;
}

export const RunLoadTestPage: React.FC<Props> = ({ onNavigate }) => {
  // Form Configuration State
  const [name, setName] = useState<string>('Standard-Load-Test');
  const [transactionCount, setTransactionCount] = useState<number>(500);
  const [workloadType, setWorkloadType] = useState<'domestic' | 'international' | 'mixed'>('mixed');
  const [intlPercentage, setIntlPercentage] = useState<number>(50);
  const [processingMode, setProcessingMode] = useState<'sequential' | 'concurrent'>('concurrent');
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(50);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [notificationWorkers, setNotificationWorkers] = useState<number>(4);
  const [fxDelayMs, setFxDelayMs] = useState<number>(8.0);
  const [useFxCache, setUseFxCache] = useState<boolean>(true);

  // Execution & Progress State
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<TestRun | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preset Configurations
  const applyPreset = (preset: 'smoke' | 'standard' | 'heavy' | 'sequential' | 'fx_stress') => {
    if (preset === 'smoke') {
      setName('Smoke-Test-100tx');
      setTransactionCount(100);
      setWorkloadType('mixed');
      setIntlPercentage(50);
      setProcessingMode('concurrent');
      setConcurrencyLimit(25);
      setNotificationWorkers(4);
    } else if (preset === 'standard') {
      setName('Benchmark-1000tx-Concurrent');
      setTransactionCount(1000);
      setWorkloadType('mixed');
      setIntlPercentage(50);
      setProcessingMode('concurrent');
      setConcurrencyLimit(50);
      setNotificationWorkers(4);
    } else if (preset === 'heavy') {
      setName('High-Scale-5000tx');
      setTransactionCount(5000);
      setWorkloadType('mixed');
      setIntlPercentage(60);
      setProcessingMode('concurrent');
      setConcurrencyLimit(100);
      setNotificationWorkers(8);
    } else if (preset === 'sequential') {
      setName('Sequential-Baseline-500tx');
      setTransactionCount(500);
      setWorkloadType('mixed');
      setIntlPercentage(50);
      setProcessingMode('sequential');
      setConcurrencyLimit(1);
      setNotificationWorkers(2);
    } else if (preset === 'fx_stress') {
      setName('FX-Overhead-1000tx-NoCache');
      setTransactionCount(1000);
      setWorkloadType('international');
      setIntlPercentage(100);
      setProcessingMode('concurrent');
      setConcurrencyLimit(50);
      setUseFxCache(false);
      setFxDelayMs(15.0);
      setNotificationWorkers(4);
    }
  };

  // Launch Experiment
  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim() || `Run-${transactionCount}tx-${processingMode}`,
        transaction_count: transactionCount,
        workload_type: workloadType,
        processing_mode: processingMode,
        concurrency_limit: processingMode === 'sequential' ? 1 : concurrencyLimit,
        intl_percentage: workloadType === 'mixed' ? intlPercentage : (workloadType === 'international' ? 100 : 0),
        random_seed: randomSeed,
        fx_config: {
          use_cache: useFxCache,
          base_latency_ms: fxDelayMs
        },
        notification_config: {
          num_workers: notificationWorkers
        }
      };

      const result = await api.createTestRun(payload);
      setActiveRunId(result.id);
      setActiveRun(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start experiment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll status while running
  useEffect(() => {
    if (!activeRunId) return;

    const interval = setInterval(async () => {
      try {
        const runData = await api.getTestRun(activeRunId);
        setActiveRun(runData);

        if (runData.status === 'COMPLETED' || runData.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling status', err);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [activeRunId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          Configure & Launch Load Test Experiment
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Set up synthetic payment volume, currency distribution, concurrency limits, and worker thresholds.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2.5">
          Quick Scenario Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset('smoke')}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-cyan-300 font-medium border border-gray-700 transition"
          >
            🚀 Quick Smoke Test (100 tx)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('standard')}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-blue-300 font-medium border border-gray-700 transition"
          >
            ⚡ Standard Concurrent (1,000 tx)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('heavy')}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-purple-300 font-medium border border-gray-700 transition"
          >
            🔥 High Volume Stress (5,000 tx)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('sequential')}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-amber-300 font-medium border border-gray-700 transition"
          >
            ⏳ Sequential Baseline (500 tx)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('fx_stress')}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-rose-300 font-medium border border-gray-700 transition"
          >
            🌐 FX Uncached Overhead (1,000 tx)
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form & Live Progress Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <form onSubmit={handleLaunch} className="lg:col-span-2 space-y-5 bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl">
          {/* Experiment Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Experiment Run Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Benchmark-1000tx-50conc"
              required
            />
          </div>

          {/* Workload Size Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Workload Size (Transaction Count)
            </label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {[100, 500, 1000, 5000, 10000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTransactionCount(count)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    transactionCount === count
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                      : 'bg-gray-950 text-gray-400 border-gray-800 hover:bg-gray-800'
                  }`}
                >
                  {count.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={10}
              max={50000}
              value={transactionCount}
              onChange={(e) => setTransactionCount(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              placeholder="Or enter custom transaction count (10 - 50,000)"
            />
          </div>

          {/* Workload Type & FX Mix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Workload Type
              </label>
              <select
                value={workloadType}
                onChange={(e: any) => setWorkloadType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="mixed">Mixed (Domestic + International)</option>
                <option value="domestic">Domestic Only (INR → INR)</option>
                <option value="international">International Only (FX Enabled)</option>
              </select>
            </div>

            {workloadType === 'mixed' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  International Tx Mix: <span className="text-cyan-400 font-bold">{intlPercentage}%</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={intlPercentage}
                  onChange={(e) => setIntlPercentage(Number(e.target.value))}
                  className="w-full accent-cyan-500 mt-2"
                />
              </div>
            )}
          </div>

          {/* Processing Mode & Concurrency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800/80">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Processing Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProcessingMode('concurrent')}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    processingMode === 'concurrent'
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-gray-950 text-gray-400 border-gray-800 hover:bg-gray-800'
                  }`}
                >
                  ⚡ Concurrent
                </button>
                <button
                  type="button"
                  onClick={() => setProcessingMode('sequential')}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    processingMode === 'sequential'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-gray-950 text-gray-400 border-gray-800 hover:bg-gray-800'
                  }`}
                >
                  ⏳ Sequential
                </button>
              </div>
            </div>

            {processingMode === 'concurrent' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Concurrency Limit: <span className="text-cyan-400 font-bold">{concurrencyLimit} workers</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={concurrencyLimit}
                  onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
                  className="w-full accent-cyan-500 mt-2"
                />
              </div>
            )}
          </div>

          {/* Worker Count & FX Caching Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800/80">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Notification Workers: <span className="text-cyan-400 font-bold">{notificationWorkers}</span>
              </label>
              <input
                type="range"
                min={1}
                max={16}
                value={notificationWorkers}
                onChange={(e) => setNotificationWorkers(Number(e.target.value))}
                className="w-full accent-cyan-500 mt-2"
              />
              <span className="text-[11px] text-gray-500">Tune to measure queue backlog scaling</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Random Seed (Reproducibility)
              </label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* FX Cache Optimization Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-950/70 rounded-xl border border-gray-800">
            <div>
              <span className="text-xs font-semibold text-gray-200 block">FX In-Memory Rate Cache</span>
              <span className="text-[11px] text-gray-400">Toggle to benchmark cached vs uncached FX conversion overhead</span>
            </div>
            <button
              type="button"
              onClick={() => setUseFxCache(!useFxCache)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                useFxCache
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {useFxCache ? 'Enabled' : 'Bypassed (Uncached)'}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || activeRun?.status === 'RUNNING'}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition ${
              isSubmitting || activeRun?.status === 'RUNNING'
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Initializing Pipeline...</span>
              </>
            ) : activeRun?.status === 'RUNNING' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping mr-2"></span>
                <span>Experiment Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Experiment ({transactionCount.toLocaleString()} Transactions)</span>
              </>
            )}
          </button>
        </form>

        {/* Right 1 Col: Live Execution Monitor & Results */}
        <div className="space-y-4">
          <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Execution Monitor</span>
              {activeRun && <StatusBadge status={activeRun.status} />}
            </h2>

            {!activeRun ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                No active experiment. Configure parameters and click "Execute Experiment".
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress:</span>
                    <span className="font-bold text-cyan-400">{activeRun.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-950 rounded-full h-3 border border-gray-800 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(activeRun.progress, 5)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Processed</span>
                    <span className="font-bold text-white text-sm">
                      {activeRun.processed_count} / {activeRun.transaction_count}
                    </span>
                  </div>
                  <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Mode</span>
                    <span className="font-bold text-cyan-400 capitalize text-sm">
                      {activeRun.processing_mode}
                    </span>
                  </div>
                </div>

                {/* If COMPLETED, show quick summary metrics */}
                {activeRun.status === 'COMPLETED' && activeRun.metrics && (
                  <div className="pt-3 border-t border-gray-800 space-y-3">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Experiment Completed!
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 text-[10px] block">Throughput:</span>
                          <span className="font-bold text-white">{activeRun.metrics.throughput_tps} TPS</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] block">Avg Latency:</span>
                          <span className="font-bold text-white">{activeRun.metrics.avg_response_time_ms} ms</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] block">P95 Latency:</span>
                          <span className="font-bold text-white">{activeRun.metrics.p95_response_time_ms} ms</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] block">Max Queue:</span>
                          <span className="font-bold text-white">{activeRun.metrics.notification_metrics?.max_queue_size || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onNavigate('explorer', activeRun.id)}
                        className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        Explore Transactions ({activeRun.transaction_count}) <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onNavigate('bottlenecks', activeRun.id)}
                        className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-amber-400 rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        Inspect Bottlenecks →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
