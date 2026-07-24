# Checkpoint & Resume Manager - 5 Minute Quickstart

Get started with the Enterprise Checkpoint & Resume Manager in 5 minutes.

## 🎯 What You'll Learn

- Create your first checkpoint
- Resume training from a checkpoint
- Implement automatic recovery
- Configure retention policies

## 📦 Installation

The checkpoint system is already integrated into the training engine. No additional installation needed.

```python
# All imports you need
from app.checkpoint import (
    checkpoint_manager,
    resume_manager,
    recovery_manager,
    cleanup_manager,
)
from app.checkpoint.schemas import CheckpointType, RecoveryStrategy
```

## ⚡ Quick Examples

### 1. Create a Checkpoint (30 seconds)

```python
from app.checkpoint import checkpoint_manager
from app.checkpoint.schemas import CheckpointType

# During training, create a checkpoint
checkpoint_id, metadata = checkpoint_manager.create_checkpoint(
    job_id="my_training_job",
    trainer_state=trainer.state_dict(),  # Your trainer state
    checkpoint_type=CheckpointType.AUTOMATIC,
    global_step=1000,
    epoch=5,
)

print(f"✓ Checkpoint saved: {checkpoint_id}")
print(f"  Step: {metadata.global_step}")
print(f"  Size: {metadata.file_size_mb:.2f} MB")
```

**Output:**
```
✓ Checkpoint saved: checkpoint_a1b2c3d4
  Step: 1000
  Size: 245.32 MB
```

### 2. Resume Training (30 seconds)

```python
from app.checkpoint import resume_manager
from app.checkpoint.schemas import RecoveryStrategy

# Resume from latest checkpoint
success, state, metadata = resume_manager.resume(
    job_id="my_training_job",
    strategy=RecoveryStrategy.LATEST,
)

if success:
    # Restore your trainer
    trainer.load_state_dict(state)
    
    print(f"✓ Resumed from step {metadata.global_step}")
    print(f"  Epoch: {metadata.epoch}")
else:
    print("No checkpoint found, starting fresh")
```

**Output:**
```
✓ Resumed from step 1000
  Epoch: 5
```

### 3. Automatic Recovery (1 minute)

```python
from app.checkpoint import recovery_manager

# At the start of your training script
def start_training():
    job_id = "my_training_job"
    
    # Try to recover from previous run
    success, state, metadata = recovery_manager.attempt_recovery(
        job_id=job_id,
        auto_strategy=RecoveryStrategy.LATEST,
    )
    
    if success:
        trainer.load_state_dict(state)
        start_step = metadata.global_step
        print(f"✓ Recovered from crash at step {start_step}")
    else:
        start_step = 0
        print("Starting new training")
    
    # Continue training from start_step
    train(start_from_step=start_step)
```

### 4. Cleanup Old Checkpoints (1 minute)

```python
from app.checkpoint import cleanup_manager

# Keep only the 3 most recent checkpoints
deleted_count = cleanup_manager.cleanup_old_checkpoints(
    job_id="my_training_job",
    keep_last_n=3,
)

print(f"✓ Cleaned up {deleted_count} old checkpoints")
```

## 🔄 Complete Training Loop (2 minutes)

Here's a complete training loop with checkpoints:

```python
from transformers import Trainer
from app.checkpoint import checkpoint_manager, resume_manager, cleanup_manager
from app.checkpoint.schemas import CheckpointType, RecoveryStrategy

def train_with_checkpoints(model, tokenizer, dataset):
    job_id = "llm_finetuning_job"
    
    # 1. Try to resume from previous run
    success, state, metadata = resume_manager.resume(
        job_id=job_id,
        strategy=RecoveryStrategy.LATEST,
    )
    
    if success:
        print(f"✓ Resuming from step {metadata.global_step}")
        # Load state into your trainer
    else:
        print("Starting new training")
    
    # 2. Create trainer
    trainer = Trainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
    )
    
    # 3. Training loop with checkpoints
    num_epochs = 10
    checkpoint_every_steps = 500
    
    for epoch in range(num_epochs):
        # Train epoch
        trainer.train()
        
        # Create checkpoint after each epoch
        checkpoint_id, metadata = checkpoint_manager.create_checkpoint(
            job_id=job_id,
            trainer_state=trainer.state_dict(),
            checkpoint_type=CheckpointType.EPOCH,
            epoch=epoch,
            global_step=trainer.state.global_step,
        )
        
        print(f"✓ Epoch {epoch} checkpoint: {checkpoint_id}")
        
        # Cleanup old checkpoints (keep last 3)
        cleanup_manager.cleanup_old_checkpoints(
            job_id=job_id,
            keep_last_n=3,
        )
    
    print("✓ Training complete!")
```

