# Enterprise Checkpoint & Resume Manager

Production-ready fault-tolerant checkpointing and automatic recovery for long-running LLM fine-tuning jobs.

## 📋 Overview

The Checkpoint & Resume Manager provides:

- **Fault-tolerant Checkpointing**: Automatic and manual checkpoint creation
- **Automatic Recovery**: Resume training after crashes or interruptions
- **Complete State Preservation**: Model, optimizer, scheduler, RNG states
- **Intelligent Retention**: Configurable cleanup policies
- **Integrity Validation**: SHA256 hash verification
- **Multiple Strategies**: Resume from latest, best, or specific checkpoint

## 🚀 Quick Start

### Basic Checkpoint Creation

```python
from app.checkpoint import checkpoint_manager
from app.checkpoint.schemas import CheckpointType

# Create a checkpoint
checkpoint_id, metadata = checkpoint_manager.create_checkpoint(
    job_id="my_training_job",
    trainer_state=trainer.state_dict(),
    checkpoint_type=CheckpointType.AUTOMATIC,
    epoch=5,
    global_step=10000,
    eval_loss=0.25,
)

print(f"Checkpoint created: {checkpoint_id}")
print(f"File size: {metadata.file_size_mb:.2f} MB")
```

### Resume Training

```python
from app.checkpoint import resume_manager
from app.checkpoint.schemas import RecoveryStrategy

# Resume from latest checkpoint
success, state, metadata = resume_manager.resume(
    job_id="my_training_job",
    strategy=RecoveryStrategy.LATEST,
)

if success:
    trainer.load_state_dict(state)
    print(f"Resumed from step {metadata.global_step}")
else:
    print("No checkpoint found, starting from scratch")
```

### Automatic Recovery

```python
from app.checkpoint import recovery_manager

# Attempt automatic recovery after crash
success, state, metadata = recovery_manager.attempt_recovery(
    job_id="my_training_job",
    auto_strategy=RecoveryStrategy.LATEST,
)

if success:
    trainer.load_state_dict(state)
    print(f"Recovered from crash at step {metadata.global_step}")
```

## 🏗️ Architecture

### Components

```
CheckpointManager (Orchestrator)
    ├── CheckpointStorage → File I/O operations
    ├── CheckpointRegistry → Checkpoint tracking & history
    ├── CheckpointValidator → Integrity validation
    ├── SnapshotManager → Immutable snapshots
    └── Event Bus → Real-time notifications

ResumeManager → Resume from checkpoints
RecoveryManager → Automatic crash recovery
CleanupManager → Retention policies & cleanup
CheckpointFactory → Convenience methods
```

### Checkpoint Types

```python
from app.checkpoint.schemas import CheckpointType

# Available types
CheckpointType.MANUAL       # User-triggered
CheckpointType.AUTOMATIC    # Periodic automatic
CheckpointType.EPOCH        # End of epoch
CheckpointType.STEP         # Specific step
CheckpointType.BEST         # Best eval loss
CheckpointType.LAST         # Latest checkpoint
CheckpointType.EMERGENCY    # Emergency save
```

## 📦 Checkpoint Contents

Each checkpoint contains:

```python
{
    "checkpoint_metadata": {
        "checkpoint_id": "checkpoint_abc123",
        "job_id": "job_123",
        "epoch": 5,
        "global_step": 10000,
        "created_at": "2024-01-15T10:30:00Z",
        ...
    },
    "model_state_dict": {...},      # Model weights
    "optimizer_state_dict": {...},  # Optimizer state
    "scheduler_state_dict": {...},  # LR scheduler state
    "rng_state": {                  # Random number generator states
        "python": ...,
        "numpy": ...,
        "torch": ...,
        "cuda": ...,
    },
    # Additional trainer state
}
```

## 🔄 Recovery Strategies

### 1. Resume from Latest

```python
success, state, metadata = resume_manager.resume_from_latest("job_123")
```

Resumes from the most recent checkpoint by global step.

### 2. Resume from Best

```python
success, state, metadata = resume_manager.resume_from_best("job_123")
```

Resumes from checkpoint with lowest evaluation loss.

### 3. Resume from Specific

```python
success, state, metadata = resume_manager.resume_from_specific("checkpoint_abc123")
```

Resumes from a specific checkpoint ID.

## 🧹 Retention Policies

### Configure Retention

```python
from app.checkpoint.schemas import RetentionPolicy
from app.checkpoint import cleanup_manager

policy = RetentionPolicy(
    keep_last_n=3,                    # Keep 3 most recent
    keep_best_n=2,                    # Keep 2 best (lowest loss)
    max_age_days=7,                   # Delete older than 7 days
    keep_manual_checkpoints=True,     # Always keep manual
    keep_epoch_checkpoints=True,      # Always keep epoch
)

deleted_count = cleanup_manager.apply_retention_policy(
    job_id="job_123",
    policy=policy,
)

print(f"Deleted {deleted_count} old checkpoints")
```

### Simple Cleanup

