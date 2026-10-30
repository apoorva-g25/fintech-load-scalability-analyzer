# API reference

Source: `backend/app/api/routes.py`, `schemas/schemas.py` and `main.py`; generated OpenAPI saved from the locally running application on 30 October 2026. Default API prefix `/api`. No authentication, authorization headers or direct frontend database access are implemented. All URLs below are paths, not deployed URLs.

Most successful JSON routes return HTTP 200. Pydantic/query validation produces 422 with a `detail` list; explicit errors use `{"detail": "message"}`. Unhandled errors may return 500; no global custom error envelope exists. Datetimes are naive UTC strings. Numeric financial transaction fields are strings. Synthetic services do not call real FX/payment/notification providers. Examples below are actual local HTTP responses from a disposable database, not historical benchmarks; UUIDs/timestamps vary.

Interactive docs: GET `/docs`; schema: GET `/openapi.json`; alternate documentation: GET `/redoc`. Framework docs endpoints are not business APIs. Examples of health, schema and docs retrieval are saved in HTTP evidence.

## GET `/api/health`

Liveness only: healthy/service/version. No database or worker readiness probe.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /api/health`

Observed response:

```json
{
  "status": "healthy",
  "service": "FinTech System Load & Scalability Analyzer",
  "version": "1.0.0"
}
```

## GET `/api/dashboard/summary`

Counts all stored transactions (including failed/flagged), all/completed experiments; returns metrics/bottlenecks from latest completed run and newest QUEUED/RUNNING run or null.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /api/dashboard/summary`

Observed response:

```json
{
  "total_transactions_processed": 40,
  "total_experiments_count": 2,
  "completed_experiments_count": 2,
  "latest_throughput_tps": 1427.59,
  "latest_avg_response_ms": 3.79,
  "latest_p95_response_ms": 5.95,
  "latest_success_rate_pct": 75.0,
  "active_run": null,
  "latest_bottlenecks": [
    {
      "title": "Insufficient Data for Statistical Bottleneck Analysis",
      "severity": "INFO",
      "supporting_measurements": {
        "transaction_count": 20
      },
      "explanation": "Workloads smaller than 50 transactions do not exhibit steady-state queue or resource characteristics.",
      "recommendation": "Execute a workload of at least 500 to 1,000 transactions for conclusive bottleneck detection."
    }
  ]
}
```

## GET `/api/config`

GET returns selected settings. PUT accepts an arbitrary JSON object, recognizes fraud_amount_threshold, default_fx_fee_pct, base_fx_delay_ms and base_notification_delay_ms, and ignores other keys. Updates are process-local and reset on restart. The fee setting does not reach PaymentEngine conversion. Values have no dedicated typed/range validation; invalid values may cause 500 or later job failure.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /api/config`

Observed response:

```json
{
  "domestic_currency": "INR",
  "supported_currencies": [
    "INR",
    "USD",
    "EUR",
    "GBP",
    "SGD",
    "AED",
    "JPY"
  ],
  "default_fx_fee_pct": 1.0,
  "fraud_amount_threshold": 250000.0,
  "fraud_velocity_window_seconds": 60,
  "fraud_velocity_max_txns": 5,
  "fraud_probabilistic_rate": 0.015,
  "default_concurrency": 50,
  "default_workers": 4,
  "base_payment_delay_ms": 5.0,
  "base_fx_delay_ms": 8.0,
  "base_fraud_delay_ms": 6.0,
  "base_notification_delay_ms": 12.0
}
```

## PUT `/api/config`

GET returns selected settings. PUT accepts an arbitrary JSON object, recognizes fraud_amount_threshold, default_fx_fee_pct, base_fx_delay_ms and base_notification_delay_ms, and ignores other keys. Updates are process-local and reset on restart. The fee setting does not reach PaymentEngine conversion. Values have no dedicated typed/range validation; invalid values may cause 500 or later job failure.

Parameters: none.

Request body (JSON; schema references are fully listed below):

```json
{
  "content": {
    "application/json": {
      "schema": {
        "additionalProperties": true,
        "type": "object",
        "title": "Config Data"
      }
    }
  },
  "required": true
}
```
Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `PUT /api/config`

```json
{
  "base_fx_delay_ms": 8.0
}
```
Observed response:

```json
{
  "status": "updated",
  "config": {
    "domestic_currency": "INR",
    "supported_currencies": [
      "INR",
      "USD",
      "EUR",
      "GBP",
      "SGD",
      "AED",
      "JPY"
    ],
    "default_fx_fee_pct": 1.0,
    "fraud_amount_threshold": 250000.0,
    "fraud_velocity_window_seconds": 60,
    "fraud_velocity_max_txns": 5,
    "fraud_probabilistic_rate": 0.015,
    "default_concurrency": 50,
    "default_workers": 4,
    "base_payment_delay_ms": 5.0,
    "base_fx_delay_ms": 8.0,
    "base_fraud_delay_ms": 6.0,
    "base_notification_delay_ms": 12.0
  }
}
```

## GET `/api/fx/rates`

GET returns every rate including inactive entries; reseeds defaults only if empty. PUT upserts the source/destination pair. Its strings/rate are not constrained to supported codes/positive values. Rows include id, source_currency, destination_currency, rate, is_active and updated_at. Default cache behavior can bypass edited/deactivated database rates.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /api/fx/rates`

Observed response:

