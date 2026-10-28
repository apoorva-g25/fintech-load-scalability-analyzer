import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { GitCompare, TrendingUp, ArrowDown, ArrowUp, CheckSquare, Square } from 'lucide-react';
import { api } from '../services/api';
import { TestRun, ComparisonItem } from '../types';

export const ExperimentComparisonPage: React.FC = () => {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<ComparisonItem[]>([]);
  const [baselineId, setBaselineId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [comparing, setComparing] = useState<boolean>(false);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const allRuns = await api.getTestRuns();
        const completed = allRuns.filter(r => r.status === 'COMPLETED');
        setRuns(completed);
        if (completed.length >= 2) {
          const firstTwo = [completed[0].id, completed[1].id];
          setSelectedIds(firstTwo);
          runComparison(firstTwo);
        }
      } catch (err) {
        console.error('Failed to fetch runs for comparison', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, []);

  const runComparison = async (ids: string[]) => {
    if (ids.length < 2) {
      setComparisonResults([]);
      return;
    }
    setComparing(true);
    try {
      const res = await api.compareExperiments(ids);
      setComparisonResults(res.comparison);
      setBaselineId(res.baseline_run_id);
    } catch (err) {
      console.error('Comparison error', err);
    } finally {
      setComparing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    setSelectedIds(updated);
    if (updated.length >= 2) {
      runComparison(updated);
    } else {
      setComparisonResults([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Chart data
  const chartData = comparisonResults.map(c => ({
    name: c.name,
    throughput_tps: c.throughput_tps,
    avg_latency_ms: c.avg_latency_ms,
    p95_latency_ms: c.p95_latency_ms
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-800 shadow-xl">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-cyan-400" />
          Before & After Experiment Comparison
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Compare sequential vs concurrent processing, worker pool scaling, FX caching optimizations, and mitigation impacts.
        </p>
      </div>

      {/* Experiment Selector Checkboxes */}
      <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-800">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
          Select Experiments to Compare (Min 2):
        </span>
        {runs.length === 0 ? (
          <div className="text-gray-500 text-xs py-4">No completed experiments found to compare.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {runs.map((r) => {
              const isSelected = selectedIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleSelect(r.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center space-x-3 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-600/80 text-white'
                      : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate">{r.name}</span>
                    <span className="text-[10px] text-gray-400">
                      {r.transaction_count} tx • {r.processing_mode} • {r.metrics?.throughput_tps || 0} TPS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedIds.length < 2 ? (
        <div className="bg-gray-900/60 p-12 text-center rounded-2xl border border-gray-800 text-gray-400 text-sm">
          Please select at least 2 completed experiments above to view side-by-side performance delta.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Side by Side Comparative Bar Chart */}
          <div className="bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Side-by-Side Throughput & Latency Comparison
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                  <Legend />
                  <Bar dataKey="throughput_tps" name="Throughput (TPS)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_latency_ms" name="Avg Latency (ms)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="p95_latency_ms" name="P95 Latency (ms)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metric Delta Table */}
          <div className="bg-gray-900/90 rounded-2xl p-6 border border-gray-800 shadow-xl overflow-x-auto">
            <h2 className="text-sm font-bold text-white mb-4">
              Detailed Optimization & Delta Matrix (Relative to Baseline: {comparisonResults[0]?.name})
            </h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Experiment Run</th>
                  <th className="pb-3">Count</th>
                  <th className="pb-3">Mode</th>
                  <th className="pb-3">Throughput</th>
                  <th className="pb-3">TPS Delta (%)</th>
                  <th className="pb-3">Avg Latency</th>
                  <th className="pb-3">Latency Delta (%)</th>
                  <th className="pb-3">P95 Latency</th>
                  <th className="pb-3">Max Queue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {comparisonResults.map((item, index) => {
                  const isBaseline = index === 0;
                  const tpsImprovement = item.throughput_improvement_pct || 0;
                  const latReduction = item.latency_reduction_pct || 0;

                  return (
                    <tr key={item.id} className="hover:bg-gray-800/40 transition">
                      <td className="py-3 font-semibold text-white">
                        {item.name}
                        {isBaseline && (
                          <span className="ml-2 text-[10px] bg-gray-800 text-cyan-400 px-2 py-0.5 rounded border border-gray-700">
                            Baseline
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-300">{item.transaction_count} tx</td>
                      <td className="py-3 text-gray-400 capitalize">{item.processing_mode}</td>
                      <td className="py-3 text-cyan-400 font-bold">{item.throughput_tps} TPS</td>
                      <td className="py-3">
                        {isBaseline ? (
                          <span className="text-gray-500">-</span>
                        ) : tpsImprovement >= 0 ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <ArrowUp className="w-3.5 h-3.5" /> +{tpsImprovement}%
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <ArrowDown className="w-3.5 h-3.5" /> {tpsImprovement}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-300">{item.avg_latency_ms} ms</td>
                      <td className="py-3">
                        {isBaseline ? (
                          <span className="text-gray-500">-</span>
                        ) : latReduction >= 0 ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <ArrowDown className="w-3.5 h-3.5" /> -{latReduction}%
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <ArrowUp className="w-3.5 h-3.5" /> +{Math.abs(latReduction)}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-amber-400 font-semibold">{item.p95_latency_ms} ms</td>
                      <td className="py-3 text-purple-400">{item.max_queue_size}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