```python
# Keep only last 3 checkpoints
deleted_count = cleanup_manager.cleanup_old_checkpoints(
    job_id="job_123",
    keep_last_n=3,
)

# Delete checkpoints older than 7 days
deleted_count = cleanup_manager.cleanup_by_age(
    job_id="job_123",
    max_age_days=7,
)
```

## ✅ Validation

### Validate Checkpoint

```python
from app.checkpoint import checkpoint_validator

is_valid, errors = checkpoint_validator.validate_checkpoint(checkpoint_path)

if is_valid:
    print("Checkpoint is valid")
else:
    print(f"Validation errors: {errors}")
```

### Hash Verification

```python
# Verify checkpoint integrity
is_valid = checkpoint_validator.verify_hash(
    checkpoint_path,
    expected_hash="abc123...",
)
```

## 📊 Monitoring

### List Checkpoints

```python
checkpoints = checkpoint_manager.list_checkpoints("job_123")

for cp in checkpoints:
    print(f"{cp.checkpoint_id}: step={cp.global_step}, "
          f"size={cp.file_size_bytes / 1024 / 1024:.2f} MB")
```

### Get Checkpoint Info

```python
# Get latest
latest = checkpoint_manager.get_latest_checkpoint("job_123")

# Get best
best = checkpoint_manager.get_best_checkpoint("job_123")

# Get specific
checkpoint = checkpoint_manager.get_checkpoint("checkpoint_abc123")
```

### Registry Statistics

```python
from app.checkpoint import checkpoint_registry

stats = checkpoint_registry.get_stats("job_123")

print(f"Total checkpoints: {stats['total_checkpoints']}")
print(f"Completed: {stats['completed']}")
print(f"Failed: {stats['failed']}")
print(f"Total size: {stats['total_size_gb']:.2f} GB")
```

## 🔌 Integration with Training

### Training Loop with Checkpoints

```python
from transformers import Trainer
from app.checkpoint import checkpoint_manager
from app.checkpoint.schemas import CheckpointType

def train_with_checkpoints(trainer, job_id):
    # Check for existing checkpoint
    if resume_manager.can_resume(job_id):
        success, state, metadata = resume_manager.resume_from_latest(job_id)
        if success:
            trainer.load_state_dict(state)
            print(f"Resumed from step {metadata.global_step}")
    
    # Training loop
    for epoch in range(num_epochs):
        trainer.train()
        
        # Create checkpoint after each epoch
        checkpoint_id, metadata = checkpoint_manager.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer.state_dict(),
            checkpoint_type=CheckpointType.EPOCH,
            epoch=epoch,
            global_step=trainer.state.global_step,
            eval_loss=eval_results.get("eval_loss"),
        )
        
        print(f"Epoch {epoch}: Checkpoint {checkpoint_id} created")
    
    # Cleanup old checkpoints
    cleanup_manager.cleanup_old_checkpoints(
        job_id=job_id,
        keep_last_n=3,
    )
```

### With PEFT/LoRA

```python
from peft import PeftModel

# Save PEFT adapter in checkpoint
trainer_state = {
    "model_state_dict": model.state_dict(),
    "adapter_state_dict": model.peft_model.state_dict(),
    "optimizer_state_dict": optimizer.state_dict(),
    "scheduler_state_dict": scheduler.state_dict(),
    "global_step": global_step,
}

checkpoint_id, metadata = checkpoint_manager.create_checkpoint(
    job_id=job_id,
    trainer_state=trainer_state,
    global_step=global_step,
)
```

## 🎯 Factory Pattern

### Using CheckpointFactory

```python
from app.checkpoint.factory import CheckpointFactory

# Create factory
factory = CheckpointFactory(
    base_dir="./checkpoints",
    registry_path="./checkpoints/registry.json",
)

# Create checkpoint
checkpoint_id, metadata = factory.create_checkpoint(
    job_id="job_123",
    trainer_state=trainer_state,
    global_step=1000,
)

# Quick resume
success, state, metadata = factory.quick_resume("job_123")

# Resume with strategy
success, state, metadata = factory.resume(
    job_id="job_123",
    strategy=RecoveryStrategy.BEST,
)
```

## 🔒 Security

All API endpoints require authentication:

```python
from fastapi import Depends
from app.middleware import verify_token

@router.post("/checkpoint/create")
async def create_checkpoint(
    request: CreateCheckpointRequest,
    token: str = Depends(verify_token),
):
    ...
```

## 📡 REST API

### Create Checkpoint

```bash
POST /api/v1/checkpoint/create
{
    "job_id": "job_123",
    "checkpoint_type": "manual",
    "tags": ["milestone"],
    "metadata": {"notes": "Important checkpoint"}
}
```

### Restore Checkpoint

```bash
POST /api/v1/checkpoint/restore
{
    "job_id": "job_123",
    "recovery_strategy": "latest"
}
```

### List Checkpoints

```bash
GET /api/v1/checkpoint/list?job_id=job_123
```

### Delete Checkpoint

```bash
DELETE /api/v1/checkpoint/delete
{
    "checkpoint_id": "checkpoint_abc123"
}
```

### Health Check

