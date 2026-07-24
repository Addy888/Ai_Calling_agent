# Metrics System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI Training Runtime                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Training Loop│  │   Model      │  │  Optimizer   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Metrics Collection Layer                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MetricsCollector                             │   │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │  Training  │ │   System   │ │  Model   │ │  Perf  │ │   │
│  │  │  Metrics   │ │  Metrics   │ │ Metrics  │ │ Metrics│ │   │
│  │  └────────────┘ └────────────┘ └──────────┘ └────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Metrics Management Layer                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MetricsManager                               │   │
│  │         (Orchestrates Everything)                         │   │
│  │  • Collects  • Validates  • Aggregates                   │   │
│  │  • Stores    • Publishes  • Exports                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐      ┌──────────────────┐      ┌────────────────┐
│   Storage     │      │   Aggregation    │      │   Publishing   │
│               │      │                  │      │                │
│ ┌───────────┐ │      │ ┌──────────────┐│      │ ┌────────────┐ │
│ │In-Memory  │ │      │ │ Statistics   ││      │ │TensorBoard │ │
│ │ Buffers   │ │      │ │ • Mean       ││      │ │            │ │
│ │           │ │      │ │ • Min/Max    ││      │ │            │ │
│ │ (Circular)│ │      │ │ • Std Dev    ││      │ │            │ │
│ └───────────┘ │      │ │ • Percentile ││      │ └────────────┘ │
│               │      │ └──────────────┘│      │                │
│ ┌───────────┐ │      │                  │      │ ┌────────────┐ │
│ │   Disk    │ │      │ ┌──────────────┐│      │ │Event Bus   │ │
│ │Persistence│ │      │ │   Windows    ││      │ │            │ │
│ │  (JSONL)  │ │      │ │ • Rolling    ││      │ │            │ │
│ └───────────┘ │      │ │ • Moving Avg ││      │ └────────────┘ │
│               │      │ └──────────────┘│      │                │
│ ┌───────────┐ │      └──────────────────┘      │ ┌────────────┐ │
│ │  Export   │ │                                │ │External    │ │
│ │ JSON/CSV  │ │                                │ │Telemetry   │ │
│ └───────────┘ │                                │ └────────────┘ │
└───────────────┘                                └────────────────┘
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐      ┌──────────────────┐      ┌────────────────┐
│ Alert Engine  │      │Training Monitor  │      │Structured      │
│               │      │                  │      │Logger          │
│ ┌───────────┐ │      │ ┌──────────────┐│      │                │
│ │Anomaly    │ │      │ │Health Checks ││      │ ┌────────────┐ │
│ │Detection  │ │      │ │              ││      │ │JSON Logs   │ │
│ │           │ │      │ │• GPU         ││      │ │            │ │
│ │• NaN Loss │ │      │ │• Memory      ││      │ │• Levels    │ │
│ │• Explosion│ │      │ │• Disk        ││      │ │• Categories│ │
│ │• OOM      │ │      │ │              ││      │ │• Rotation  │ │
│ └───────────┘ │      │ └──────────────┘│      │ └────────────┘ │
│               │      │                  │      │                │
│ ┌───────────┐ │      │ ┌──────────────┐│      │ ┌────────────┐ │
│ │Alerts     │ │      │ │Stall Detect  ││      │ │Query API   │ │
│ │           │ │      │ │              ││      │ │            │ │
│ │• Severity │ │      │ │              ││      │ │• Filter    │ │
│ │• Ack Flow │ │      │ │              ││      │ │• Search    │ │
│ └───────────┘ │      │ └──────────────┘│      │ └────────────┘ │
└───────────────┘      └──────────────────┘      └────────────────┘
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         REST API Layer                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Metrics   │  │ Dashboard  │  │  Logging   │  │ Monitor  │  │
│  │    API     │  │    API     │  │    API     │  │   API    │  │
│  │            │  │            │  │            │  │          │  │
│  │ /live      │  │ /live      │  │ /logs      │  │ /status  │  │
│  │ /history   │  │ /timeline  │  │ /errors    │  │ /alerts  │  │
│  │ /system    │  │ /history   │  │ /runtime   │  │ /health  │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Consumers                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Frontend  │  │  Grafana   │  │  Scripts   │  │  Other   │  │
│  │ Dashboard  │  │            │  │            │  │ Services │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Metric Collection Flow

```
Training Step
     │
     ▼
MetricsCollector.collect_training_metrics()
     │
     ├─► Calculate: step_time, epoch_time
     ├─► Create: TrainingMetrics object
     └─► Return: metrics
     │
     ▼
MetricsManager.record_training_metrics()
     │
     ├─► Store in MetricsStorage
     ├─► Update MetricsAggregator
     ├─► Write to TensorBoard
     ├─► Emit Event (metrics_updated)
     └─► Return: metrics
```