```json
[
  {
    "is_active": true,
    "source_currency": "USD",
    "destination_currency": "INR",
    "id": 1,
    "rate": 83.25,
    "updated_at": "2026-10-30T12:17:18.669120"
  },
  {
    "is_active": true,
    "source_currency": "EUR",
    "destination_currency": "INR",
    "id": 2,
    "rate": 89.5,
    "updated_at": "2026-10-30T12:17:18.669120"
  },
  {
    "is_active": true,
    "source_currency": "GBP",
    "destination_currency": "INR",
    "id": 3,
    "rate": 105.1,
    "updated_at": "2026-10-30T12:17:18.669120"
  },
  {
    "is_active": true,
    "source_currency": "SGD",
    "destination_currency": "INR",
    "id": 4,
    "rate": 61.8,
    "updated_at": "2026-10-30T12:17:18.669120"
  },
  {
    "is_active": true,
    "source_currency": "AED",
    "destination_currency": "INR",
    "id": 5,
    "rate": 22.65,
    "updated_at": "2026-10-30T12:17:18.669120"
  },
  {
    "is_active": true,
    "source_currency": "USD",
    "destination_currency": "EUR",
    "id": 6,
    "rate": 0.93,
    "updated_at": "2026-10-30T12:17:18.669120"
  },
  {
    "is_active": true,
    "source_currency": "GBP",
    "destination_currency": "USD",
    "id": 7,
    "rate": 1.26,
    "updated_at": "2026-10-30T12:17:18.669120"
  }
]
```

## PUT `/api/fx/rates`

GET returns every rate including inactive entries; reseeds defaults only if empty. PUT upserts the source/destination pair. Its strings/rate are not constrained to supported codes/positive values. Rows include id, source_currency, destination_currency, rate, is_active and updated_at. Default cache behavior can bypass edited/deactivated database rates.

Parameters: none.

Request body (JSON; schema references are fully listed below):

```json
{
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/ExchangeRateSchema"
      }
    }
  },
  "required": true
}
```
Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `PUT /api/fx/rates`

```json
{
  "source_currency": "USD",
  "destination_currency": "INR",
  "rate": 83.25,
  "is_active": true
}
```
Observed response:

```json
{
  "is_active": true,
  "source_currency": "USD",
  "destination_currency": "INR",
  "id": 1,
  "rate": 83.25,
  "updated_at": "2026-10-30T12:17:18.669120"
}
```

## GET `/api/fx/analytics`