```bash
GET /api/v1/checkpoint/health

Response:
{
    "status": "healthy",
    "healthy": true,
    "total_checkpoints": 42,
    "active_jobs": 5,
    "storage_used_gb": 15.3
}
```

## 🎪 Events

The checkpoint system emits events:

```python
from app.events import event_bus

# Subscribe to checkpoint events
event_bus.on("checkpoint_completed", handle_checkpoint_completed)
event_bus.on("resume_completed", handle_resume_completed)
event_bus.on("recovery_started", handle_recovery_started)
```

Available events:
- `checkpoint_started`
- `checkpoint_completed`
- `checkpoint_failed`
- `checkpoint_deleted`
- `checkpoint_validated`
- `resume_started`
- `resume_completed`
- `resume_failed`
- `recovery_started`
- `recovery_completed`
- `recovery_failed`

## ⚙️ Configuration

### Checkpoint Config

```python
from app.checkpoint.schemas import CheckpointConfig

config = CheckpointConfig(
    save_dir="./checkpoints",
    checkpoint_type=CheckpointType.AUTOMATIC,
    save_interval=100,              # Save every 100 steps
    save_epochs=1,                  # Save every epoch
    keep_last_n=3,                  # Keep 3 recent
    keep_best_n=2,                  # Keep 2 best
    max_storage_gb=50.0,            # 50 GB limit
    auto_resume=True,               # Auto-resume on restart
    validate_on_save=True,          # Validate after save
)
```

## 🐛 Error Handling

```python
from app.checkpoint.exceptions import (
    CheckpointException,
    CheckpointSaveError,
    CheckpointRestoreError,
    CheckpointNotFoundError,
    CheckpointCorruptedError,
    ResumeException,
    RecoveryException,
)

try:
    checkpoint_id, metadata = checkpoint_manager.create_checkpoint(...)
except CheckpointSaveError as e:
    print(f"Failed to save checkpoint: {e}")

try:
    success, state, metadata = resume_manager.resume(...)
except ResumeException as e:
    print(f"Resume failed: {e}")
```

## 📈 Best Practices

### 1. Checkpoint Frequency

```python
# Checkpoint every N steps for long training
if global_step % checkpoint_interval == 0:
    checkpoint_manager.create_checkpoint(
        job_id=job_id,
        trainer_state=trainer.state_dict(),
        checkpoint_type=CheckpointType.STEP,
        global_step=global_step,
    )
```

### 2. Save Best Model

```python
# Save checkpoint when eval loss improves
if eval_loss < best_eval_loss:
    best_eval_loss = eval_loss
    checkpoint_manager.create_checkpoint(
        job_id=job_id,
        trainer_state=trainer.state_dict(),
        checkpoint_type=CheckpointType.BEST,
        global_step=global_step,
        eval_loss=eval_loss,
    )
```

### 3. Graceful Shutdown

```python
import signal

def handle_shutdown(signum, frame):
    # Create emergency checkpoint
    checkpoint_manager.create_checkpoint(
        job_id=job_id,
        trainer_state=trainer.state_dict(),
        checkpoint_type=CheckpointType.EMERGENCY,
        global_step=global_step,
    )
    sys.exit(0)

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)
```

### 4. Regular Cleanup

```python
# Cleanup after each epoch
cleanup_manager.apply_retention_policy(
    job_id=job_id,
    policy=RetentionPolicy(
        keep_last_n=5,
        keep_best_n=3,
    ),
)
```

## 🔍 Troubleshooting

### Checkpoint Not Found

```python
if not resume_manager.can_resume(job_id):
    print(f"No checkpoints found for job: {job_id}")
    # Start training from scratch
```

### Corrupted Checkpoint

```python
is_valid, errors = checkpoint_validator.validate_checkpoint(checkpoint_path)
if not is_valid:
    print(f"Checkpoint corrupted: {errors}")
    # Try previous checkpoint
    checkpoints = checkpoint_manager.list_checkpoints(job_id)
    for cp in checkpoints[1:]:  # Skip latest
        ...
```

### Storage Full

```python
from app.checkpoint.exceptions import StorageQuotaExceededError

try:
    checkpoint_manager.create_checkpoint(...)
except StorageQuotaExceededError:
    # Cleanup old checkpoints
    cleanup_manager.cleanup_old_checkpoints(job_id, keep_last_n=2)
    # Retry
    checkpoint_manager.create_checkpoint(...)
```

## 📚 Additional Resources

- [Quickstart Guide](../CHECKPOINT_QUICKSTART.md)
- [Phase Completion Report](../PHASE_4_4_4_5_5_COMPLETE.md)
- [API Documentation](./api.py)
- [Test Suite](../../tests/checkpoint/)

## 🤝 Contributing

The checkpoint system is designed to be extended:

1. **Custom Storage Backends**: Extend `CheckpointStorage`
2. **Custom Validators**: Extend `CheckpointValidator`
3. **Custom Retention Policies**: Add to `RetentionPolicy`
4. **Additional Events**: Emit via `event_bus`

## 📄 License

Part of the AI Calling Agent Training Engine.