## 🎯 Common Use Cases

### Use Case 1: Save Best Model

```python
# During evaluation
if eval_loss < best_eval_loss:
    best_eval_loss = eval_loss
    
    checkpoint_manager.create_checkpoint(
        job_id=job_id,
        trainer_state=trainer.state_dict(),
        checkpoint_type=CheckpointType.BEST,
        global_step=global_step,
        eval_loss=eval_loss,
        tags=["best-model"],
    )
```

### Use Case 2: Resume from Best Model

```python
# Resume from best performing checkpoint
success, state, metadata = resume_manager.resume(
    job_id=job_id,
    strategy=RecoveryStrategy.BEST,  # Best eval loss
)

if success:
    trainer.load_state_dict(state)
    print(f"Loaded best model (loss: {metadata.eval_loss})")
```

### Use Case 3: Manual Checkpoint

```python
# User clicks "Save" button
checkpoint_manager.create_checkpoint(
    job_id=job_id,
    trainer_state=trainer.state_dict(),
    checkpoint_type=CheckpointType.MANUAL,
    global_step=global_step,
    tags=["user-requested", "milestone"],
    metadata={"note": "Before hyperparameter change"},
)
```

### Use Case 4: Emergency Checkpoint on Shutdown

```python
import signal
import sys

def handle_shutdown(signum, frame):
    print("Received shutdown signal, saving checkpoint...")
    
    checkpoint_manager.create_checkpoint(
        job_id=job_id,
        trainer_state=trainer.state_dict(),
        checkpoint_type=CheckpointType.EMERGENCY,
        global_step=global_step,
    )
    
    print("✓ Emergency checkpoint saved")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, handle_shutdown)   # Ctrl+C
signal.signal(signal.SIGTERM, handle_shutdown)  # Kill
```

## 🧹 Retention Policies

### Simple: Keep Last N

```python
# Keep only 5 most recent checkpoints
cleanup_manager.cleanup_old_checkpoints(
    job_id=job_id,
    keep_last_n=5,
)
```

### Advanced: Full Policy

```python
from app.checkpoint.schemas import RetentionPolicy

policy = RetentionPolicy(
    keep_last_n=3,                 # Keep 3 most recent
    keep_best_n=2,                 # Keep 2 best models
    max_age_days=7,                # Delete > 7 days old
    keep_manual_checkpoints=True,  # Never delete manual
    keep_epoch_checkpoints=True,   # Never delete epoch
)

cleanup_manager.apply_retention_policy(
    job_id=job_id,
    policy=policy,
)
```

## 📊 Monitoring

### List All Checkpoints

```python
checkpoints = checkpoint_manager.list_checkpoints(job_id)

for cp in checkpoints:
    print(f"Checkpoint: {cp.checkpoint_id}")
    print(f"  Type: {cp.checkpoint_type.value}")
    print(f"  Step: {cp.global_step}")
    print(f"  Size: {cp.file_size_bytes / 1024 / 1024:.2f} MB")
    print()
```

### Get Latest and Best

```python
# Get latest checkpoint
latest = checkpoint_manager.get_latest_checkpoint(job_id)
if latest:
    print(f"Latest: step {latest.global_step}")

# Get best checkpoint
best = checkpoint_manager.get_best_checkpoint(job_id)
if best:
    print(f"Best: loss {best.metadata.get('eval_loss')}")
```

