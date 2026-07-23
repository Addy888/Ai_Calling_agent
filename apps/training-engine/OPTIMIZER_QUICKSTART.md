# Optimizer Module Quickstart Guide

**Phase 4.4.4.5.4 - Enterprise Optimizer & Learning Rate Scheduler Engine**

## 🚀 5-Minute Quick Start

### 1. Basic Optimizer Creation

```python
from app.optimizer import optimizer_manager, OptimizerConfig
import torch.nn as nn

# Your model
model = YourModel()

# Configure optimizer
config = OptimizerConfig(
    optimizer_type="adamw",
    learning_rate=5e-5,
    weight_decay=0.01,
)

# Create optimizer
optimizer_id, optimizer, metadata = optimizer_manager.create_optimizer(
    model=model,
    config=config,
    model_id="my_model",
)

print(f"✅ Optimizer created: {optimizer_id}")
print(f"📊 Trainable parameters: {metadata.trainable_parameters:,}")
```

### 2. With Learning Rate Scheduler

```python
from app.optimizer import OptimizerConfig, SchedulerConfig

# Optimizer config
optimizer_config = OptimizerConfig(
    optimizer_type="adamw",
    learning_rate=5e-5,
    weight_decay=0.01,
)

# Scheduler config
scheduler_config = SchedulerConfig(
    scheduler_type="linear_with_warmup",
    warmup_ratio=0.1,  # 10% warmup
    num_training_steps=1000,
)

# Create both together
result = optimizer_manager.create_optimizer_with_scheduler(
    model=model,
    optimizer_config=optimizer_config,
    scheduler_config=scheduler_config,
    model_id="my_model",
    num_training_steps=1000,
)

optimizer = result["optimizer"]
scheduler = result["scheduler"]

print(f"✅ Optimizer ID: {result['optimizer_id']}")
print(f"✅ Scheduler ID: {result['scheduler_id']}")
```

### 3. Using Factory (Easiest Way)

```python
from app.optimizer import optimizer_factory

# One-liner with preset
result = optimizer_factory.create_preset(
    model=model,
    model_id="my_model",
    preset="default",  # or "aggressive", "conservative"
    num_training_steps=1000,
)

optimizer = result["optimizer"]
scheduler = result["scheduler"]

print("✅ Optimizer and scheduler ready!")
```

### 4. Training Loop Integration

```python
import torch

# Training loop
for epoch in range(num_epochs):
    for batch in dataloader:
        # Forward pass
        outputs = model(batch["input_ids"])
        loss = criterion(outputs, batch["labels"])
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        
        # Gradient clipping (optional)
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        
        # Update weights
        optimizer.step()
        
        # Update learning rate
        scheduler.step()
        
        # Log learning rate (every 100 steps)
        if step % 100 == 0:
            current_lr = optimizer.param_groups[0]["lr"]
            print(f"Step {step}, LR: {current_lr:.2e}")
```

### 5. Validation Before Creation

```python
# Validate configuration first
report = optimizer_manager.validate_configuration(
    optimizer_config=optimizer_config,
    scheduler_config=scheduler_config,
    num_training_steps=1000,
)

if not report["valid"]:
    print("❌ Configuration issues:")
    for issue in report["issues"]:
        print(f"  - {issue}")
else:
    print("✅ Configuration is valid")
    # Proceed with creation...
```

## 📖 Common Patterns

### Pattern 1: Fine-Tuning BERT

```python
result = optimizer_factory.create_adamw(
    model=bert_model,
    model_id="bert_finetuning",
    learning_rate=2e-5,
    weight_decay=0.01,
    with_scheduler=True,
    num_training_steps=total_steps,
)
```

### Pattern 2: Training from Scratch

```python
result = optimizer_factory.create_adamw(
    model=model,
    model_id="training_from_scratch",
    learning_rate=1e-4,
    weight_decay=0.1,
    with_scheduler=True,
    num_training_steps=total_steps,
)
```

### Pattern 3: Different Learning Rates for Layers

```python
from app.optimizer import parameter_group_builder, OptimizerBuilder

# Custom parameter groups
groups = parameter_group_builder.create_custom_groups(
    model=model,
    group_configs=[
        {
            "name": "embeddings",
            "name_patterns": ["embeddings"],
            "lr": 1e-5,
            "weight_decay": 0.0,
        },
        {
            "name": "encoder",
            "name_patterns": ["encoder"],
            "lr": 5e-5,
            "weight_decay": 0.01,
        },
        {
            "name": "classifier",
            "name_patterns": ["classifier"],
            "lr": 1e-4,
            "weight_decay": 0.01,
        },
    ],
    default_lr=5e-5,
    default_weight_decay=0.01,
)

# Create optimizer with custom groups
builder = OptimizerBuilder()
optimizer = builder.build_optimizer(model, optimizer_config, groups)
```

### Pattern 4: Cosine Annealing

```python
result = optimizer_factory.create_with_cosine_schedule(
    model=model,
    model_id="cosine_training",
    learning_rate=5e-5,
    num_training_steps=10000,
    warmup_ratio=0.05,
)
```

