import React, { useEffect, useState } from 'react';
import {
  Activity,
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  TrendingUp,
  Globe2
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardSummary, TestRun } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onNavigate: (tab: string, runId?: string) => void;
}

export const OverviewPage: React.FC<Props> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [sumData, runsData] = await Promise.all([
        api.getDashboardSummary(),
        api.getTestRuns()
      ]);
      setSummary(sumData);
      setRecentRuns(runsData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-400">Loading system overview...</span>
        </div>
      </div>
    );
  }

  const active = summary?.active_run;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Run Trigger */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-950 p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            FinTech Load & Scalability Dashboard
            <span className="text-xs font-normal text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded-full">
              System Online
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-400 max-w-2xl">
            Simulate domestic (INR) and international cross-border payment pipelines under high concurrency.
            Inspect tail latencies, asynchronous notification queues, and automated bottleneck mitigations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('load-test')}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 text-sm transition"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Experiment</span>
          </button>
        </div>
      </div>

      {/* Active Experiment Progress Bar */}
      {active && (
        <div className="bg-cyan-950/40 border border-cyan-700/60 p-5 rounded-2xl shadow-lg animate-pulse-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-sm font-semibold text-white">
                Active Experiment: {active.name}
              </span>
              <StatusBadge status={active.status} />
            </div>
            <span className="text-sm font-bold text-cyan-400">{active.progress}%</span>
          </div>
          <div className="mt-3 w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(active.progress, 5)}%` }}
            ></div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>Processed: {active.processed_count} / {active.transaction_count} transactions</span>
            <button
              onClick={() => onNavigate('load-test')}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              View Live Progress <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={summary?.total_transactions_processed.toLocaleString() || '0'}
          subtitle={`Across ${summary?.completed_experiments_count || 0} completed experiments`}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          title="Latest Throughput"
          value={`${summary?.latest_throughput_tps || 0} TPS`}
          subtitle="Completed transactions per sec"
          icon={<Zap className="w-5 h-5" />}
          trend="+Scalable"
        />
        <StatCard
          title="Avg Response Time"
          value={`${summary?.latest_avg_response_ms || 0} ms`}
          subtitle={`P95: ${summary?.latest_p95_response_ms || 0} ms`}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Payment Success Rate"
          value={`${summary?.latest_success_rate_pct || 0}%`}
          subtitle="Validated & processed clean"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
      </div>

      {/* Latest Bottlenecks & Recent Experiments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Experiments Table */}
        <div className="lg:col-span-2 bg-gray-900/90 rounded-2xl p-6 border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Recent Benchmark Experiments
            </h2>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              View All Analytics <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentRuns.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No experiment runs recorded yet. Click "Launch Experiment" above to run your first benchmark!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Experiment Name</th>
                    <th className="pb-3">Count</th>
                    <th className="pb-3">Mode</th>
                    <th className="pb-3">Throughput</th>
                    <th className="pb-3">Avg Latency</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-800/40 transition">
                      <td className="py-3 font-medium text-white max-w-[180px] truncate">
                        {run.name}
                      </td>
                      <td className="py-3 text-gray-300">{run.transaction_count} tx</td>
                      <td className="py-3 text-gray-400 capitalize">{run.processing_mode}</td>
                      <td className="py-3 text-cyan-400 font-semibold">
                        {run.metrics?.throughput_tps || 0} TPS
                      </td>
                      <td className="py-3 text-gray-300">
                        {run.metrics?.avg_response_time_ms || 0} ms
                      </td>
                      <td className="py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onNavigate('explorer', run.id)}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Explore →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Latest Bottlenecks */}
        <div className="bg-gray-900/90 rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Latest Bottleneck Analysis
              </h2>
              <button
                onClick={() => onNavigate('bottlenecks')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Details →
              </button>
            </div>

            {(!summary?.latest_bottlenecks || summary.latest_bottlenecks.length === 0) ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No active bottlenecks reported. Run a higher workload (500+ transactions) to evaluate saturation.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.latest_bottlenecks.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800 hover:border-gray-700 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-200">{item.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.severity === 'HIGH' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        item.severity === 'MEDIUM' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">{item.explanation}</p>
                    <p className="text-[11px] text-cyan-400/90 font-medium mt-2">
                      💡 {item.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                Cross-Border FX Support
              </span>
              <button
                onClick={() => onNavigate('fx')}
                className="text-cyan-400 hover:underline font-medium"
              >
                Inspect Rates & Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
