import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, Layers, Clock, Zap, Download } from 'lucide-react';
import { api } from '../services/api';
import { TestRun } from '../types';

export const PerformanceAnalyticsPage: React.FC = () => {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [runsData, analytics] = await Promise.all([
          api.getTestRuns(),
          api.getAnalytics()
        ]);
        const completed = runsData.filter(r => r.status === 'COMPLETED');
        setRuns(completed);
        setAnalyticsData(analytics);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Selected run specific data
  const selectedRun = runs.find(r => r.id === selectedRunId);
  const metrics = selectedRun?.metrics;

  // Breakdown data for service latencies
  const serviceLatencyData = selectedRun && metrics ? [
    { service: 'Payment Engine', avg_ms: metrics.service_latencies.payment_avg_ms, p95_ms: metrics.service_latencies.payment_p95_ms },
    { service: 'FX Service', avg_ms: metrics.service_latencies.fx_avg_ms, p95_ms: metrics.service_latencies.fx_p95_ms },
    { service: 'Fraud Rules', avg_ms: metrics.service_latencies.fraud_avg_ms, p95_ms: metrics.service_latencies.fraud_p95_ms },
    { service: 'Notification Wait', avg_ms: metrics.service_latencies.notification_avg_wait_ms, p95_ms: metrics.service_latencies.notification_p95_wait_ms }
  ] : [];

  // Pie distribution
  const outcomeData = selectedRun && metrics ? [
    { name: 'Success', value: metrics.success_count, color: '#10B981' },
    { name: 'Fraud Flagged', value: metrics.fraud_flagged_count, color: '#F59E0B' },
    { name: 'Failed', value: metrics.failed_count, color: '#F43F5E' }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Page Header & Experiment Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/90 p-5 rounded-2xl border border-gray-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Performance & Latency Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Analyze execution curves, tail latencies (P95/P99), subsystem breakdowns, and queue dynamics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-gray-400 font-semibold whitespace-nowrap">Select Run:</label>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 max-w-xs"
          >
            <option value="all">📊 All Runs Aggregate Trend</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.transaction_count} tx, {r.processing_mode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="bg-gray-900/80 p-12 text-center rounded-2xl border border-gray-800 text-gray-500 text-sm">
          No completed benchmark experiments found. Run experiments in the "Run Load Test" tab first.
        </div>
      ) : selectedRunId === 'all' ? (
        /* ================= ALL RUNS AGGREGATE VIEW ================= */
        <div className="space-y-6">
          {/* Chart 1: Volume vs Throughput */}
          <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Workload Volume vs Throughput (TPS)
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Demonstrates throughput scaling across varying transaction batch sizes and execution modes.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} label={{ value: 'TPS', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                  <Legend />
                  <Bar dataKey="throughput_tps" name="Throughput (TPS)" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Volume vs Latency Curve (Average & P95) */}
          <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Response Time & Tail Latency Growth (Average vs P95)
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Inspect latency degradation and tail divergence as workload volume increases.
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="avg_latency_ms" name="Average Latency (ms)" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="p95_latency_ms" name="P95 Latency (ms)" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="p99_latency_ms" name="P99 Latency (ms)" stroke="#F43F5E" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Notification Queue Backlog across experiments */}
          <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Notification Queue Peak Backlog vs Queue Wait Time
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Shows asynchronous decoupling effectiveness and backpressure under burst transaction traffic.
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                  <Legend />
                  <Bar dataKey="max_queue_size" name="Peak Queue Backlog" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="notification_wait_ms" name="Avg Wait Time (ms)" fill="#EC4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* ================= SINGLE RUN DETAILED VIEW ================= */
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] uppercase font-bold text-gray-400">Throughput</span>
              <div className="text-xl font-bold text-cyan-400 mt-1">{metrics?.throughput_tps} TPS</div>
            </div>
            <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] uppercase font-bold text-gray-400">Average Latency</span>
              <div className="text-xl font-bold text-white mt-1">{metrics?.avg_response_time_ms} ms</div>
            </div>
            <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] uppercase font-bold text-gray-400">P95 Tail Latency</span>
              <div className="text-xl font-bold text-amber-400 mt-1">{metrics?.p95_response_time_ms} ms</div>
            </div>
            <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] uppercase font-bold text-gray-400">Peak Queue Size</span>
              <div className="text-xl font-bold text-purple-400 mt-1">
                {metrics?.notification_metrics.max_queue_size} items
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Service Breakdown (Left 2 cols) */}
            <div className="lg:col-span-2 bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Subsystem Latency Breakdown (Average vs P95)
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Comparison of duration across Payment Engine, FX Lookup, Fraud Check, and Notification delivery.
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceLatencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="service" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                    <Legend />
                    <Bar dataKey="avg_ms" name="Average (ms)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="p95_ms" name="P95 (ms)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Outcome Pie Distribution (Right 1 col) */}
            <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Outcome Distribution
                </h2>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-1.5 text-xs pt-3 border-t border-gray-800">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Success:
                  </span>
                  <span className="font-bold text-white">{metrics?.success_count} ({metrics?.success_rate_pct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Fraud Flagged:
                  </span>
                  <span className="font-bold text-white">{metrics?.fraud_flagged_count} ({metrics?.fraud_rate_pct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Failed:
                  </span>
                  <span className="font-bold text-white">{metrics?.failed_count} ({metrics?.failure_rate_pct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
