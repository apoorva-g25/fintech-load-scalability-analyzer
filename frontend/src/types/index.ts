export interface ServiceLatencies {
  payment_avg_ms: number;
  payment_p95_ms: number;
  fraud_avg_ms: number;
  fraud_p95_ms: number;
  fx_avg_ms: number;
  fx_p95_ms: number;
  notification_avg_wait_ms: number;
  notification_p95_wait_ms: number;
  notification_avg_processing_ms: number;
}

export interface NotificationMetrics {
  queued_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  max_queue_size: number;
  current_queue_size: number;
  avg_wait_time_ms: number;
  p95_wait_time_ms: number;
  avg_processing_time_ms: number;
  drain_time_ms: number;
  num_workers: number;
}

export interface FxConversions {
  total_intl: number;
  success_count: number;
  failure_count: number;
  avg_fx_latency_ms: number;
  p95_fx_latency_ms: number;
}

export interface ResourceUsage {
  cpu_percent: number | string;
  memory_mb: number | string;
}

export interface RunMetrics {
  total_transactions: number;
  total_payment_time_s: number;
  full_pipeline_time_s: number;
  throughput_tps: number;
  pipeline_throughput_tps: number;
  avg_response_time_ms: number;
  p50_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  success_count: number;
  success_rate_pct: number;
  fraud_flagged_count: number;
  fraud_rate_pct: number;
  failed_count: number;
  failure_rate_pct: number;
  domestic_count: number;
  international_count: number;
  fx_conversions: FxConversions;
  service_latencies: ServiceLatencies;
  notification_metrics: NotificationMetrics;
  resource_usage: ResourceUsage;
}

export interface BottleneckFinding {
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  supporting_measurements: Record<string, any>;
  explanation: string;
  recommendation: string;
}

export interface TestRun {
  id: string;
  name: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  transaction_count: number;
  workload_type: 'domestic' | 'international' | 'mixed';
  processing_mode: 'sequential' | 'concurrent';
  concurrency_limit: number;
  intl_percentage: number;
  random_seed: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress: number;
  processed_count: number;
  metrics?: RunMetrics;
  bottlenecks?: BottleneckFinding[];
  error_details?: string;
}

export interface Transaction {
  id: string;
  test_run_id: string;
  customer_id: string;
  transaction_type: string;
  source_currency: string;
  destination_currency: string;
  original_amount: string;
  exchange_rate?: string;
  converted_amount?: string;
  fx_fee?: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'FLAGGED';
  fraud_flagged: boolean;
  fraud_reason?: string;
  total_duration_ms: number;
  payment_duration_ms: number;
  fraud_duration_ms: number;
  fx_duration_ms: number;
  notification_duration_ms: number;
  error_message?: string;
  completed_at?: string;
}

export interface ExchangeRate {
  id: number;
  source_currency: string;
  destination_currency: string;
  rate: number;
  is_active: boolean;
  updated_at?: string;
}

export interface DashboardSummary {
  total_transactions_processed: number;
  total_experiments_count: number;
  completed_experiments_count: number;
  latest_throughput_tps: number;
  latest_avg_response_ms: number;
  latest_p95_response_ms: number;
  latest_success_rate_pct: number;
  active_run?: {
    id: string;
    name: string;
    progress: number;
    status: string;
    processed_count: number;
    transaction_count: number;
  };
  latest_bottlenecks?: BottleneckFinding[];
}

export interface FxAnalytics {
  domestic_transactions_count: number;
  international_transactions_count: number;
  fx_conversion_success_count: number;
  fx_conversion_failure_count: number;
  fx_success_rate_pct: number;
  avg_fx_latency_ms: number;
  p95_fx_latency_ms: number;
  currency_pair_distribution: Record<string, number>;
}

export interface ComparisonItem {
  id: string;
  name: string;
  transaction_count: number;
  processing_mode: string;
  concurrency_limit: number;
  workload_type: string;
  throughput_tps: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  success_rate_pct: number;
  max_queue_size: number;
  fx_avg_ms: number;
  notification_avg_wait_ms: number;
  throughput_improvement_pct?: number;
  latency_reduction_pct?: number;
}

export interface SystemConfig {
  domestic_currency: string;
  supported_currencies: string[];
  default_fx_fee_pct: number;
  fraud_amount_threshold: number;
  fraud_velocity_window_seconds: number;
  fraud_velocity_max_txns: number;
  fraud_probabilistic_rate: number;
  default_concurrency: number;
  default_workers: number;
  base_payment_delay_ms: number;
  base_fx_delay_ms: number;
  base_fraud_delay_ms: number;
  base_notification_delay_ms: number;
}
