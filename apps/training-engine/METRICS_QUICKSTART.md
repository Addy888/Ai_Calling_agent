# Metrics System - Quick Start Guide

Get started with the Enterprise Metrics, Logging & Monitoring Engine in 5 minutes.

---

## Installation

```bash
cd apps/training-engine
pip install -r requirements.txt
```

Optional dependencies:
```bash
pip install tensorboard  # For TensorBoard visualization
pip install pynvml      # For GPU metrics
```

---

## Basic Usage

### 1. Simple Metric Collection

```python
from app.metrics import metrics_manager

# Start tracking a job
job_id = "my_training_job"
metrics_manager.start_job(job_id)

# Record training metrics
metrics_manager.record_training_metrics(
    job_id=job_id,
    global_step=100,
    training_loss=0.45,
    learning_rate=1e-4,
)

# Record system metrics
metrics_manager.record_system_metrics(job_id)

# Get live metrics
live = metrics_manager.get_live_metrics(job_id)
print(f"Current loss: {live['training_loss']}")

# Stop tracking
metrics_manager.stop_job(job_id)
```

### 2. Training Loop Integration

```python
from app.metrics import metrics_manager

job_id = "training_run_1"
metrics_manager.start_job(job_id)

for epoch in range(num_epochs):
    for step, batch in enumerate(train_loader):
        # Your training code
        loss = train_step(batch)
        
        # Record metrics every step
        metrics_manager.record_training_metrics(
            job_id=job_id,
            global_step=global_step,
            epoch=epoch,
            training_loss=loss.item(),
            learning_rate=scheduler.get_last_lr()[0],
        )
        
        # System metrics every 10 steps
        if step % 10 == 0:
            metrics_manager.record_system_metrics(job_id)
        
        global_step += 1

metrics_manager.stop_job(job_id)
```

### 3. With TensorBoard

```python
from app.metrics import metrics_manager, tensorboard_writer

# Enable TensorBoard
tensorboard_writer.config.enabled = True

job_id = "training_with_tb"
metrics_manager.start_job(job_id)

for step in range(num_steps):
    # Training...
    
    # Metrics automatically go to TensorBoard
    metrics = metrics_manager.record_training_metrics(
        job_id=job_id,
        global_step=step,
        training_loss=loss.item(),
        learning_rate=lr,
    )
    
    # Also write to TensorBoard
    tensorboard_writer.write_training_metrics(job_id, metrics)

# View in browser
# tensorboard --logdir=./tensorboard_logs
```

### 4. With Health Monitoring

```python
import asyncio
from app.metrics import metrics_manager, training_monitor

async def train_with_monitoring():
    job_id = "monitored_training"
    
    # Start monitoring
    await training_monitor.start_monitoring(job_id)
    metrics_manager.start_job(job_id)
    
    # Training loop
    for step in range(num_steps):
        metrics_manager.record_training_metrics(
            job_id=job_id,
            global_step=step,
            training_loss=loss.item(),
            learning_rate=lr,
        )
    
    # Stop
    await training_monitor.stop_monitoring(job_id)
    metrics_manager.stop_job(job_id)

asyncio.run(train_with_monitoring())
```

### 5. With Alert Monitoring

```python
from app.metrics import metrics_manager, alert_engine
from app.metrics.schemas import AlertSeverity

job_id = "training_with_alerts"
metrics_manager.start_job(job_id)

for step in range(num_steps):
    # Record metrics
    metrics_manager.record_training_metrics(
        job_id=job_id,
        global_step=step,
        training_loss=loss.item(),
        learning_rate=lr,
    )
    
    # Check for critical alerts every 100 steps
    if step % 100 == 0:
        alerts = alert_engine.get_alerts(
            job_id=job_id,
            severity=AlertSeverity.CRITICAL,
            acknowledged=False,
        )
        
        if alerts:
            print(f"⚠️  {len(alerts)} critical alerts!")
            for alert in alerts:
                print(f"   - {alert.message}")
                # Handle the alert...
                alert_engine.acknowledge_alert(job_id, alert.alert_id)

metrics_manager.stop_job(job_id)
```

### 6. Export Metrics

```python
from app.metrics import metrics_manager

job_id = "training_to_export"

# ... training ...

# Export to JSON
metrics_manager.export_metrics(
    job_id=job_id,
    output_path="metrics.json",
    format="json",
)

# Export to CSV
metrics_manager.export_metrics(
    job_id=job_id,
    output_path="metrics.csv",
    format="csv",
)
```

### 7. Using Factory Presets

```python
from app.metrics.factory import create_dev_metrics_stack

# Create complete stack with dev config
stack = create_dev_metrics_stack()

manager = stack["manager"]
tensorboard = stack["tensorboard"]
alert_engine = stack["alert_engine"]
monitor = stack["monitor"]
logger = stack["logger"]

# Use components
manager.start_job("dev_job")
# ...
```

### 8. Query Aggregated Statistics

```python
from app.metrics import metrics_manager

# Record some metrics
for i in range(100):
    metrics_manager.record_training_metrics(
        job_id="stats_job",
        global_step=i,
        training_loss=1.0 - (i * 0.005),
        learning_rate=1e-4,
    )

# Get aggregated stats
agg = metrics_manager.get_aggregated_metrics("stats_job")

loss_stats = agg["training_loss"]
print(f"Mean Loss: {loss_stats.mean:.4f}")
print(f"Min Loss: {loss_stats.min:.4f}")
print(f"Max Loss: {loss_stats.max:.4f}")
print(f"Std Dev: {loss_stats.std:.4f}")
```