Aggregates all stored international/domestic records. FX success is non-null rate, not final SUCCESS. P95 uses sorted index int(n*0.95), unlike interpolated run percentiles. Empty data yields zero counts/latencies and 100% FX success rate.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /api/fx/analytics`

Observed response:

```json
{
  "domestic_transactions_count": 24,
  "international_transactions_count": 16,
  "fx_conversion_success_count": 16,
  "fx_conversion_failure_count": 0,
  "fx_success_rate_pct": 100.0,
  "avg_fx_latency_ms": 0.36,
  "p95_fx_latency_ms": 3.05,
  "currency_pair_distribution": {
    "USD → INR": 4,
    "INR → AED": 4,
    "SGD → INR": 6,
    "GBP → INR": 2
  }
}
```

## POST `/api/test-runs`

GET lists newest created runs with skip/limit. POST stores QUEUED, returns HTTP 200 (not 202), schedules an in-process background task and may respond before completion. An observed RUNNING experiment gives 409, but QUEUED/atomic admission is not protected. Submitting runs does not directly accept custom transaction lists. Service config objects are arbitrary dictionaries; zero notification workers can hang processing.

Parameters: none.

Request body (JSON; schema references are fully listed below):

```json
{
  "required": true,
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/TestRunCreate"
      }
    }
  }
}
```
Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/TestRunResponse"
        }
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `POST /api/test-runs`

```json
{
  "name": "HTTP-Smoke-sequential",
  "transaction_count": 20,
  "processing_mode": "sequential",
  "workload_type": "mixed",
  "random_seed": 77,
  "concurrency_limit": 10
}
```
Observed response:

```json
{
  "id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
  "name": "HTTP-Smoke-sequential",
  "status": "QUEUED",
  "transaction_count": 20,
  "workload_type": "mixed",
  "processing_mode": "sequential",
  "concurrency_limit": 10,
  "intl_percentage": 50.0,
  "random_seed": 77,
  "created_at": "2026-10-30T12:17:19.246330",
  "started_at": null,
  "completed_at": null,
  "progress": 0.0,
  "processed_count": 0,
  "metrics": null,
  "bottlenecks": null,
  "error_details": null
}
```

## GET `/api/test-runs`

GET lists newest created runs with skip/limit. POST stores QUEUED, returns HTTP 200 (not 202), schedules an in-process background task and may respond before completion. An observed RUNNING experiment gives 409, but QUEUED/atomic admission is not protected. Submitting runs does not directly accept custom transaction lists. Service config objects are arbitrary dictionaries; zero notification workers can hang processing.

| Parameter | Location | Required | Type / default / constraints |
|---|---|---|---|
| skip | query | False | `{"type": "integer", "minimum": 0, "default": 0, "title": "Skip"}` |
| limit | query | False | `{"type": "integer", "maximum": 100, "minimum": 1, "default": 50, "title": "Limit"}` |

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {
          "type": "array",
          "items": {
            "$ref": "#/components/schemas/TestRunResponse"
          },
          "title": "Response List Test Runs Api Test Runs Get"
        }
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `GET /api/test-runs`

Observed response:

```json
[
  {
    "id": "25e3dc82-3227-4183-b691-5c3fb56fb968",
    "name": "HTTP-Smoke-concurrent",
    "status": "COMPLETED",
    "transaction_count": 20,
    "workload_type": "mixed",
    "processing_mode": "concurrent",
    "concurrency_limit": 10,
    "intl_percentage": 50.0,
    "random_seed": 77,
    "created_at": "2026-10-30T12:17:19.483081",
    "started_at": "2026-10-30T12:17:19.489830",
    "completed_at": "2026-10-30T12:17:19.539028",
    "progress": 100.0,
    "processed_count": 20,
    "metrics": {
      "total_transactions": 20,
      "total_payment_time_s": 0.014,
      "full_pipeline_time_s": 0.0364,
      "throughput_tps": 1427.59,
      "pipeline_throughput_tps": 549.26,
      "avg_response_time_ms": 3.79,
      "p50_response_time_ms": 4.08,
      "p95_response_time_ms": 5.95,
      "p99_response_time_ms": 6.02,
      "success_count": 15,
      "success_rate_pct": 75.0,
      "fraud_flagged_count": 5,
      "fraud_rate_pct": 25.0,
      "failed_count": 0,
      "failure_rate_pct": 0.0,
      "domestic_count": 12,
      "international_count": 8,
      "fx_conversions": {
        "total_intl": 8,
        "success_count": 8,
        "failure_count": 0,
        "avg_fx_latency_ms": 0.34,
        "p95_fx_latency_ms": 1.73
      },
      "service_latencies": {
        "payment_avg_ms": 0.44,
        "payment_p95_ms": 0.51,
        "fraud_avg_ms": 3.21,
        "fraud_p95_ms": 5.68,
        "fx_avg_ms": 0.34,
        "fx_p95_ms": 1.73,
        "notification_avg_wait_ms": 5.9,
        "notification_p95_wait_ms": 12.08,
        "notification_avg_processing_ms": 6.31
      },
      "notification_metrics": {
        "queued_count": 20,
        "processed_count": 20,
        "success_count": 20,
        "failed_count": 0,
        "max_queue_size": 15,
        "current_queue_size": 0,
        "avg_wait_time_ms": 5.9,
        "p95_wait_time_ms": 12.08,
        "avg_processing_time_ms": 6.31,
        "drain_time_ms": 22.4,
        "num_workers": 4
      },
      "resource_usage": {
        "cpu_percent": 20.4,
        "memory_mb": 92.35
      }
    },
    "bottlenecks": [
      {
        "title": "Insufficient Data for Statistical Bottleneck Analysis",
        "severity": "INFO",
        "supporting_measurements": {
          "transaction_count": 20
        },
        "explanation": "Workloads smaller than 50 transactions do not exhibit steady-state queue or resource characteristics.",
        "recommendation": "Execute a workload of at least 500 to 1,000 transactions for conclusive bottleneck detection."
      }
    ],
    "error_details": null
  },
  {
    "id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
    "name": "HTTP-Smoke-sequential",
    "status": "COMPLETED",
    "transaction_count": 20,
    "workload_type": "mixed",
    "processing_mode": "sequential",
    "concurrency_limit": 10,
    "intl_percentage": 50.0,
    "random_seed": 77,
    "created_at": "2026-10-30T12:17:19.246330",
    "started_at": "2026-10-30T12:17:19.264285",
    "completed_at": "2026-10-30T12:17:19.392073",
    "progress": 100.0,
    "processed_count": 20,
    "metrics": {
      "total_transactions": 20,
      "total_payment_time_s": 0.1129,
      "full_pipeline_time_s": 0.1134,
      "throughput_tps": 177.13,
      "pipeline_throughput_tps": 176.38,
      "avg_response_time_ms": 0.55,
      "p50_response_time_ms": 0.18,
      "p95_response_time_ms": 2.72,
      "p99_response_time_ms": 3.19,
      "success_count": 15,
      "success_rate_pct": 75.0,
      "fraud_flagged_count": 5,
      "fraud_rate_pct": 25.0,
      "failed_count": 0,
      "failure_rate_pct": 0.0,
      "domestic_count": 12,
      "international_count": 8,
      "fx_conversions": {
        "total_intl": 8,
        "success_count": 8,
        "failure_count": 0,
        "avg_fx_latency_ms": 0.39,
        "p95_fx_latency_ms": 1.99
      },
      "service_latencies": {
        "payment_avg_ms": 0.2,
        "payment_p95_ms": 0.51,
        "fraud_avg_ms": 0.17,
        "fraud_p95_ms": 0.27,
        "fx_avg_ms": 0.39,
        "fx_p95_ms": 1.99,
        "notification_avg_wait_ms": 4.6,
        "notification_p95_wait_ms": 14.4,
        "notification_avg_processing_ms": 4.83
      },
      "notification_metrics": {
        "queued_count": 20,
        "processed_count": 20,
        "success_count": 20,
        "failed_count": 0,
        "max_queue_size": 1,
        "current_queue_size": 0,
        "avg_wait_time_ms": 4.6,
        "p95_wait_time_ms": 14.4,
        "avg_processing_time_ms": 4.83,
        "drain_time_ms": 0.47,
        "num_workers": 4
      },
      "resource_usage": {
        "cpu_percent": 29.2,
        "memory_mb": 91.61
      }
    },
    "bottlenecks": [
      {
        "title": "Insufficient Data for Statistical Bottleneck Analysis",
        "severity": "INFO",
        "supporting_measurements": {
          "transaction_count": 20
        },
        "explanation": "Workloads smaller than 50 transactions do not exhibit steady-state queue or resource characteristics.",
        "recommendation": "Execute a workload of at least 500 to 1,000 transactions for conclusive bottleneck detection."
      }
    ],
    "error_details": null
  }
]
```

## GET `/api/test-runs/{run_id}`

Retrieves run response model. Missing run: 404 detail "Test run not found". The response does not expose config_snapshot even though the database stores it.

| Parameter | Location | Required | Type / default / constraints |
|---|---|---|---|
| run_id | path | True | `{"type": "string", "title": "Run Id"}` |

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/TestRunResponse"
        }
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `GET /api/test-runs/62fcc31c-2859-4ebc-bff1-66a7622886a7`

Observed response:

```json
{
  "id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
  "name": "HTTP-Smoke-sequential",
  "status": "COMPLETED",
  "transaction_count": 20,
  "workload_type": "mixed",
  "processing_mode": "sequential",
  "concurrency_limit": 10,
  "intl_percentage": 50.0,
  "random_seed": 77,
  "created_at": "2026-10-30T12:17:19.246330",
  "started_at": "2026-10-30T12:17:19.264285",
  "completed_at": "2026-10-30T12:17:19.392073",
  "progress": 100.0,
  "processed_count": 20,
  "metrics": {
    "total_transactions": 20,
    "total_payment_time_s": 0.1129,
    "full_pipeline_time_s": 0.1134,
    "throughput_tps": 177.13,
    "pipeline_throughput_tps": 176.38,
    "avg_response_time_ms": 0.55,
    "p50_response_time_ms": 0.18,
    "p95_response_time_ms": 2.72,
    "p99_response_time_ms": 3.19,
    "success_count": 15,
    "success_rate_pct": 75.0,
    "fraud_flagged_count": 5,
    "fraud_rate_pct": 25.0,
    "failed_count": 0,
    "failure_rate_pct": 0.0,
    "domestic_count": 12,
    "international_count": 8,
    "fx_conversions": {
      "total_intl": 8,
      "success_count": 8,
      "failure_count": 0,
      "avg_fx_latency_ms": 0.39,
      "p95_fx_latency_ms": 1.99
    },
    "service_latencies": {
      "payment_avg_ms": 0.2,
      "payment_p95_ms": 0.51,
      "fraud_avg_ms": 0.17,
      "fraud_p95_ms": 0.27,
      "fx_avg_ms": 0.39,
      "fx_p95_ms": 1.99,
      "notification_avg_wait_ms": 4.6,
      "notification_p95_wait_ms": 14.4,
      "notification_avg_processing_ms": 4.83
    },
    "notification_metrics": {
      "queued_count": 20,
      "processed_count": 20,
      "success_count": 20,
      "failed_count": 0,
      "max_queue_size": 1,
      "current_queue_size": 0,
      "avg_wait_time_ms": 4.6,
      "p95_wait_time_ms": 14.4,
      "avg_processing_time_ms": 4.83,
      "drain_time_ms": 0.47,
      "num_workers": 4
    },
    "resource_usage": {
      "cpu_percent": 29.2,
      "memory_mb": 91.61
    }
  },
  "bottlenecks": [
    {
      "title": "Insufficient Data for Statistical Bottleneck Analysis",
      "severity": "INFO",
      "supporting_measurements": {
        "transaction_count": 20
      },
      "explanation": "Workloads smaller than 50 transactions do not exhibit steady-state queue or resource characteristics.",
      "recommendation": "Execute a workload of at least 500 to 1,000 transactions for conclusive bottleneck detection."
    }
  ],
  "error_details": null
}
```

## GET `/api/test-runs/{run_id}/status`

Returns id/status/progress/processed_count/transaction_count/metrics/bottlenecks/error_details. Missing run: 404.

| Parameter | Location | Required | Type / default / constraints |
|---|---|---|---|
| run_id | path | True | `{"type": "string", "title": "Run Id"}` |

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `GET /api/test-runs/62fcc31c-2859-4ebc-bff1-66a7622886a7/status`

Observed response:

```json
{
  "id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
  "status": "COMPLETED",
  "progress": 100.0,
  "processed_count": 20,
  "transaction_count": 20,
  "metrics": {
    "total_transactions": 20,
    "total_payment_time_s": 0.1129,
    "full_pipeline_time_s": 0.1134,
    "throughput_tps": 177.13,
    "pipeline_throughput_tps": 176.38,
    "avg_response_time_ms": 0.55,
    "p50_response_time_ms": 0.18,
    "p95_response_time_ms": 2.72,
    "p99_response_time_ms": 3.19,
    "success_count": 15,
    "success_rate_pct": 75.0,
    "fraud_flagged_count": 5,
    "fraud_rate_pct": 25.0,
    "failed_count": 0,
    "failure_rate_pct": 0.0,
    "domestic_count": 12,
    "international_count": 8,
    "fx_conversions": {
      "total_intl": 8,
      "success_count": 8,
      "failure_count": 0,
      "avg_fx_latency_ms": 0.39,
      "p95_fx_latency_ms": 1.99
    },
    "service_latencies": {
      "payment_avg_ms": 0.2,
      "payment_p95_ms": 0.51,
      "fraud_avg_ms": 0.17,
      "fraud_p95_ms": 0.27,
      "fx_avg_ms": 0.39,
      "fx_p95_ms": 1.99,
      "notification_avg_wait_ms": 4.6,
      "notification_p95_wait_ms": 14.4,
      "notification_avg_processing_ms": 4.83
    },
    "notification_metrics": {
      "queued_count": 20,
      "processed_count": 20,
      "success_count": 20,
      "failed_count": 0,
      "max_queue_size": 1,
      "current_queue_size": 0,
      "avg_wait_time_ms": 4.6,
      "p95_wait_time_ms": 14.4,
      "avg_processing_time_ms": 4.83,
      "drain_time_ms": 0.47,
      "num_workers": 4
    },
    "resource_usage": {
      "cpu_percent": 29.2,
      "memory_mb": 91.61
    }
  },
  "bottlenecks": [
    {
      "title": "Insufficient Data for Statistical Bottleneck Analysis",
      "severity": "INFO",
      "supporting_measurements": {
        "transaction_count": 20
      },
      "explanation": "Workloads smaller than 50 transactions do not exhibit steady-state queue or resource characteristics.",
      "recommendation": "Execute a workload of at least 500 to 1,000 transactions for conclusive bottleneck detection."
    }
  ],
  "error_details": null
}
```

## GET `/api/test-runs/{run_id}/transactions`

Filters by status, tx_type and customer_id substring (case-insensitive SQL ILIKE translation); returns total/page/page_size/items. Orders by started_at descending. Unknown run returns empty page rather than 404. TransactionResponse omits created_at/started_at although persisted.

| Parameter | Location | Required | Type / default / constraints |
|---|---|---|---|
| run_id | path | True | `{"type": "string", "title": "Run Id"}` |
| page | query | False | `{"type": "integer", "minimum": 1, "default": 1, "title": "Page"}` |
| page_size | query | False | `{"type": "integer", "maximum": 200, "minimum": 1, "default": 50, "title": "Page Size"}` |
| status | query | False | `{"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Status"}` |
| tx_type | query | False | `{"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Tx Type"}` |
| customer_id | query | False | `{"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Customer Id"}` |

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `GET /api/test-runs/62fcc31c-2859-4ebc-bff1-66a7622886a7/transactions?page=1&page_size=10`

Observed response:

```json
{
  "total": 20,
  "page": 1,
  "page_size": 10,
  "items": [
    {
      "id": "e99b7314-eb6a-46b1-8500-0c0bd8866d84",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0193",
      "transaction_type": "international",
      "source_currency": "SGD",
      "destination_currency": "INR",
      "original_amount": "680.3",
      "exchange_rate": "61.8",
      "converted_amount": "41622.11",
      "fx_fee": "420.43",
      "status": "SUCCESS",
      "fraud_flagged": false,
      "fraud_reason": null,
      "total_duration_ms": 0.65,
      "payment_duration_ms": 0.51,
      "fraud_duration_ms": 0.11,
      "fx_duration_ms": 0.01,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.377564"
    },
    {
      "id": "e304b1f8-2394-423c-880b-aeffef6ed441",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0038",
      "transaction_type": "international",
      "source_currency": "SGD",
      "destination_currency": "INR",
      "original_amount": "4120.79",
      "exchange_rate": "61.8",
      "converted_amount": "252118.17",
      "fx_fee": "2546.65",
      "status": "FLAGGED",
      "fraud_flagged": true,
      "fraud_reason": "High-value transaction: 252118.17 exceeds threshold 250000.00",
      "total_duration_ms": 0.18,
      "payment_duration_ms": 0.12,
      "fraud_duration_ms": 0.03,
      "fx_duration_ms": 0.01,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.372387"
    },
    {
      "id": "d8babe63-7435-426d-b0c1-24fb6a61db79",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0015",
      "transaction_type": "domestic",
      "source_currency": "INR",
      "destination_currency": "INR",
      "original_amount": "29487.89",
      "exchange_rate": "1.0",
      "converted_amount": "29487.89",
      "fx_fee": "0.00",
      "status": "SUCCESS",
      "fraud_flagged": false,
      "fraud_reason": null,
      "total_duration_ms": 0.17,
      "payment_duration_ms": 0.12,
      "fraud_duration_ms": 0.03,
      "fx_duration_ms": 0.0,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.367497"
    },
    {
      "id": "b773945f-5d15-4c19-8fe3-4654ec1ed018",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0111",
      "transaction_type": "international",
      "source_currency": "INR",
      "destination_currency": "AED",
      "original_amount": "3105.02",
      "exchange_rate": "0.044150",
      "converted_amount": "135.72",
      "fx_fee": "1.37",
      "status": "FLAGGED",
      "fraud_flagged": true,
      "fraud_reason": "High-value transaction: 257716.660 exceeds threshold 250000.00",
      "total_duration_ms": 0.23,
      "payment_duration_ms": 0.15,
      "fraud_duration_ms": 0.04,
      "fx_duration_ms": 0.02,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.363756"
    },
    {
      "id": "f6b3f544-8d52-491f-b43a-76f4a5d248cd",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0014",
      "transaction_type": "international",
      "source_currency": "GBP",
      "destination_currency": "INR",
      "original_amount": "3426.7",
      "exchange_rate": "105.1",
      "converted_amount": "356544.71",
      "fx_fee": "3601.46",
      "status": "FLAGGED",
      "fraud_flagged": true,
      "fraud_reason": "High-value transaction: 356544.71 exceeds threshold 250000.00",
      "total_duration_ms": 0.18,
      "payment_duration_ms": 0.11,
      "fraud_duration_ms": 0.03,
      "fx_duration_ms": 0.01,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.358695"
    },
    {
      "id": "8a1e7fb3-098b-490b-b7dc-ce85ea901cc0",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0197",
      "transaction_type": "domestic",
      "source_currency": "INR",
      "destination_currency": "INR",
      "original_amount": "496359.43",
      "exchange_rate": "1.0",
      "converted_amount": "496359.43",
      "fx_fee": "0.00",
      "status": "FLAGGED",
      "fraud_flagged": true,
      "fraud_reason": "High-value transaction: 496359.43 exceeds threshold 250000.00",
      "total_duration_ms": 0.18,
      "payment_duration_ms": 0.12,
      "fraud_duration_ms": 0.04,
      "fx_duration_ms": 0.0,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.354688"
    },
    {
      "id": "2cf4959d-3b76-4a2a-ac2d-d60f56a8138b",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0136",
      "transaction_type": "international",
      "source_currency": "SGD",
      "destination_currency": "INR",
      "original_amount": "3328.22",
      "exchange_rate": "61.8",
      "converted_amount": "203627.16",
      "fx_fee": "2056.84",
      "status": "SUCCESS",
      "fraud_flagged": false,
      "fraud_reason": null,
      "total_duration_ms": 0.17,
      "payment_duration_ms": 0.11,
      "fraud_duration_ms": 0.04,
      "fx_duration_ms": 0.01,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.350688"
    },
    {
      "id": "8d5bedbc-d384-4f3e-90ca-93b5a02c21f2",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0198",
      "transaction_type": "domestic",
      "source_currency": "INR",
      "destination_currency": "INR",
      "original_amount": "42569.42",
      "exchange_rate": "1.0",
      "converted_amount": "42569.42",
      "fx_fee": "0.00",
      "status": "SUCCESS",
      "fraud_flagged": false,
      "fraud_reason": null,
      "total_duration_ms": 0.14,
      "payment_duration_ms": 0.09,
      "fraud_duration_ms": 0.03,
      "fx_duration_ms": 0.0,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.346688"
    },
    {
      "id": "4c846daf-7d30-46f9-86b6-bad27e995e51",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0142",
      "transaction_type": "domestic",
      "source_currency": "INR",
      "destination_currency": "INR",
      "original_amount": "23884.55",
      "exchange_rate": "1.0",
      "converted_amount": "23884.55",
      "fx_fee": "0.00",
      "status": "SUCCESS",
      "fraud_flagged": false,
      "fraud_reason": null,
      "total_duration_ms": 0.18,
      "payment_duration_ms": 0.12,
      "fraud_duration_ms": 0.05,
      "fx_duration_ms": 0.0,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.341679"
    },
    {
      "id": "6d9fe92e-afc4-48ee-93c3-e90669205348",
      "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "customer_id": "CUST_0138",
      "transaction_type": "domestic",
      "source_currency": "INR",
      "destination_currency": "INR",
      "original_amount": "28255.4",
      "exchange_rate": "1.0",
      "converted_amount": "28255.4",
      "fx_fee": "0.00",
      "status": "SUCCESS",
      "fraud_flagged": false,
      "fraud_reason": null,
      "total_duration_ms": 0.15,
      "payment_duration_ms": 0.11,
      "fraud_duration_ms": 0.03,
      "fx_duration_ms": 0.0,
      "notification_duration_ms": 0.0,
      "error_message": null,
      "completed_at": "2026-10-30T12:17:19.336171"
    }
  ]
}
```

## GET `/api/analytics`

Chronological completed runs only; maps count/mode/concurrency and throughput, response/service latency, success rate and queue peaks to flat chart fields. Does not calculate new performance trials.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /api/analytics`

