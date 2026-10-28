import React, { useEffect, useState } from 'react';
import {
  Database,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { TestRun, Transaction } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  initialRunId?: string;
}

export const TransactionExplorerPage: React.FC<Props> = ({ initialRunId }) => {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId || '');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Load runs
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const allRuns = await api.getTestRuns();
        setRuns(allRuns);
        if (allRuns.length > 0 && !selectedRunId) {
          setSelectedRunId(allRuns[0].id);
        }
      } catch (err) {
        console.error('Failed to load runs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, [initialRunId]);

  // Load transactions with pagination and filters
  useEffect(() => {
    if (!selectedRunId) return;

    const fetchTx = async () => {
      setLoading(true);
      try {
        const res = await api.getTransactions(
          selectedRunId,
          page,
          pageSize,
          statusFilter || undefined,
          typeFilter || undefined,
          customerSearch || undefined
        );
        setTransactions(res.items);
        setTotalCount(res.total);
      } catch (err) {
        console.error('Failed to load transactions', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [selectedRunId, page, pageSize, statusFilter, typeFilter, customerSearch]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/90 p-5 rounded-2xl border border-gray-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Transaction-Level Explorer
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Inspect individual synthetic payments, currency conversions, fraud determinations, and microsecond timings.
          </p>
        </div>

        {selectedRunId && (
          <a
            href={api.getExportCsvUrl(selectedRunId)}
            download={`test_run_${selectedRunId}.csv`}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl border border-gray-700 text-xs font-semibold transition self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download Run CSV</span>
          </a>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Select Run */}
        <div>
          <label className="text-gray-400 font-semibold block mb-1">Experiment Run</label>
          <select
            value={selectedRunId}
            onChange={(e) => {
              setSelectedRunId(e.target.value);
              setPage(1);
            }}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.transaction_count} tx)
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-gray-400 font-semibold block mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FLAGGED">FLAGGED (Fraud)</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        {/* Transaction Type Filter */}
        <div>
          <label className="text-gray-400 font-semibold block mb-1">Type Filter</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Types</option>
            <option value="domestic">Domestic (INR → INR)</option>
            <option value="international">International (FX)</option>
          </select>
        </div>

        {/* Search Customer */}
        <div>
          <label className="text-gray-400 font-semibold block mb-1">Search Customer ID</label>
          <div className="relative">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. CUST_0042"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-900/90 rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold bg-gray-950/60">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Pair</th>
                <th className="py-3 px-4">Original Amount</th>
                <th className="py-3 px-4">FX Conversion</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total Latency</th>
                <th className="py-3 px-4">Breakdown (Pay/FX/Fraud)</th>
                <th className="py-3 px-4">Notes / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No transactions matched the criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                      {tx.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {tx.customer_id}
                    </td>
                    <td className="py-3 px-4 text-cyan-400 font-medium">
                      {tx.source_currency} → {tx.destination_currency}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {tx.source_currency} {Number(tx.original_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {tx.converted_amount ? (
                        <div>
                          <span>{tx.destination_currency} {Number(tx.converted_amount).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500 block">
                            (Rate: {tx.exchange_rate}, Fee: {tx.fx_fee})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {tx.total_duration_ms} ms
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-[11px]">
                      {tx.payment_duration_ms} / {tx.fx_duration_ms} / {tx.fraud_duration_ms} ms
                    </td>
                    <td className="py-3 px-4 text-gray-400 max-w-[200px] truncate">
                      {tx.fraud_reason ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                          {tx.fraud_reason}
                        </span>
                      ) : tx.error_message ? (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {tx.error_message}
                        </span>
                      ) : (
                        <span className="text-gray-500">Processed Clean</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-gray-950/80 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div>
            Showing {transactions.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, totalCount)} of {totalCount} transactions
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4 text-gray-300" />
            </button>
            <span className="font-semibold text-white px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