### 9. Structured Logging

```python
from app.metrics.structured_logger import structured_logger

job_id = "logging_job"

# Log training events
structured_logger.log_training_event(
    job_id=job_id,
    event="Training started",
    metadata={"num_epochs": 10, "batch_size": 32},
)

# Log checkpoint
structured_logger.log_checkpoint_event(
    job_id=job_id,
    event="Checkpoint saved",
    checkpoint_path="/path/to/checkpoint.pt",
)

# Log errors
try:
    # some code
    pass
except Exception as e:
    structured_logger.log_exception(
        job_id=job_id,
        exception=e,
        context="Failed during training step",
    )

# Query logs
logs = structured_logger.get_logs(job_id, limit=50)
for log in logs:
    print(f"[{log.timestamp}] {log.level}: {log.message}")
```

### 10. REST API Access

```python
import requests

base_url = "http://localhost:8000"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

# Get live metrics
response = requests.get(
    f"{base_url}/metrics/live",
    params={"job_id": "my_job"},
    headers=headers,
)
live_metrics = response.json()

# Get training history
response = requests.get(
    f"{base_url}/metrics/history",
    params={"job_id": "my_job", "limit": 100},
    headers=headers,
)
history = response.json()

# Get alerts
response = requests.get(
    f"{base_url}/monitor/alerts",
    params={"job_id": "my_job"},
    headers=headers,
)
alerts = response.json()
```

---

## Common Patterns

### Pattern 1: Minimal Setup

```python
from app.metrics import metrics_manager

job_id = "simple_job"
metrics_manager.start_job(job_id)

for step in range(1000):
    # Training...
    metrics_manager.record_training_metrics(
        job_id=job_id,
        global_step=step,
        training_loss=loss.item(),
        learning_rate=lr,
    )

metrics_manager.stop_job(job_id)
```

### Pattern 2: Full Observability

```python
import asyncio
from app.metrics import (
    metrics_manager,
    training_monitor,
    tensorboard_writer,
    alert_engine,
)
from app.metrics.schemas import AlertSeverity

async def full_observability_training():
    job_id = "full_obs_job"
    
    # Start everything
    tensorboard_writer.config.enabled = True
    await training_monitor.start_monitoring(job_id)
    metrics_manager.start_job(job_id)
    
    for step in range(num_steps):
        # Training...
        
        # Record all metrics
        training_m = metrics_manager.record_training_metrics(
            job_id=job_id, global_step=step,
            training_loss=loss.item(), learning_rate=lr,
        )
        
        if step % 10 == 0:
            system_m = metrics_manager.record_system_metrics(job_id)
            
        # TensorBoard
        tensorboard_writer.write_training_metrics(job_id, training_m)
        
        # Check alerts
        if step % 100 == 0:
            critical_alerts = alert_engine.get_alerts(
                job_id=job_id,
                severity=AlertSeverity.CRITICAL,
                acknowledged=False,
            )
            if critical_alerts:
                # Handle...
                pass
    
    # Export final metrics
    metrics_manager.export_metrics(
        job_id=job_id,
        output_path="final_metrics.json",
        format="json",
    )
    
    # Cleanup
    await training_monitor.stop_monitoring(job_id)
    tensorboard_writer.close(job_id)
    metrics_manager.stop_job(job_id)

asyncio.run(full_observability_training())
```

### Pattern 3: Production Configuration

```python
from app.metrics.factory import (
    create_prod_metrics_stack,
    MetricsConfig,
)

# Custom production config
config = MetricsConfig(
    storage_max_size=50000,
    enable_disk_persistence=True,
    tensorboard_log_dir="/data/tensorboard",
    log_level=LogLevel.INFO,
    monitor_check_interval_seconds=60,
)

# Create stack
stack = create_prod_metrics_stack()

# Use in training
manager = stack["manager"]
job_id = "prod_job_001"
manager.start_job(job_id)

# ... training ...

manager.stop_job(job_id)
```

---

## Troubleshooting

### Issue: GPU metrics not available

```python
from app.metrics import metrics_collector

if not metrics_collector._nvml_initialized:
    print("Install pynvml: pip install pynvml")
```

### Issue: TensorBoard not working

```python
from app.metrics.tensorboard_writer import TENSORBOARD_AVAILABLE

if not TENSORBOARD_AVAILABLE:
    print("Install tensorboard: pip install tensorboard")
```

### Issue: High memory usage

```python
from app.metrics.factory import MetricsConfig

# Reduce buffer sizes
config = MetricsConfig(
    storage_max_size=1000,  # Smaller buffer
    aggregation_window_size=50,
)
```

---

## Next Steps

- Read [COMPREHENSIVE_README.md](./app/metrics/COMPREHENSIVE_README.md) for full documentation
- Check [PHASE_4_4_4_5_6_COMPLETE.md](./PHASE_4_4_4_5_6_COMPLETE.md) for implementation details
- Run tests: `pytest tests/metrics/ -v`
- Explore API docs: Start server and visit `/docs`

---

## Need Help?

- Check comprehensive documentation
- Review test files for examples
- Contact development team

---

**Phase 4.4.4.5.6 Complete** ✅