Observed response:

```json
[
  {
    "id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
    "name": "HTTP-Smoke-sequential",
    "transaction_count": 20,
    "mode": "sequential",
    "concurrency": 10,
    "throughput_tps": 177.13,
    "avg_latency_ms": 0.55,
    "p95_latency_ms": 2.72,
    "p99_latency_ms": 3.19,
    "success_rate_pct": 75.0,
    "payment_lat_ms": 0.2,
    "fraud_lat_ms": 0.17,
    "fx_lat_ms": 0.39,
    "notification_wait_ms": 4.6,
    "max_queue_size": 1
  },
  {
    "id": "25e3dc82-3227-4183-b691-5c3fb56fb968",
    "name": "HTTP-Smoke-concurrent",
    "transaction_count": 20,
    "mode": "concurrent",
    "concurrency": 10,
    "throughput_tps": 1427.59,
    "avg_latency_ms": 3.79,
    "p95_latency_ms": 5.95,
    "p99_latency_ms": 6.02,
    "success_rate_pct": 75.0,
    "payment_lat_ms": 0.44,
    "fraud_lat_ms": 3.21,
    "fx_lat_ms": 0.34,
    "notification_wait_ms": 5.9,
    "max_queue_size": 15
  }
]
```

## GET `/api/bottlenecks/{run_id}`