## 🔧 REST API

You can also use the REST API:

### Create Checkpoint via API

```bash
curl -X POST http://localhost:8000/api/v1/checkpoint/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "my_training_job",
    "checkpoint_type": "manual",
    "tags": ["milestone"]
  }'
```

### Resume via API

```bash
curl -X POST http://localhost:8000/api/v1/checkpoint/restore \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "my_training_job",
    "recovery_strategy": "latest"
  }'
```

### List Checkpoints

```bash
curl -X GET "http://localhost:8000/api/v1/checkpoint/list?job_id=my_training_job" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 Troubleshooting

### Problem: No checkpoint found

```python
if not resume_manager.can_resume(job_id):
    print("No checkpoints available")
    # Start training from scratch
```

### Problem: Checkpoint corrupted

```python
from app.checkpoint import checkpoint_validator

is_valid, errors = checkpoint_validator.validate_checkpoint(checkpoint_path)
if not is_valid:
    print(f"Checkpoint corrupted: {errors}")
    # Try previous checkpoint
```

### Problem: Out of storage

```python
from app.checkpoint.exceptions import StorageQuotaExceededError

try:
    checkpoint_manager.create_checkpoint(...)
except StorageQuotaExceededError:
    # Cleanup aggressively
    cleanup_manager.cleanup_old_checkpoints(job_id, keep_last_n=1)
    # Retry
```

## 🎓 Next Steps

Now that you know the basics:

1. **Read the full documentation**: [README.md](./app/checkpoint/README.md)
2. **Explore examples**: Check `tests/checkpoint/test_integration.py`
3. **Advanced features**: 
   - Custom retention policies
   - Event-driven workflows
   - Multi-job management
4. **Integration**: Connect with your training pipeline

## 💡 Tips

### Tip 1: Checkpoint Frequency
```python
# Checkpoint every 500 steps
if global_step % 500 == 0:
    checkpoint_manager.create_checkpoint(...)
```

### Tip 2: Always Cleanup
```python
# After creating checkpoint, cleanup
checkpoint_manager.create_checkpoint(...)
cleanup_manager.cleanup_old_checkpoints(job_id, keep_last_n=3)
```

### Tip 3: Tag Important Checkpoints
```python
checkpoint_manager.create_checkpoint(
    ...,
    tags=["milestone", "good-performance", "before-lr-change"]
)
```

### Tip 4: Check Before Resume
```python
if resume_manager.can_resume(job_id):
    # Resume logic
else:
    # Fresh start logic
```

## ✅ Checklist

After reading this quickstart, you should be able to:

- [ ] Create a checkpoint
- [ ] Resume from a checkpoint
- [ ] Implement automatic recovery
- [ ] Configure cleanup policies
- [ ] Handle storage management
- [ ] Monitor checkpoints
- [ ] Use the REST API
- [ ] Debug common issues

## 📚 Resources

- **Full Documentation**: `app/checkpoint/README.md`
- **API Reference**: `app/checkpoint/api.py`
- **Test Examples**: `tests/checkpoint/`
- **Phase Report**: `PHASE_4_4_4_5_5_COMPLETE.md`

## 🚀 Ready to Go!

You're now ready to use the Enterprise Checkpoint & Resume Manager in your training pipelines!

```python
# Your complete training script
from app.checkpoint import checkpoint_manager, resume_manager

def main():
    job_id = "my_awesome_model"
    
    # Resume if possible
    success, state, metadata = resume_manager.resume(job_id)
    if success:
        print(f"✓ Resumed from step {metadata.global_step}")
    
    # Train
    train(...)
    
    # Checkpoint
    checkpoint_manager.create_checkpoint(
        job_id=job_id,
        trainer_state=trainer.state_dict(),
        global_step=global_step,
    )
    
    print("✓ Done!")

if __name__ == "__main__":
    main()
```

**Happy Training! 🎉**
