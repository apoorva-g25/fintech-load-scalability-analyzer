import type {
  DashboardSummary,
  SystemConfig,
  ExchangeRate,
  FxAnalytics,
  TestRun,
  Transaction,
  ComparisonItem
} from '../types';

const BASE_URL = '/api';

export const api = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${BASE_URL}/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  async getConfig(): Promise<SystemConfig> {
    const res = await fetch(`${BASE_URL}/config`);
    if (!res.ok) throw new Error('Failed to fetch system config');
    return res.json();
  },

  async updateConfig(data: Partial<SystemConfig>): Promise<any> {
    const res = await fetch(`${BASE_URL}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
  },

  async getFxRates(): Promise<ExchangeRate[]> {
    const res = await fetch(`${BASE_URL}/fx/rates`);
    if (!res.ok) throw new Error('Failed to fetch FX rates');
    return res.json();
  },

  async updateFxRate(rate: Partial<ExchangeRate>): Promise<ExchangeRate> {
    const res = await fetch(`${BASE_URL}/fx/rates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rate)
    });
    if (!res.ok) throw new Error('Failed to update FX rate');
    return res.json();
  },

  async getFxAnalytics(): Promise<FxAnalytics> {
    const res = await fetch(`${BASE_URL}/fx/analytics`);
    if (!res.ok) throw new Error('Failed to fetch FX analytics');
    return res.json();
  },

  async createTestRun(payload: any): Promise<TestRun> {
    const res = await fetch(`${BASE_URL}/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create test run' }));
      throw new Error(err.detail || 'Failed to create test run');
    }
    return res.json();
  },

  async getTestRuns(): Promise<TestRun[]> {
    const res = await fetch(`${BASE_URL}/test-runs`);
    if (!res.ok) throw new Error('Failed to fetch test runs');
    return res.json();
  },

  async getTestRun(id: string): Promise<TestRun> {
    const res = await fetch(`${BASE_URL}/test-runs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch test run');
    return res.json();
  },

  async getTestRunStatus(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/test-runs/${id}/status`);
    if (!res.ok) throw new Error('Failed to fetch test run status');
    return res.json();
  },

  async getTransactions(
    runId: string,
    page: number = 1,
    pageSize: number = 50,
    status?: string,
    txType?: string,
    customerId?: string
  ): Promise<{ total: number; page: number; page_size: number; items: Transaction[] }> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString()
    });
    if (status) params.append('status', status);
    if (txType) params.append('tx_type', txType);
    if (customerId) params.append('customer_id', customerId);

    const res = await fetch(`${BASE_URL}/test-runs/${runId}/transactions?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async getAnalytics(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getBottlenecks(runId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/bottlenecks/${runId}`);
    if (!res.ok) throw new Error('Failed to fetch bottlenecks');
    return res.json();
  },

  async compareExperiments(ids: string[]): Promise<{ baseline_run_id: string; comparison: ComparisonItem[] }> {
    const res = await fetch(`${BASE_URL}/comparisons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_run_ids: ids })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
      throw new Error(err.detail || 'Comparison failed');
    }
    return res.json();
  },

  getExportCsvUrl(runId: string): string {
    return `${BASE_URL}/exports/${runId}`;
  },

  getExportExcelUrl(): string {
    return `${BASE_URL}/exports/all/excel`;
  }
};