Returns test_run_id/test_run_name/bottlenecks (empty list when absent); missing run: 404.

| Parameter | Location | Required | Type / default / constraints |
|---|---|---|---|
| run_id | path | True | `{"type": "string", "title": "Run Id"}` |

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `GET /api/bottlenecks/62fcc31c-2859-4ebc-bff1-66a7622886a7`

Observed response:

```json
{
  "test_run_id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
  "test_run_name": "HTTP-Smoke-sequential",
  "bottlenecks": [
    {
      "title": "Insufficient Data for Statistical Bottleneck Analysis",
      "severity": "INFO",
      "supporting_measurements": {
        "transaction_count": 20
      },
      "explanation": "Workloads smaller than 50 transactions do not exhibit steady-state queue or resource characteristics.",
      "recommendation": "Execute a workload of at least 500 to 1,000 transactions for conclusive bottleneck detection."
    }
  ]
}
```

## POST `/api/comparisons`

Retrieves matching IDs without ordering; the first DB result becomes baseline. Missing IDs are silently omitted if at least two remain; fewer than two results gives 400. No completed-status/equal-configuration enforcement. Positive throughput_improvement_pct = (TPS-baseline)/baseline*100; positive latency_reduction_pct = (baseline-latency)/baseline*100. Zero denominator gives zero; rounded to two decimals.