### 2. Alert Generation Flow

```
TrainingMetrics
     │
     ▼
AlertEngine.check_training_metrics()
     │
     ├─► Check for NaN loss ─────► Generate CRITICAL alert
     ├─► Check loss history ─────► Detect explosion
     └─► Build alert history
     │
     ▼
Alert Generated
     │
     ├─► Store in AlertEngine
     ├─► Emit Event (alert_generated)
     └─► Log to StructuredLogger
```

### 3. Monitoring Loop Flow

```
Start Monitoring
     │
     ▼
Async Monitor Loop (every N seconds)
     │
     ├─► Collect system metrics
     ├─► Check GPU health
     ├─► Check memory usage
     ├─► Check training progress
     │   └─► Detect stalls
     ├─► Check training speed
     │   └─► Detect slowdowns
     └─► Run alert checks
     │
     ▼
Generate Events
     │
     ├─► gpu_warning
     ├─► memory_warning
     ├─► training_stalled
     └─► alert_generated
```

### 4. API Request Flow

```
HTTP Request: GET /metrics/live?job_id=X
     │
     ▼
API Handler (with JWT auth)
     │
     ▼
MetricsManager.get_live_metrics(job_id)
     │
     ├─► Get latest training metrics
     ├─► Get latest system metrics
     └─► Build response object
     │
     ▼
JSON Response
```

---

## Component Interactions

### MetricsManager Orchestration

```
┌────────────────────────────────────────────┐
│         MetricsManager                     │
│                                            │
│  record_training_metrics()                 │
│         │                                  │
│         ├──► Collector.collect()           │
│         ├──► Storage.store()               │
│         ├──► Aggregator.add_value()        │
│         ├──► TensorBoard.write()           │
│         └──► EventBus.emit()               │
│                                            │
│  get_live_metrics()                        │
│         │                                  │
│         ├──► Storage.get_latest()          │
│         └──► Build response                │
│                                            │
│  get_aggregated_metrics()                  │
│         │                                  │
│         ├──► Aggregator.aggregate()        │
│         └──► Return stats                  │
└────────────────────────────────────────────┘
```

### Storage Architecture

```
┌─────────────────────────────────────┐
│     MetricsStorage                  │
│                                     │
│  In-Memory Storage                  │
│  ┌───────────────────────────────┐  │
│  │ job_id → deque[TrainingMetrics]│  │
│  │ job_id → deque[SystemMetrics]  │  │
│  │ job_id → list[ModelMetrics]    │  │
│  │ job_id → deque[PerfMetrics]    │  │
│  └───────────────────────────────┘  │
│          maxlen=10000                │
│                                     │
│  Disk Persistence                   │
│  ┌───────────────────────────────┐  │
│  │ ./metrics_storage/             │  │
│  │   ├─ job_123/                  │  │
│  │   │   ├─ metrics_20260723.jsonl│  │
│  │   │   └─ metrics_20260724.jsonl│  │
│  │   └─ job_456/                  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Aggregation Windows

```
┌────────────────────────────────────┐
│    MetricsAggregator               │
│                                    │
│  Rolling Windows                   │
│  ┌──────────────────────────────┐  │
│  │ metric_name → deque[values]  │  │
│  │                              │  │
│  │ "training_loss" → [         │  │
│  │   1.0, 0.95, 0.90, ...      │  │
│  │ ] (maxlen=100)              │  │
│  └──────────────────────────────┘  │
│                                    │
│  Compute Stats                     │
│  ┌──────────────────────────────┐  │
│  │ • mean  = sum / count        │  │
│  │ • min   = min(values)        │  │
│  │ • max   = max(values)        │  │
│  │ • std   = stdev(values)      │  │
│  │ • p50   = median(values)     │  │
│  │ • p95   = percentile(95)     │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## Async Architecture

### Training Monitor

```
┌─────────────────────────────────────────┐
│   TrainingMonitor                       │
│                                         │
│   start_monitoring(job_id)              │
│         │                               │
│         ▼                               │
│   Create asyncio.Task                   │
│         │                               │
│         ▼                               │
│   Monitoring Loop                       │
│   ┌───────────────────────────────────┐ │
│   │  while monitoring:                │ │
│   │    perform_checks()               │ │
│   │    await asyncio.sleep(interval)  │ │
│   └───────────────────────────────────┘ │
│         │                               │
│         ▼                               │
│   Emit Events                           │
│   • gpu_warning                         │
│   • memory_warning                      │
│   • training_stalled                    │
│                                         │
│   stop_monitoring(job_id)               │
│         │                               │
│         ▼                               │
│   Cancel Task                           │
└─────────────────────────────────────────┘
```

