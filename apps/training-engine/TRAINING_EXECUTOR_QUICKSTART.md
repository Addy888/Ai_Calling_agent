# Training Executor Core - Quick Start Guide

## 📋 Overview

The **Training Executor Core** (Phase 4.4.4.5.1) is a pure orchestration layer that manages training job lifecycle without implementing actual training logic.

---

## 🏗️ Architecture

```
training_executor/
├── models.py              # Data models (TrainingJob, TrainingConfig, etc.)
├── interfaces.py          # Interfaces for future implementations
├── executor.py            # Main orchestrator
├── pipeline.py            # Workflow orchestration
├── job_manager.py         # Job lifecycle management
├── event_manager.py       # Event emission
├── runtime_manager.py     # Runtime environment setup
├── factory.py             # Factory patterns
├── health.py              # Health monitoring
├── schemas.py             # API request/response schemas
├── api.py                 # REST API endpoints (10)
└── exceptions.py          # Custom exceptions
```

---

## 🚀 Quick Usage

### 1. Create Training Job

```python
from app.training_executor.executor import training_executor
from app.training_executor.factory import TrainingConfigFactory

# Create LoRA configuration
config = TrainingConfigFactory.create_lora_config(
    num_epochs=3,
    learning_rate=2e-4,
    batch_size=4,
    lora_r=8,
    lora_alpha=16,
)

# Submit job
job = await training_executor.submit_job(
    model_id="model-123",
    dataset_id="dataset-456",
    config=config,
    company_id="company-789",
    user_id="user-101",
)

print(f"Job created: {job.job_id}")
print(f"Status: {job.status.value}")
```

### 2. Start Training

```python
# Start training execution
job = await training_executor.start_training(job.job_id)
print(f"Training started: {job.status.value}")
```

### 3. Check Job Status

```python
# Get job details
job = await training_executor.get_job(job.job_id)
print(f"Status: {job.status.value}")
print(f"Progress: {job.completed_steps}/{job.total_steps}")
```

### 4. Cancel Training

```python
# Cancel training
job = await training_executor.cancel_training(job.job_id)
print(f"Training cancelled: {job.status.value}")
```

### 5. List Jobs

```python
from app.training_executor.models import TrainingStatus

# List all jobs
jobs = await training_executor.list_jobs(limit=50)

# List jobs by status
training_jobs = await training_executor.list_jobs(
    status=TrainingStatus.TRAINING,
    limit=10
)

# List jobs by company
company_jobs = await training_executor.list_jobs(
    company_id="company-789",
    limit=100
)
```

---

## 🌐 REST API Endpoints

### Base URL
```
http://localhost:8000/api/v1
```

### 1. Create Training Job
```http
POST /training/jobs
Content-Type: application/json

{
  "model_id": "model-123",
  "dataset_id": "dataset-456",
  "tokenizer_id": "tokenizer-789",
  "config": {
    "training_type": "lora",
    "num_train_epochs": 3,
    "learning_rate": 0.0002,
    "per_device_train_batch_size": 4,
    "lora_config": {
      "r": 8,
      "lora_alpha": 16,
      "lora_dropout": 0.05
    }
  },
  "company_id": "company-789"
}
```

### 2. Start Training
```http
POST /training/start
Content-Type: application/json

{
  "job_id": "job-abc-123"
}
```

### 3. Get Job Details
```http
GET /training/jobs/{job_id}
```

### 4. List Jobs
```http
GET /training/jobs?status=training&company_id=company-789&limit=50
```

### 5. Cancel Training
```http
POST /training/cancel
Content-Type: application/json

{
  "job_id": "job-abc-123"
}
```

### 6. Get Health Status
```http
GET /training/health
```

### 7. Get Runtime Info
```http
GET /training/runtime/{job_id}
```

### 8. Delete Job
```http
DELETE /training/jobs/{job_id}
```

---

## 📊 Job Lifecycle

```
PENDING → PREPARING → INITIALIZING → TRAINING → COMPLETED
            ↓                              ↓
         FAILED                         PAUSED
            ↓                              ↓
         STOPPED                      RESUMING
```

### Status Meanings:
- **PENDING**: Job created, waiting to start
- **PREPARING**: Loading metadata, validating
- **INITIALIZING**: Setting up runtime environment
- **TRAINING**: Active training (delegated to trainer)
- **PAUSED**: Training temporarily stopped
- **RESUMING**: Resuming from pause
- **COMPLETED**: Successfully finished
- **FAILED**: Training failed with error
- **STOPPED**: Cancelled by user
- **CHECKPOINTING**: Saving checkpoint

---

## 🎯 Events Emitted

The executor emits the following events via event bus:

1. **job_created** - When job is created
2. **job_queued** - When job is queued for execution
3. **preparing** - When preparing for training
4. **runtime_ready** - When runtime is initialized
5. **training_started** - When training begins
6. **training_completed** - When training finishes successfully
7. **training_failed** - When training fails
8. **training_cancelled** - When training is cancelled
9. **cleanup_started** - When cleanup begins
10. **cleanup_finished** - When cleanup completes

### Subscribe to Events:
```python
from app.events import event_bus

async def on_training_started(event):
    print(f"Training started: {event.data}")

event_bus.subscribe("training_started", on_training_started)
```

---

## 🏭 Factory Patterns