Parameters: none.

Request body (JSON; schema references are fully listed below):

```json
{
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/ComparisonRequest"
      }
    }
  },
  "required": true
}
```
Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `POST /api/comparisons`

```json
{
  "test_run_ids": [
    "62fcc31c-2859-4ebc-bff1-66a7622886a7",
    "25e3dc82-3227-4183-b691-5c3fb56fb968"
  ]
}
```
Observed response:

```json
{
  "baseline_run_id": "25e3dc82-3227-4183-b691-5c3fb56fb968",
  "comparison": [
    {
      "id": "25e3dc82-3227-4183-b691-5c3fb56fb968",
      "name": "HTTP-Smoke-concurrent",
      "transaction_count": 20,
      "processing_mode": "concurrent",
      "concurrency_limit": 10,
      "workload_type": "mixed",
      "throughput_tps": 1427.59,
      "avg_latency_ms": 3.79,
      "p95_latency_ms": 5.95,
      "success_rate_pct": 75.0,
      "max_queue_size": 15,
      "fx_avg_ms": 0.34,
      "notification_avg_wait_ms": 5.9,
      "throughput_improvement_pct": 0.0,
      "latency_reduction_pct": 0.0
    },
    {
      "id": "62fcc31c-2859-4ebc-bff1-66a7622886a7",
      "name": "HTTP-Smoke-sequential",
      "transaction_count": 20,
      "processing_mode": "sequential",
      "concurrency_limit": 10,
      "workload_type": "mixed",
      "throughput_tps": 177.13,
      "avg_latency_ms": 0.55,
      "p95_latency_ms": 2.72,
      "success_rate_pct": 75.0,
      "max_queue_size": 1,
      "fx_avg_ms": 0.39,
      "notification_avg_wait_ms": 4.6,
      "throughput_improvement_pct": -87.59,
      "latency_reduction_pct": 85.49
    }
  ]
}
```