---

## Security Architecture

```
┌──────────────────────────────────────┐
│      API Request                     │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   FastAPI Middleware                 │
│   • CORS                             │
│   • Rate Limiting                    │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   JWT Authentication                 │
│   verify_token(token)                │
│     │                                │
│     ├─ Decode JWT                    │
│     ├─ Verify signature              │
│     ├─ Check expiration              │
│     └─ Extract user info             │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   API Handler                        │
│   • Execute business logic           │
│   • Access metrics data              │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   Response                           │
└──────────────────────────────────────┘
```

---

## Telemetry Extension

```
┌──────────────────────────────────────┐
│  BaseTelemetryInterface              │
│  (Abstract Base Class)               │
│                                      │
│  • initialize()                      │
│  • start_run()                       │
│  • log_metrics()                     │
│  • end_run()                         │
└───────────────┬──────────────────────┘
                │
                ├─────────────┬──────────────┬───────────┐
                │             │              │           │
                ▼             ▼              ▼           ▼
     ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐
     │ TensorBoard  │  │ MLflow   │  │ WandB    │  │Promethe│
     │ (Complete)   │  │ (Ready)  │  │ (Ready)  │  │us(Ready│
     └──────────────┘  └──────────┘  └──────────┘  └────────┘
```

---

## Event Flow

```
┌────────────────────────────────────────┐
│        Event Bus Integration           │
│                                        │
│  MetricsManager ──► metrics_updated    │
│  AlertEngine ─────► alert_generated    │
│  Monitor ─────────► training_stalled   │
│  Monitor ─────────► gpu_warning        │
│  Monitor ─────────► memory_warning     │
│  Logger ──────────► logger_started     │
│  Logger ──────────► logger_stopped     │
│                                        │
│           │                            │
│           ▼                            │
│  ┌─────────────────────────┐          │
│  │  Event Bus              │          │
│  │  • emit()               │          │
│  │  • subscribe()          │          │
│  └─────────────────────────┘          │
│           │                            │
│           ▼                            │
│  ┌─────────────────────────┐          │
│  │  Subscribers            │          │
│  │  • WebSocket clients    │          │
│  │  • Alert handlers       │          │
│  │  • Notification services│          │
│  └─────────────────────────┘          │
└────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│              Production Environment              │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Training Engine (FastAPI)                 │ │
│  │  ┌──────────────────────────────────────┐  │ │
│  │  │  Metrics System                      │  │ │
│  │  │  • Collection                        │  │ │
│  │  │  • Storage                           │  │ │
│  │  │  • Aggregation                       │  │ │
│  │  │  • Monitoring                        │  │ │
│  │  └──────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────┐  │ │
│  │  │  REST APIs                           │  │ │
│  │  │  /metrics  /dashboard  /logs         │  │ │
│  │  └──────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────┘ │
│                      │                          │
│                      │                          │
│  ┌───────────────────┼────────────────────────┐ │
│  │                   │                        │ │
│  ▼                   ▼                        ▼ │
│  TensorBoard     Disk Storage            Event Bus│
│  (localhost:6006) (Persistent)          (Internal)│
│                                                  │
└──────────────────────────────────────────────────┘
                      │
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌──────────────┐            ┌──────────────┐
│   Frontend   │            │   External   │
│  Dashboard   │            │  Monitoring  │
│  (React/Vue) │            │  (Grafana)   │
└──────────────┘            └──────────────┘
```

---

## Scaling Strategy

### Horizontal Scaling

```
┌────────────────────────────────────────┐
│          Load Balancer                 │
└────────┬───────────┬───────────┬───────┘
         │           │           │
         ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │Engine-1 │ │Engine-2 │ │Engine-3 │
   │         │ │         │ │         │
   │Metrics  │ │Metrics  │ │Metrics  │
   │System   │ │System   │ │System   │
   └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │
        └───────────┴───────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Shared Storage     │
         │  (NFS/S3)           │
         └─────────────────────┘
```

---

## Summary

This architecture provides:

✅ **Separation of Concerns** - Clear boundaries between components  
✅ **Scalability** - Horizontal and vertical scaling support  
✅ **Extensibility** - Plugin architecture for telemetry  
✅ **Performance** - Async operations, efficient storage  
✅ **Reliability** - Error handling, graceful degradation  
✅ **Security** - Authentication, authorization ready  
✅ **Observability** - Complete visibility into training  

---

**Phase 4.4.4.5.6 Complete** ✅