### Pattern 5: LoRA/PEFT Training

```python
# Freeze base model
for param in model.base_model.parameters():
    param.requires_grad = False

# Only train adapter
config = OptimizerConfig(
    optimizer_type="adamw",
    learning_rate=1e-4,
    weight_decay=0.01,
    use_parameter_groups=True,  # Will only optimize trainable params
)

result = optimizer_manager.create_optimizer(
    model=model,
    config=config,
    model_id="lora_training",
)

print(f"Trainable: {result['optimizer_metadata'].trainable_parameters:,}")
print(f"Total: {result['optimizer_metadata'].total_parameters:,}")
```

## 🌐 REST API Usage

### Create Optimizer via API

```bash
curl -X POST "http://localhost:8000/api/v1/optimizer/create" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "my_model",
    "optimizer_config": {
      "optimizer_type": "adamw",
      "learning_rate": 0.00005,
      "weight_decay": 0.01
    },
    "scheduler_config": {
      "scheduler_type": "linear_with_warmup",
      "warmup_ratio": 0.1,
      "num_training_steps": 1000
    }
  }'
```

### Validate Configuration

```bash
curl -X POST "http://localhost:8000/api/v1/optimizer/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "optimizer_config": {
      "optimizer_type": "adamw",
      "learning_rate": 0.00005,
      "weight_decay": 0.01
    },
    "scheduler_config": {
      "scheduler_type": "linear_with_warmup",
      "warmup_ratio": 0.1,
      "num_training_steps": 1000
    },
    "num_training_steps": 1000
  }'
```

### Health Check

```bash
curl "http://localhost:8000/api/v1/optimizer/health"
```

## ⚙️ Configuration Reference

### Optimizer Types

- `adamw` - Best for most tasks (default)
- `sgd` - Good for computer vision
- `adafactor` - Memory-efficient for large models
- `adam` - Standard Adam (legacy)
- `rmsprop` - For RNNs

### Scheduler Types

- `linear_with_warmup` - Linear decay with warmup (recommended)
- `cosine` - Smooth cosine decay
- `cosine_with_restarts` - Periodic restarts
- `polynomial` - Custom polynomial decay
- `constant` - No learning rate change
- `constant_with_warmup` - Warmup then constant

### Learning Rate Ranges

| Task | Learning Rate | Warmup |
|------|---------------|--------|
| Fine-tuning (BERT, GPT) | 1e-5 to 5e-5 | 10% |
| Training from scratch | 1e-4 to 1e-3 | 5-10% |
| Small models | 1e-3 to 1e-2 | 5% |
| LoRA/Adapters | 1e-4 to 1e-3 | 5% |

### Weight Decay

- **Low** (0.0 - 0.01): Fine-tuning, small datasets
- **Medium** (0.01 - 0.1): General purpose
- **High** (0.1+): Prevent overfitting, large models

## 🔍 Debugging

### Check Learning Rate

```python
from app.optimizer import optimizer_runtime

current_lr = optimizer_runtime.get_current_lr(optimizer_id)
print(f"Current LR: {current_lr:.2e}")
```

### Check Warmup Progress

```python
from app.optimizer.scheduler import scheduler_manager

progress = scheduler_manager.get_warmup_progress(scheduler_id)
completed = scheduler_manager.is_warmup_completed(scheduler_id)

print(f"Warmup progress: {progress:.1%}")
print(f"Warmup completed: {completed}")
```

### View Parameter Groups

```python
metadata = optimizer_manager.get_optimizer_metadata(optimizer_id)

for group in metadata.parameter_groups:
    print(f"Group: {group.name}")
    print(f"  Params: {group.num_params:,}")
    print(f"  LR: {group.learning_rate:.2e}")
    print(f"  Weight Decay: {group.has_weight_decay}")
```

## 🚨 Common Issues

### Issue: Learning rate not changing

**Solution**: Make sure to call `scheduler.step()` after `optimizer.step()`.

### Issue: Loss exploding during training

**Solutions**:
1. Lower learning rate
2. Add gradient clipping
3. Increase warmup steps
4. Check weight decay

### Issue: Training too slow

**Solutions**:
1. Increase learning rate (carefully)
2. Reduce warmup steps
3. Use different scheduler (cosine instead of linear)

## 📚 Next Steps

- Read full documentation: `app/optimizer/README.md`
- Explore examples: `tests/optimizer/test_integration.py`
- API docs: `/api/v1/docs#/Optimizer`
- Integration: See Training Executor documentation

## 🎯 Quick Command Reference

```python
# Create with defaults
optimizer_factory.create_preset(model, "my_model", "default")

# Validate config
optimizer_manager.validate_configuration(opt_config, sched_config)

# Get current LR
optimizer_runtime.get_current_lr(optimizer_id)

# Step scheduler
optimizer_manager.step_scheduler(scheduler_id)

# Check warmup
scheduler_manager.is_warmup_completed(scheduler_id)
```

---

**Ready to optimize!** 🚀

For detailed documentation, see `app/optimizer/README.md`