### Create LoRA Config
```python
from app.training_executor.factory import TrainingConfigFactory

config = TrainingConfigFactory.create_lora_config(
    num_epochs=3,
    learning_rate=2e-4,
    batch_size=4,
    lora_r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    max_seq_length=512,
)
```

### Create Full Fine-tune Config
```python
config = TrainingConfigFactory.create_full_finetune_config(
    num_epochs=5,
    learning_rate=5e-5,
    batch_size=8,
    max_seq_length=1024,
)
```

### Create Custom Job
```python
from app.training_executor.factory import TrainingJobFactory
from app.training_executor.models import TrainingType

job = TrainingJobFactory.create_job(
    model_id="model-123",
    dataset_id="dataset-456",
    config=config,
    training_type=TrainingType.LORA,
    company_id="company-789",
)
```

---

## 🔧 Configuration

### Training Configuration Options

```python
from app.training_executor.models import (
    TrainingConfig,
    TrainingType,
    OptimizerType,
    SchedulerType,
    PrecisionType,
)

config = TrainingConfig(
    # Type
    training_type=TrainingType.LORA,
    
    # Training
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    
    # Learning rate
    learning_rate=2e-4,
    weight_decay=0.01,
    warmup_ratio=0.03,
    
    # Optimizer
    optimizer_type=OptimizerType.ADAMW,
    adam_beta1=0.9,
    adam_beta2=0.999,
    
    # Scheduler
    scheduler_type=SchedulerType.LINEAR,
    
    # Precision
    precision=PrecisionType.FP16,
    fp16=True,
    
    # Gradient
    max_grad_norm=1.0,
    gradient_checkpointing=True,
    
    # Sequence
    max_seq_length=512,
    
    # Logging
    logging_steps=10,
    eval_steps=100,
    save_steps=100,
    
    # System
    seed=42,
)
```

---

## 📈 Health Monitoring

### Check Health
```python
from app.training_executor.health import health_checker

health = await health_checker.check_health()
print(f"Status: {health['status']}")
print(f"Running jobs: {health['running_jobs']}")
print(f"Total jobs: {health['total_jobs']}")
```

### Get Executor Stats
```python
stats = training_executor.get_executor_stats()
print(f"Jobs: {stats['jobs']}")
print(f"Active runtimes: {stats['active_runtimes']}")
print(f"Executing tasks: {stats['executing_tasks']}")
```

---

## 🔍 Error Handling

```python
from app.training_executor.exceptions import (
    TrainingException,
    TrainingJobException,
    TrainingRuntimeException,
    TrainingPipelineException,
)

try:
    job = await training_executor.submit_job(...)
except TrainingJobException as e:
    print(f"Job error: {str(e)}")
except TrainingException as e:
    print(f"Training error: {str(e)}")
```

---

## 🎓 Important Notes

### ⚠️ What This Phase DOES NOT Include

Phase 4.4.4.5.1 is **orchestration only**. It does NOT include:
- ❌ Actual HuggingFace Trainer execution
- ❌ LoRA/PEFT implementation
- ❌ Optimizer creation
- ❌ Scheduler creation
- ❌ Actual model loading
- ❌ Actual dataset loading
- ❌ Checkpoint saving/loading
- ❌ Metrics tracking

These will be implemented in **Phase 4.4.4.5.2** (Trainer Implementation).

### ✅ What This Phase DOES

- ✅ Job lifecycle management
- ✅ Workflow orchestration
- ✅ Event emission
- ✅ Runtime environment setup (directories)
- ✅ Metadata loading (not actual objects)
- ✅ Status tracking
- ✅ REST API endpoints
- ✅ Health monitoring

---

## 🔮 Next Steps

After Phase 4.4.4.5.1, you'll implement:

### Phase 4.4.4.5.2 - Trainer Implementation
- HuggingFace Trainer integration
- PEFT/LoRA application
- Optimizer creation
- Scheduler creation
- Training callbacks
- Actual training execution

### Phase 4.4.4.5.3 - Advanced Features
- Checkpoint management
- Metrics tracking
- Early stopping
- Learning rate finder

### Phase 4.4.4.5.4 - Enterprise Features
- Distributed training
- Multi-GPU support
- Model evaluation
- Export & deployment

---

## 📚 Additional Resources

- [PHASE_4_4_4_5_1_COMPLETE.md](./PHASE_4_4_4_5_1_COMPLETE.md) - Full completion report
- [PHASE_4_4_4_5_1_VALIDATION.md](./PHASE_4_4_4_5_1_VALIDATION.md) - Validation report
- [MODEL_README.md](./MODEL_README.md) - Model Loader documentation
- [QUICKSTART_MODEL.md](./QUICKSTART_MODEL.md) - Model Loader quickstart

---

## 🎉 Summary

Phase 4.4.4.5.1 provides a **complete orchestration layer** for training execution:

✅ 13 production modules  
✅ 10 REST API endpoints  
✅ Event-driven architecture  
✅ Type-safe and secure  
✅ Job lifecycle management  
✅ Health monitoring  
✅ Factory patterns  
✅ Interface-based design  

**Ready for actual training implementation in Phase 4.4.4.5.2!**

---

**Version**: 1.0.0  
**Date**: July 23, 2026  
**Status**: ✅ PRODUCTION READY (Orchestration Layer)
