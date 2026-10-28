import React, { useEffect, useState } from 'react';
import { Globe2, ArrowRightLeft, Calculator, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';
import { api } from '../services/api';
import { FxAnalytics, ExchangeRate } from '../types';
import { StatCard } from '../components/StatCard';

export const FxAnalyticsPage: React.FC = () => {
  const [fxAnalytics, setFxAnalytics] = useState<FxAnalytics | null>(null);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // FX Calculator State
  const [calcSource, setCalcSource] = useState<string>('USD');
  const [calcDest, setCalcDest] = useState<string>('INR');
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcFeePct, setCalcFeePct] = useState<number>(1.0);

  const fetchData = async () => {
    try {
      const [analytics, ratesData] = await Promise.all([
        api.getFxAnalytics(),
        api.getFxRates()
      ]);
      setFxAnalytics(analytics);
      setRates(ratesData);
    } catch (err) {
      console.error('Failed to fetch FX data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculator Logic
  const getSimulatedRate = (src: string, dst: string): number => {
    if (src === dst) return 1.0;
    const direct = rates.find(r => r.source_currency === src && r.destination_currency === dst);
    if (direct) return direct.rate;
    const inverse = rates.find(r => r.source_currency === dst && r.destination_currency === src);
    if (inverse && inverse.rate > 0) return 1.0 / inverse.rate;
    return 1.0;
  };

  const currentRate = getSimulatedRate(calcSource, calcDest);
  const isDomestic = calcSource === calcDest;
  const convertedBeforeFee = isDomestic ? calcAmount : calcAmount * currentRate;
  const calculatedFee = isDomestic ? 0 : convertedBeforeFee * (calcFeePct / 100.0);
  const finalDestAmount = convertedBeforeFee - calculatedFee;

  if (loading && !fxAnalytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/90 p-5 rounded-2xl border border-gray-800 shadow-xl">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          Foreign Exchange (FX) & Cross-Border Analytics
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Simulated currency conversions, fee calculations, inverse lookups, and latency contributions.
        </p>
      </div>

      {/* FX Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Domestic Transactions"
          value={fxAnalytics?.domestic_transactions_count.toLocaleString() || '0'}
          subtitle="INR → INR (0% FX Fee, 0ms Delay)"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="International Transactions"
          value={fxAnalytics?.international_transactions_count.toLocaleString() || '0'}
          subtitle={`${fxAnalytics?.fx_success_rate_pct || 100}% Conversion Success`}
          icon={<Globe2 className="w-5 h-5" />}
        />
        <StatCard
          title="Avg FX Latency"
          value={`${fxAnalytics?.avg_fx_latency_ms || 0} ms`}
          subtitle={`P95: ${fxAnalytics?.p95_fx_latency_ms || 0} ms`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Conversion Failures"
          value={fxAnalytics?.fx_conversion_failure_count || 0}
          subtitle="Missing or invalid rate lookups"
          icon={<ArrowRightLeft className="w-5 h-5" />}
        />
      </div>

      {/* Main Section: Rates Table + Live FX Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Simulated Exchange Rates */}
        <div className="lg:col-span-2 bg-gray-900/90 rounded-2xl p-6 border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              Active Exchange Rates Table (Simulated)
            </h2>
            <span className="text-xs text-gray-400">Default Domestic: INR</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Pair</th>
                  <th className="pb-3">Direct Rate</th>
                  <th className="pb-3">Inverse Rate (1 Dest = X Source)</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {rates.map((rate) => {
                  const inv = rate.rate > 0 ? (1.0 / rate.rate).toFixed(6) : '-';
                  return (
                    <tr key={rate.id} className="hover:bg-gray-800/40 transition">
                      <td className="py-3 font-bold text-white">
                        {rate.source_currency} → {rate.destination_currency}
                      </td>
                      <td className="py-3 text-cyan-400 font-semibold">
                        1 {rate.source_currency} = {rate.rate} {rate.destination_currency}
                      </td>
                      <td className="py-3 text-gray-400">
                        1 {rate.destination_currency} ≈ {inv} {rate.source_currency}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Live FX Formula Calculator */}
        <div className="bg-gray-900/90 rounded-2xl p-6 border border-gray-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            Live FX Conversion Calculator
          </h2>
          <p className="text-xs text-gray-400">
            Verify academic rounding convention and percentage fee math.
          </p>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 block mb-1">Source</label>
                <select
                  value={calcSource}
                  onChange={(e) => setCalcSource(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {['USD', 'EUR', 'GBP', 'SGD', 'AED', 'INR'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Destination</label>
                <select
                  value={calcDest}
                  onChange={(e) => setCalcDest(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {['INR', 'USD', 'EUR', 'GBP'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Original Amount ({calcSource})</label>
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">FX Fee Percentage (%): {calcFeePct}%</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.25}
                value={calcFeePct}
                onChange={(e) => setCalcFeePct(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Calculator Breakdown Card */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Rate Applied:</span>
              <span className="text-cyan-400 font-bold">{currentRate.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Converted (Pre-Fee):</span>
              <span className="text-white font-semibold">{calcDest} {convertedBeforeFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">FX Fee ({calcFeePct}%):</span>
              <span className="text-rose-400 font-semibold">{calcDest} {calculatedFee.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-gray-800 flex justify-between font-bold text-sm">
              <span className="text-gray-200">Final Destination Amount:</span>
              <span className="text-emerald-400">{calcDest} {finalDestAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