## GET `/api/exports/{run_id}`

Returns text/csv attachment test_run_<id>.csv, all records for one run; no records gives 404 detail "No transactions found for this run". CSV columns: transaction_id,test_run_id,customer_id,type,source_currency,dest_currency,original_amount,exchange_rate,converted_amount,fx_fee,status,fraud_flagged,fraud_reason,total_duration_ms,payment_duration_ms,fraud_duration_ms,fx_duration_ms,error_message,completed_at. Built in memory.

| Parameter | Location | Required | Type / default / constraints |
|---|---|---|---|
| run_id | path | True | `{"type": "string", "title": "Run Id"}` |

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  },
  "422": {
    "description": "Validation Error",
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/HTTPValidationError"
        }
      }
    }
  }
}
```
Observed request: `GET /api/exports/62fcc31c-2859-4ebc-bff1-66a7622886a7`

Observed response:

```json
{
  "content_type": "text/csv; charset=utf-8",
  "bytes": 4448
}
```
The JSON above summarizes response headers/bytes for this binary/text download; the endpoint itself returns file content, not that JSON object.


## GET `/api/exports/all/excel`

Returns application/vnd.openxmlformats-officedocument.spreadsheetml.sheet attachment Experimental_Results.xlsx. Workbook sheets: Test Summary and FX Analysis, completed runs only; no transaction sheet. Empty completed history still produces headers. Built in memory.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /api/exports/all/excel`

Observed response:

```json
{
  "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "bytes": 6250
}
```
The JSON above summarizes response headers/bytes for this binary/text download; the endpoint itself returns file content, not that JSON object.


## GET `/`

Welcome/version/docs metadata. Does not test database readiness.

Parameters: none.

Request body: none.

Declared response schema/statuses (untyped handlers use `{}`; use the observed example and notes for the actual shape):

```json
{
  "200": {
    "description": "Successful Response",
    "content": {
      "application/json": {
        "schema": {}
      }
    }
  }
}
```
Observed request: `GET /`

Observed response:

```json
{
  "message": "Welcome to FinTech System Load & Scalability Analyzer",
  "version": "1.0.0",
  "docs_url": "/docs",
  "api_prefix": "/api"
}
```

## Complete request and response model definitions

These are the actual OpenAPI component schemas, including defaults, required fields, bounds, nullability and referenced validation errors. Generic service-config dictionaries deliberately do not specify supported-key validation.

### ComparisonRequest

```json
{
  "properties": {
    "test_run_ids": {
      "items": {
        "type": "string"
      },
      "type": "array",
      "title": "Test Run Ids"
    }
  },
  "type": "object",
  "required": [
    "test_run_ids"
  ],
  "title": "ComparisonRequest"
}
```

### ExchangeRateSchema

```json
{
  "properties": {
    "source_currency": {
      "type": "string",
      "title": "Source Currency"
    },
    "destination_currency": {
      "type": "string",
      "title": "Destination Currency"
    },
    "rate": {
      "type": "number",
      "title": "Rate"
    },
    "is_active": {
      "type": "boolean",
      "title": "Is Active",
      "default": true
    }
  },
  "type": "object",
  "required": [
    "source_currency",
    "destination_currency",
    "rate"
  ],
  "title": "ExchangeRateSchema"
}
```

