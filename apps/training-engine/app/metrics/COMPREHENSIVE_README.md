# Enterprise Metrics, Logging & Monitoring Engine

## Phase 4.4.4.5.6 - Complete Implementation

A production-ready enterprise metrics, logging, and monitoring system for AI training workloads.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Features](#features)
5. [Installation](#installation)
6. [Quick Start](#quick-start)
7. [API Reference](#api-reference)
8. [Configuration](#configuration)
9. [Telemetry Integrations](#telemetry-integrations)
10. [Testing](#testing)
11. [Production Deployment](#production-deployment)

---

## Overview

The Enterprise Metrics, Logging & Monitoring Engine provides comprehensive observability for AI training workflows, supporting:

- **Real-time metric collection** - Training, system, model, and performance metrics
- **Structured logging** - JSON-based logging with multiple levels and categories
- **Health monitoring** - Continuous monitoring with anomaly detection
- **Alert generation** - Automatic alerts for critical issues
- **TensorBoard integration** - Visualize training metrics in real-time
- **REST APIs** - Complete API for dashboards and integrations
- **Multi-backend support** - Extensible telemetry interfaces for MLflow, W&B, Prometheus

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Training Runtime                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              MetricsCollector                                │
│  - Training Metrics    - Performance Metrics                 │
│  - System Metrics      - Model Metrics                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              MetricsManager                                  │
│  Orchestrates: Collection → Validation → Aggregation        │
└────────┬─────────────┬──────────────┬──────────────────────┘
         │             │              │
         ▼             ▼              ▼
┌────────────┐  ┌────────────┐  ┌──────────────┐
│  Storage   │  │ Aggregator │  │ TensorBoard  │
│  - Memory  │  │ - Stats    │  │  - Scalars   │
│  - Disk    │  │ - Windows  │  │  - Graphs    │
│  - Export  │  │ - Trends   │  │              │
└────────────┘  └────────────┘  └──────────────┘
         │             │              │
         └─────────────┴──────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │       Alert Engine          │
         │  - Anomaly Detection        │
         │  - Threshold Monitoring     │
         │  - Alert Generation         │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │    Training Monitor         │
         │  - Health Checks            │
         │  - Stall Detection          │
         │  - Slowdown Detection       │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   Structured Logger         │
         │  - JSON Logs                │
         │  - File Rotation            │
         │  - Category Filtering       │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │       REST APIs             │
         │  /metrics  /logs  /monitor  │
         │  /dashboard                 │
         └─────────────────────────────┘
```

---

## Core Components

### 1. MetricsManager

Central orchestrator for the entire metrics system.

**Responsibilities:**
- Coordinate metric collection
- Manage storage and aggregation
- Publish metrics to subscribers
- Track active training jobs

**Usage:**
```python
from app.metrics import metrics_manager

# Record training metrics
metrics_manager.record_training_metrics(
    job_id="job_123",
    global_step=100,
    training_loss=0.45,
    learning_rate=1e-4,
)

# Get live metrics
live = metrics_manager.get_live_metrics("job_123")
```

### 2. MetricsCollector

Collects metrics from various sources.

**Metric Types:**
- **Training Metrics**: Loss, LR, gradients, tokens/samples
- **System Metrics**: CPU, RAM, GPU, disk, network
- **Model Metrics**: Parameters, size, architecture
- **Performance Metrics**: Throughput, ETA, timing

**Usage:**
```python
from app.metrics import metrics_collector

# Collect system metrics
system_metrics = metrics_collector.collect_system_metrics("job_123")

# Collect model metrics
model_metrics = metrics_collector.collect_model_metrics(
    job_id="job_123",
    model=model,
)
```

### 3. MetricsStorage

Stores metrics in memory with optional disk persistence.

**Features:**
- In-memory circular buffers
- Disk persistence (JSONL format)
- Export to JSON/CSV
- Query by time range
- Separate storage per metric type

**Usage:**
```python
from app.metrics import metrics_storage

# Get training metrics history
history = metrics_storage.get_training_metrics(
    job_id="job_123",
    limit=1000,
)

# Export to file
metrics_storage.export_to_json("job_123", "metrics.json")
```

### 4. MetricsAggregator

Computes statistical aggregations over metric windows.

**Aggregations:**
- Mean, Min, Max, Std Dev
- Moving Average
- Median
- Percentiles (25th, 50th, 75th, 95th)
- Rolling Windows

**Usage:**
```python
from app.metrics import metrics_aggregator

# Add values
for loss in losses:
    metrics_aggregator.add_value("training_loss", loss)

# Get aggregated stats
agg = metrics_aggregator.aggregate("training_loss")
print(f"Mean: {agg.mean}, Std: {agg.std}")
```

### 5. AlertEngine

Generates alerts for anomalies and issues.

**Alert Types:**
- Loss Explosion
- NaN Loss
- OOM Errors
- GPU Failure
- Checkpoint Failure
- Training Stall
- Low Disk Space
- High Memory Usage

**Usage:**
```python
from app.metrics import alert_engine

# Check training metrics for issues
alerts = alert_engine.check_training_metrics(job_id, metrics)

# Get all alerts
all_alerts = alert_engine.get_alerts(job_id)

# Acknowledge alert
alert_engine.acknowledge_alert(job_id, alert_id)
```

### 6. TrainingMonitor

Continuous health monitoring with async monitoring loop.

**Monitoring:**
- GPU health
- Memory usage
- Training progress
- Stall detection
- Slowdown detection

**Usage:**
```python
from app.metrics import training_monitor
import asyncio

# Start monitoring
asyncio.create_task(training_monitor.start_monitoring("job_123"))

# Stop monitoring
asyncio.create_task(training_monitor.stop_monitoring("job_123"))

# Check status
status = training_monitor.get_status("job_123")
```

### 7. StructuredLogger

JSON-based structured logging with categories and levels.

**Log Levels:**
- TRACE
- DEBUG
- INFO
- WARNING
- ERROR
- CRITICAL

**Categories:**
- training
- checkpoint
- performance
- runtime
- error

**Usage:**
```python
from app.metrics.structured_logger import structured_logger

# Log training event
structured_logger.log_training_event(
    job_id="job_123",
    event="Epoch completed",
    metadata={"epoch": 5, "loss": 0.45}
)

# Log error
structured_logger.log_exception(
    job_id="job_123",
    exception=exc,
    context="Failed to save checkpoint"
)

# Query logs
logs = structured_logger.get_logs(
    job_id="job_123",
    level=LogLevel.ERROR,
    limit=100,
)
```

### 8. TensorBoardWriter

TensorBoard integration for visualization.

**Writes:**
- Training scalars (loss, LR)
- System metrics (GPU, CPU, RAM)
- Model metrics (parameters, size)
- Performance metrics (throughput, ETA)
- Custom scalars

**Usage:**
```python
from app.metrics import tensorboard_writer

# Write training metrics
tensorboard_writer.write_training_metrics(job_id, metrics)

# Write custom scalar
tensorboard_writer.write_scalar(
    job_id, "custom/metric", value, step
)

# Flush
tensorboard_writer.flush(job_id)
```

---

## Features

### Real-Time Metric Collection

```python
# Continuous metrics collection during training
for step, batch in enumerate(dataloader):
    # Training step...
    
    # Record metrics
    metrics_manager.record_training_metrics(
        job_id=job_id,
        global_step=step,
        training_loss=loss.item(),
        learning_rate=scheduler.get_last_lr()[0],
        gradient_norm=grad_norm,
    )
    
    # Periodically record system metrics
    if step % 10 == 0:
        metrics_manager.record_system_metrics(job_id)
```

### Aggregation & Statistics

```python
# Get aggregated metrics
aggregated = metrics_manager.get_aggregated_metrics(
    job_id=job_id,
    metric_names=["training_loss", "gpu_usage"],
)

# Access stats
loss_stats = aggregated["training_loss"]
print(f"Mean Loss: {loss_stats.mean:.4f}")
print(f"Min Loss: {loss_stats.min:.4f}")
print(f"Max Loss: {loss_stats.max:.4f}")
print(f"Std Dev: {loss_stats.std:.4f}")
```

### Alert Monitoring

```python
# Automatic alert generation
alerts = alert_engine.get_alerts(
    job_id=job_id,
    severity=AlertSeverity.CRITICAL,
    acknowledged=False,
)

for alert in alerts:
    print(f"Alert: {alert.message}")
    
    # Handle critical alerts
    if alert.alert_type == AlertType.NAN_LOSS:
        # Stop training
        training_monitor.stop_monitoring(job_id)
```

### Export & Persistence

```python
# Export to JSON
metrics_manager.export_metrics(
    job_id=job_id,
    output_path="training_metrics.json",
    format="json",
)

# Export to CSV
metrics_manager.export_metrics(
    job_id=job_id,
    output_path="training_metrics.csv",
    format="csv",
)
```

---

## Installation

### Requirements

```txt
torch>=2.0.0
transformers>=4.30.0
fastapi>=0.100.0
pydantic>=2.0.0
psutil>=5.9.0
tensorboard>=2.13.0  # Optional
pynvml>=11.5.0       # Optional (for GPU metrics)
```

### Install

```bash
cd apps/training-engine
pip install -r requirements.txt
```

---

## Quick Start

### Basic Usage

```python
from app.metrics import metrics_manager
from app.metrics.factory import create_dev_metrics_stack

# Create metrics stack
stack = create_dev_metrics_stack()

# Start job
job_id = "my_training_job"
metrics_manager.start_job(job_id)

# Training loop
for step in range(num_steps):
    # ... training code ...
    
    # Record metrics
    metrics_manager.record_training_metrics(
        job_id=job_id,
        global_step=step,
        training_loss=loss.item(),
        learning_rate=lr,
    )

# Stop job
metrics_manager.stop_job(job_id)
```

### With Training Monitor

```python
import asyncio
from app.metrics import training_monitor, metrics_manager

async def train_with_monitoring():
    job_id = "monitored_job"
    
    # Start monitoring
    await training_monitor.start_monitoring(job_id)
    
    # Training loop
    for step in range(num_steps):
        # Record metrics
        metrics_manager.record_training_metrics(
            job_id=job_id,
            global_step=step,
            training_loss=loss.item(),
            learning_rate=lr,
        )
    
    # Stop monitoring
    await training_monitor.stop_monitoring(job_id)

# Run
asyncio.run(train_with_monitoring())
```

### With TensorBoard

```python
from app.metrics import tensorboard_writer

# Enable TensorBoard
tensorboard_writer.config.enabled = True

# Write metrics
tensorboard_writer.write_training_metrics(job_id, training_metrics)
tensorboard_writer.write_system_metrics(job_id, system_metrics, step)

# View in TensorBoard
# tensorboard --logdir=./tensorboard_logs
```

---

## API Reference

### REST Endpoints

#### Metrics API

```
GET  /metrics/live?job_id={job_id}
GET  /metrics/history?job_id={job_id}&limit=100
GET  /metrics/system?job_id={job_id}
GET  /metrics/model?job_id={job_id}
GET  /metrics/aggregated?job_id={job_id}
GET  /metrics/stats
POST /metrics/export?job_id={job_id}&format=json
```

#### Dashboard API

```
GET /dashboard/live?job_id={job_id}
GET /dashboard/timeline/training?job_id={job_id}
GET /dashboard/timeline/checkpoints?job_id={job_id}
GET /dashboard/history?job_id={job_id}
GET /dashboard/live/loss?job_id={job_id}
GET /dashboard/live/lr?job_id={job_id}
GET /dashboard/live/eta?job_id={job_id}
GET /dashboard/live/gpu?job_id={job_id}
GET /dashboard/live/memory?job_id={job_id}
```

#### Logging API

```
GET    /logs?job_id={job_id}&level=info&limit=100
GET    /logs/errors?job_id={job_id}
GET    /logs/runtime?job_id={job_id}
GET    /logs/training?job_id={job_id}
GET    /logs/checkpoint?job_id={job_id}
GET    /logs/stats
DELETE /logs/{job_id}
```

#### Monitor API

```
GET  /monitor/status?job_id={job_id}
POST /monitor/start
POST /monitor/stop
GET  /monitor/alerts?job_id={job_id}
POST /monitor/alerts/{alert_id}/acknowledge
GET  /monitor/health?job_id={job_id}
GET  /monitor/alerts/summary?job_id={job_id}
```

---

## Configuration

### Using Factory Presets

```python
from app.metrics.factory import MetricsFactory

# Development configuration
dev_config = MetricsFactory.create_development_config()
stack = MetricsFactory.create_complete_stack(dev_config)

# Production configuration
prod_config = MetricsFactory.create_production_config()
stack = MetricsFactory.create_complete_stack(prod_config)

# Testing configuration
test_config = MetricsFactory.create_testing_config()
stack = MetricsFactory.create_complete_stack(test_config)
```

### Custom Configuration

```python
from app.metrics.factory import MetricsConfig

config = MetricsConfig(
    # Storage
    storage_max_size=50000,
    enable_disk_persistence=True,
    storage_dir="./data/metrics",
    
    # Aggregation
    aggregation_window_size=200,
    
    # TensorBoard
    tensorboard_log_dir="./logs/tensorboard",
    tensorboard_flush_secs=60,
    
    # Alerts
    alert_loss_explosion_threshold=100.0,
    alert_memory_threshold_percent=95.0,
    
    # Monitor
    monitor_check_interval_seconds=60,
    monitor_stall_threshold_seconds=600,
    
    # Logging
    log_level=LogLevel.INFO,
    log_console_output=True,
    log_file_output=True,
)
```

---

## Telemetry Integrations

### Base Interface

All telemetry systems implement `BaseTelemetryInterface`:

```python
class BaseTelemetryInterface(ABC):
    @abstractmethod
    def initialize(self, config: Dict[str, Any]) -> None: ...
    
    @abstractmethod
    def start_run(self, job_id: str, metadata: Optional[Dict] = None) -> None: ...
    
    @abstractmethod
    def log_training_metrics(self, job_id: str, metrics: TrainingMetrics, step: int) -> None: ...
    
    @abstractmethod
    def log_system_metrics(self, job_id: str, metrics: SystemMetrics, step: int) -> None: ...
    
    # ... more methods
```

### Implemented Interfaces

1. **TensorBoard** ✅ - Fully implemented
2. **MLflow** 🔧 - Interface ready, awaiting implementation
3. **Weights & Biases** 🔧 - Interface ready, awaiting implementation
4. **Prometheus** 🔧 - Interface ready, awaiting implementation
5. **Grafana** 🔧 - Interface ready, awaiting implementation
6. **OpenTelemetry** 🔧 - Interface ready, awaiting implementation

### Extending with Custom Telemetry

```python
from app.metrics.telemetry.base import BaseTelemetryInterface

class CustomTelemetry(BaseTelemetryInterface):
    def initialize(self, config):
        # Initialize custom system
        pass
    
    def log_training_metrics(self, job_id, metrics, step):
        # Send to custom backend
        pass
    
    # Implement other methods...
```

---

## Testing

### Run All Tests

```bash
pytest tests/metrics/ -v
```

### Run Specific Test Suite

```bash
# Test metrics collector
pytest tests/metrics/test_metrics_collector.py -v

# Test metrics manager
pytest tests/metrics/test_metrics_manager.py -v

# Test aggregator
pytest tests/metrics/test_aggregator.py -v

# Test alert engine
pytest tests/metrics/test_alert_engine.py -v

# Test TensorBoard
pytest tests/metrics/test_tensorboard.py -v
```

### Coverage

```bash
pytest tests/metrics/ --cov=app.metrics --cov-report=html
```

---

## Production Deployment

### Security

```python
# JWT authentication on all endpoints
from app.middleware.auth import verify_token

@router.get("/metrics/live")
async def get_live_metrics(
    job_id: str,
    token: str = Depends(verify_token),  # ← JWT auth
):
    ...
```

### Performance Considerations

1. **Memory Management**
   - Configure appropriate `storage_max_size`
   - Enable disk persistence for long jobs
   - Regularly export and clear old metrics

2. **Disk Usage**
   - Monitor log directory size
   - Configure log rotation
   - Use compression for archived logs

3. **Network**
   - Rate limit API endpoints
   - Use pagination for large queries
   - Enable CORS appropriately

4. **Monitoring**
   - Set appropriate check intervals
   - Balance monitoring overhead vs. detection speed
   - Use async monitoring to avoid blocking

### High Availability

```python
# Multiple instances with shared storage
config = MetricsConfig(
    storage_dir="/shared/metrics",  # Shared volume
    enable_disk_persistence=True,
)
```

### Scaling

- Horizontal: Multiple training-engine instances
- Vertical: Increase memory for larger metric windows
- Distributed: Separate metrics service (future)

---

## Best Practices

### 1. Metric Collection Frequency

```python
# Collect training metrics every step
metrics_manager.record_training_metrics(...)

# Collect system metrics less frequently
if step % 10 == 0:
    metrics_manager.record_system_metrics(...)

# Collect model metrics once at start
if step == 0:
    metrics_manager.record_model_metrics(...)
```

### 2. Alert Handling

```python
# Check for critical alerts regularly
alerts = alert_engine.get_alerts(
    job_id=job_id,
    severity=AlertSeverity.CRITICAL,
    acknowledged=False,
)

if alerts:
    # Log and notify
    for alert in alerts:
        logger.critical(f"Critical alert: {alert.message}")
        send_notification(alert)
        
    # Acknowledge after handling
    for alert in alerts:
        alert_engine.acknowledge_alert(job_id, alert.alert_id)
```

### 3. Export Strategy

```python
# Export periodically during training
if step % 1000 == 0:
    metrics_manager.export_metrics(
        job_id=job_id,
        output_path=f"metrics_step_{step}.json",
        format="json",
    )

# Final export at end
metrics_manager.export_metrics(
    job_id=job_id,
    output_path="final_metrics.json",
    format="json",
)
```

### 4. Resource Cleanup

```python
# Stop monitoring
await training_monitor.stop_monitoring(job_id)

# Close TensorBoard
tensorboard_writer.close(job_id)

# Clear in-memory data if needed
metrics_storage.clear_job_metrics(job_id)
alert_engine.clear_job_alerts(job_id)
```

---

## Troubleshooting

### GPU Metrics Not Available

```python
# Check NVML initialization
from app.metrics import metrics_collector

if not metrics_collector._nvml_initialized:
    print("NVML not initialized. Install pynvml:")
    print("pip install pynvml")
```

### TensorBoard Not Working

```python
# Check if TensorBoard is available
from app.metrics.tensorboard_writer import TENSORBOARD_AVAILABLE

if not TENSORBOARD_AVAILABLE:
    print("TensorBoard not available. Install:")
    print("pip install tensorboard")
```

### High Memory Usage

```python
# Reduce storage window size
config = MetricsConfig(
    storage_max_size=1000,  # Reduce from default 10000
    aggregation_window_size=50,  # Reduce from default 100
)
```

### Log Files Growing Too Large

```python
# Configure log rotation
config = MetricsConfig(
    log_max_file_size_mb=100,  # Max size before rotation
    log_max_files=10,  # Max number of rotated files
)
```

---

## License

Enterprise AI Calling Agent - Proprietary

---

## Support

For issues, questions, or feature requests, contact the development team.

---

**Phase 4.4.4.5.6 Complete** ✅

Enterprise Metrics, Logging & Monitoring Engine fully implemented and production-ready.
