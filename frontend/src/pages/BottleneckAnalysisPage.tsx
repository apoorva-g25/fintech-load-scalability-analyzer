import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { TestRun, BottleneckFinding } from '../types';

interface Props {
  initialRunId?: string;
  onNavigate: (tab: string, runId?: string) => void;
}

export const BottleneckAnalysisPage: React.FC<Props> = ({ initialRunId, onNavigate }) => {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId || '');
  const [bottlenecks, setBottlenecks] = useState<BottleneckFinding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const allRuns = await api.getTestRuns();
        const completed = allRuns.filter(r => r.status === 'COMPLETED');
        setRuns(completed);
        if (completed.length > 0 && !selectedRunId) {
          setSelectedRunId(completed[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch test runs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, [initialRunId]);

  useEffect(() => {
    if (!selectedRunId) return;
    const fetchBottlenecks = async () => {
      try {
        const res = await api.getBottlenecks(selectedRunId);
        setBottlenecks(res.bottlenecks || []);
      } catch (err) {
        console.error('Failed to fetch bottlenecks', err);
      }
    };
    fetchBottlenecks();
  }, [selectedRunId]);

  const selectedRun = runs.find(r => r.id === selectedRunId);

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/90 p-5 rounded-2xl border border-gray-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Rule-Based Bottleneck Diagnostics & Mitigation
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Automated evaluation of queue saturation, FX processing overhead, tail latency divergence, and concurrency limits.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-gray-400 font-semibold whitespace-nowrap">Experiment:</label>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 max-w-xs"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.transaction_count} tx, {r.processing_mode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Architecture Stage Reference */}
      <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-800">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
          Simulated Pipeline Flow & Monitored Subsystems:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Stage 1</span>
            <span className="font-bold text-white">Generator</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Stage 2</span>
            <span className="font-bold text-cyan-400">Payment Validation</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Stage 3</span>
            <span className="font-bold text-indigo-400">FX Conversion</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Stage 4</span>
            <span className="font-bold text-amber-400">Fraud Detection</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Stage 5</span>
            <span className="font-bold text-emerald-400">Terminal Result</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Stage 6</span>
            <span className="font-bold text-purple-400">Async Queue & Workers</span>
          </div>
        </div>
      </div>

      {/* Bottleneck Findings Cards */}
      {runs.length === 0 ? (
        <div className="bg-gray-900/80 p-12 text-center rounded-2xl border border-gray-800 text-gray-500 text-sm">
          No completed benchmark runs found. Execute a benchmark to analyze bottlenecks.
        </div>
      ) : bottlenecks.length === 0 ? (
        <div className="bg-gray-900/80 p-8 text-center rounded-2xl border border-gray-800 text-gray-400 text-sm flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
          <span>No bottlenecks detected for this experiment run.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {bottlenecks.map((finding, idx) => {
            const isHigh = finding.severity === 'HIGH';
            const isMedium = finding.severity === 'MEDIUM';
            const isInfo = finding.severity === 'INFO';

            const borderCol = isHigh ? 'border-rose-800/80' : isMedium ? 'border-amber-800/80' : 'border-gray-800';
            const bgCol = isHigh ? 'bg-rose-950/20' : isMedium ? 'bg-amber-950/20' : 'bg-gray-900/90';

            return (
              <div
                key={idx}
                className={`${bgCol} rounded-2xl p-6 border ${borderCol} shadow-xl space-y-4 transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {isHigh ? (
                      <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
                    ) : isMedium ? (
                      <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Info className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                    )}
                    <div>
                      <h2 className="text-base font-bold text-white">{finding.title}</h2>
                      <span className="text-xs text-gray-400">Severity Classification</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${
                      isHigh
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : isMedium
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-cyan-950 text-cyan-400 border-cyan-800'
                    }`}
                  >
                    {finding.severity} SEVERITY
                  </span>
                </div>

                {/* Explanation */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Diagnostic Analysis & Root Cause:
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{finding.explanation}</p>
                </div>

                {/* Supporting Measurements Grid */}
                {finding.supporting_measurements && Object.keys(finding.supporting_measurements).length > 0 && (
                  <div className="bg-gray-950/80 rounded-xl p-3 border border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      Empirical Evidence & Measurements:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(finding.supporting_measurements).map(([key, val]) => (
                        <div key={key} className="bg-gray-900 p-2 rounded-lg border border-gray-800/60">
                          <span className="text-[10px] text-gray-400 block truncate capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-bold text-white">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Recommendation */}
                <div className="bg-cyan-950/30 border border-cyan-800/60 p-4 rounded-xl flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-cyan-300 block mb-0.5">
                      Recommended Engineering Mitigation:
                    </span>
                    <p className="text-xs text-cyan-200/90">{finding.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