### HTTPValidationError

```json
{
  "properties": {
    "detail": {
      "items": {
        "$ref": "#/components/schemas/ValidationError"
      },
      "type": "array",
      "title": "Detail"
    }
  },
  "type": "object",
  "title": "HTTPValidationError"
}
```

### TestRunCreate

```json
{
  "properties": {
    "name": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Name",
      "default": "Simulation Run"
    },
    "transaction_count": {
      "type": "integer",
      "maximum": 50000.0,
      "minimum": 10.0,
      "title": "Transaction Count",
      "default": 500
    },
    "workload_type": {
      "type": "string",
      "pattern": "^(domestic|international|mixed)$",
      "title": "Workload Type",
      "default": "mixed"
    },
    "processing_mode": {
      "type": "string",
      "pattern": "^(sequential|concurrent)$",
      "title": "Processing Mode",
      "default": "concurrent"
    },
    "concurrency_limit": {
      "type": "integer",
      "maximum": 500.0,
      "minimum": 1.0,
      "title": "Concurrency Limit",
      "default": 50
    },
    "intl_percentage": {
      "type": "number",
      "maximum": 100.0,
      "minimum": 0.0,
      "title": "Intl Percentage",
      "default": 50.0
    },
    "random_seed": {
      "type": "integer",
      "title": "Random Seed",
      "default": 42
    },
    "fraud_config": {
      "anyOf": [
        {
          "additionalProperties": true,
          "type": "object"
        },
        {
          "type": "null"
        }
      ],
      "title": "Fraud Config"
    },
    "fx_config": {
      "anyOf": [
        {
          "additionalProperties": true,
          "type": "object"
        },
        {
          "type": "null"
        }
      ],
      "title": "Fx Config"
    },
    "notification_config": {
      "anyOf": [
        {
          "additionalProperties": true,
          "type": "object"
        },
        {
          "type": "null"
        }
      ],
      "title": "Notification Config"
    }
  },
  "type": "object",
  "title": "TestRunCreate"
}
```

### TestRunResponse

```json
{
  "properties": {
    "id": {
      "type": "string",
      "title": "Id"
    },
    "name": {
      "type": "string",
      "title": "Name"
    },
    "status": {
      "type": "string",
      "title": "Status"
    },
    "transaction_count": {
      "type": "integer",
      "title": "Transaction Count"
    },
    "workload_type": {
      "type": "string",
      "title": "Workload Type"
    },
    "processing_mode": {
      "type": "string",
      "title": "Processing Mode"
    },
    "concurrency_limit": {
      "type": "integer",
      "title": "Concurrency Limit"
    },
    "intl_percentage": {
      "type": "number",
      "title": "Intl Percentage"
    },
    "random_seed": {
      "type": "integer",
      "title": "Random Seed"
    },
    "created_at": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ],
      "title": "Created At"
    },
    "started_at": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ],
      "title": "Started At"
    },
    "completed_at": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time"
        },
        {
          "type": "null"
        }
      ],
      "title": "Completed At"
    },
    "progress": {
      "type": "number",
      "title": "Progress"
    },
    "processed_count": {
      "type": "integer",
      "title": "Processed Count"
    },
    "metrics": {
      "anyOf": [
        {
          "additionalProperties": true,
          "type": "object"
        },
        {
          "type": "null"
        }
      ],
      "title": "Metrics"
    },
    "bottlenecks": {
      "anyOf": [
        {
          "items": {
            "additionalProperties": true,
            "type": "object"
          },
          "type": "array"
        },
        {
          "type": "null"
        }
      ],
      "title": "Bottlenecks"
    },
    "error_details": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "title": "Error Details"
    }
  },
  "type": "object",
  "required": [
    "id",
    "name",
    "status",
    "transaction_count",
    "workload_type",
    "processing_mode",
    "concurrency_limit",
    "intl_percentage",
    "random_seed",
    "created_at",
    "started_at",
    "completed_at",
    "progress",
    "processed_count"
  ],
  "title": "TestRunResponse"
}
```

### ValidationError

```json
{
  "properties": {
    "loc": {
      "items": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "integer"
          }
        ]
      },
      "type": "array",
      "title": "Location"
    },
    "msg": {
      "type": "string",
      "title": "Message"
    },
    "type": {
      "type": "string",
      "title": "Error Type"
    },
    "input": {
      "title": "Input"
    },
    "ctx": {
      "type": "object",
      "title": "Context"
    }
  },
  "type": "object",
  "required": [
    "loc",
    "msg",
    "type"
  ],
  "title": "ValidationError"
}
```

## Nested service configuration recognized by the runner

These keys are read from dictionaries, not declared/validated nested Pydantic models. Omitted values fall back to settings.

| Object | Recognized keys | Defaults |
|---|---|---|
| fraud_config | amount_threshold, velocity_window_seconds, velocity_max_txns, probabilistic_rate, base_latency_ms | 250000, 60, 5, 0.015, 6 ms |
| fx_config | use_cache, base_latency_ms | true, 8 ms |
| notification_config | num_workers, base_latency_ms | 4, 12 ms |

Default settings may be overridden in environment/process. DEFAULT_MAX_CONCURRENCY appears in GET config, but omitted POST concurrency_limit uses the schema literal 50. BenchmarkSuiteRequest and ExchangeRateUpdate models exist but have no corresponding suite/patch endpoint. No cancellation, deletion, external payment submission or report/PDF API exists.
