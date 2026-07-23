# Enterprise Optimizer & Learning Rate Scheduler Engine

**Phase 4.4.4.5.4**

Production-ready optimizer and learning rate scheduler management for the AI Training Engine.

## 🎯 Overview

The Optimizer module provides enterprise-grade optimization infrastructure with:

- **Multiple Optimizers**: AdamW, SGD, Adafactor, Adam, RMSprop
- **Advanced Schedulers**: Linear, Cosine, Polynomial, with warmup support
- **Parameter Grouping**: Weight decay separation, frozen parameter handling
- **Runtime Management**: Learning rate tracking, state management
- **Full Validation**: Configuration validation and compatibility checks
- **Event System**: Real-time optimization event tracking
- **REST APIs**: Complete API for optimizer management

## 📦 Module Structure

```
optimizer/
├── __init__.py              # Module exports
├── manager.py               # Main optimizer orchestrator
├── builder.py               # Optimizer builder
├── factory.py               # Convenience factory methods
├── registry.py              # Optimizer tracking
├── runtime.py               # Runtime state management
├── validator.py             # Configuration validation
├── parameter_groups.py      # Parameter group builder
├── interfaces.py            # Abstract interfaces
├── schemas.py               # Pydantic models
├── exceptions.py            # Custom exceptions
├── api.py                   # REST API endpoints
├── scheduler/
│   ├── __init__.py
│   ├── manager.py          # Scheduler orchestrator
│   └── builder.py          # Scheduler builder
└── README.md               # This file
```

## 🚀 Quick Start

### Basic Usage

```python
from app.optimizer import optimizer_manager, OptimizerConfig, SchedulerConfig

# Create optimizer
config = OptimizerConfig(
    optimizer_type="adamw",
    learning_rate=5e-5,
    weight_decay=0.01,
)

optimizer_id, optimizer, metadata = optimizer_manager.create_optimizer(
    model=model,
    config=config,
    model_id="my_model",
)

# Create scheduler
scheduler_config = SchedulerConfig(
    scheduler_type="linear_with_warmup",
    warmup_ratio=0.1,
    num_training_steps=1000,
)

scheduler_id, scheduler, sched_metadata = optimizer_manager.create_scheduler(
    optimizer_id=optimizer_id,
    config=scheduler_config,
    num_training_steps=1000,
)
```

### Using Factory

```python
from app.optimizer import optimizer_factory

# Quick AdamW with scheduler
result = optimizer_factory.create_adamw(
    model=model,
    model_id="my_model",
    learning_rate=5e-5,
    with_scheduler=True,
    num_training_steps=1000,
)

# Use presets
result = optimizer_factory.create_preset(
    model=model,
    model_id="my_model",
    preset="aggressive",  # or "default", "conservative"
    num_training_steps=1000,
)
```

### Combined Creation

```python
# Create optimizer and scheduler together
result = optimizer_manager.create_optimizer_with_scheduler(
    model=model,
    optimizer_config=optimizer_config,
    scheduler_config=scheduler_config,
    model_id="my_model",
    num_training_steps=1000,
)

optimizer = result["optimizer"]
scheduler = result["scheduler"]
```

## 📊 Supported Optimizers

### Fully Implemented

| Optimizer | Best For | Learning Rate Range |
|-----------|----------|---------------------|
| **AdamW** | Most tasks, default choice | 1e-5 to 1e-3 |
| **SGD** | Computer vision, momentum tasks | 1e-3 to 1e-1 |
| **Adafactor** | Large models, memory-constrained | 1e-4 to 1e-2 |

### Extension Interfaces

| Optimizer | Status | Use Case |
|-----------|--------|----------|
| **Adam** | Available | Legacy support |
| **RMSprop** | Available | RNNs, specific architectures |
| **Lion** | Future | High-performance alternative |
| **8-bit Adam** | Future | Memory-efficient training |
| **PagedAdamW** | Future | Very large models |

## 📈 Supported Schedulers

### Warmup Schedulers

| Scheduler | Description | Best For |
|-----------|-------------|----------|
| **Linear with Warmup** | Linear decay after warmup | General purpose |
| **Cosine** | Smooth cosine decay | Fine-tuning |
| **Cosine with Restarts** | Periodic restarts | Long training |
| **Polynomial** | Polynomial decay | Custom decay curves |

### Constant Schedulers

| Scheduler | Description |
|-----------|-------------|
| **Constant** | No learning rate change |
| **Constant with Warmup** | Warmup then constant |

## 🔧 Parameter Groups

The module automatically creates parameter groups with intelligent weight decay handling:

### Automatic Grouping

```python
config = OptimizerConfig(
    optimizer_type="adamw",
    learning_rate=5e-5,
    weight_decay=0.01,
    use_parameter_groups=True,  # Enable automatic grouping
)
```

**Behavior:**
- **Weight Decay Applied**: Linear layers, Conv layers
- **No Weight Decay**: Biases, LayerNorm, BatchNorm, Embeddings

### Custom Grouping

```python
from app.optimizer import parameter_group_builder

group_configs = [
    {
        "name": "encoder",
        "name_patterns": ["encoder"],
        "lr": 1e-4,
        "weight_decay": 0.01,
    },
    {
        "name": "decoder",
        "name_patterns": ["decoder"],
        "lr": 5e-5,
        "weight_decay": 0.0,
    },
]

groups = parameter_group_builder.create_custom_groups(
    model=model,
    group_configs=group_configs,
    default_lr=5e-5,
    default_weight_decay=0.01,
)
```

## ⚙️ Configuration

### Optimizer Configuration

```python
OptimizerConfig(
    optimizer_type="adamw",           # Optimizer type
    learning_rate=5e-5,               # Base learning rate
    weight_decay=0.01,                # Weight decay (L2 regularization)
    adam_beta1=0.9,                   # Adam beta1
    adam_beta2=0.999,                 # Adam beta2
    adam_epsilon=1e-8,                # Adam epsilon
    max_grad_norm=1.0,                # Gradient clipping threshold
    use_parameter_groups=True,        # Enable parameter grouping
)
```

### Scheduler Configuration

```python
SchedulerConfig(
    scheduler_type="linear_with_warmup",  # Scheduler type
    warmup_strategy="ratio",               # "ratio" or "steps"
    warmup_ratio=0.1,                      # Warmup as % of total steps
    warmup_steps=None,                     # Or explicit warmup steps
    num_training_steps=1000,               # Total training steps
    num_cycles=0.5,                        # For cosine with restarts
    lr_end=0.0,                            # End learning rate
    power=1.0,                             # For polynomial decay
)
```

## ✅ Validation

### Configuration Validation

```python
# Validate before creation
report = optimizer_manager.validate_configuration(
    optimizer_config=optimizer_config,
    scheduler_config=scheduler_config,
    num_training_steps=1000,
)

if report["valid"]:
    print("✓ Configuration is valid")
else:
    print("✗ Issues found:")
    for issue in report["issues"]:
        print(f"  - {issue}")
```

### Validation Report

```python
{
    "valid": True,
    "optimizer_valid": True,
    "scheduler_valid": True,
    "issues": [],
    "warnings": ["Learning rate 0.5 seems high"]
}
```

## 🔄 Runtime Management

### Learning Rate Updates

```python
from app.optimizer import optimizer_runtime

# Get current learning rate
current_lr = optimizer_runtime.get_current_lr(optimizer_id)

# Update learning rate manually
optimizer_runtime.update_lr(optimizer_id, new_lr=1e-4)

# Step scheduler (automatic LR update)
new_lr = optimizer_manager.step_scheduler(scheduler_id)
```

### State Management

```python
# Get optimizer state
state = optimizer_runtime.get_state(optimizer_id)

# Set custom runtime state
optimizer_runtime.set_runtime_state(optimizer_id, "custom_key", value)

# Get runtime state
value = optimizer_runtime.get_runtime_state(optimizer_id, "custom_key")
```

## 📡 Events

The module emits events for monitoring:

```python
from app.events import event_bus

def on_optimizer_created(data):
    print(f"Optimizer created: {data['optimizer_id']}")

event_bus.subscribe("optimizer_created", on_optimizer_created)
```

### Available Events

- `optimizer_created` - Optimizer created
- `scheduler_created` - Scheduler created
- `learning_rate_updated` - Learning rate changed
- `warmup_started` - Warmup phase started
- `warmup_completed` - Warmup phase completed
- `scheduler_stepped` - Scheduler stepped

## 🌐 REST API

### Create Optimizer

```http
POST /api/v1/optimizer/create
Content-Type: application/json
Authorization: Bearer <token>

{
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
}
```

### Validate Configuration

```http
POST /api/v1/optimizer/validate
Content-Type: application/json

{
  "optimizer_config": {...},
  "scheduler_config": {...},
  "num_training_steps": 1000
}
```

### Get Status

```http
GET /api/v1/optimizer/status/{optimizer_id}
GET /api/v1/optimizer/scheduler/status/{scheduler_id}
```

### Health Check

```http
GET /api/v1/optimizer/health
```

## 🧪 Testing

Run optimizer tests:

```bash
# All optimizer tests
pytest tests/optimizer/

# Specific test modules
pytest tests/optimizer/test_optimizer_builder.py
pytest tests/optimizer/test_scheduler_builder.py
pytest tests/optimizer/test_integration.py

# With coverage
pytest tests/optimizer/ --cov=app.optimizer --cov-report=html
```

## 🎯 Best Practices

### 1. Always Validate

```python
# Validate before creation
report = optimizer_manager.validate_configuration(
    optimizer_config, scheduler_config, num_training_steps
)

if not report["valid"]:
    raise ValueError(f"Invalid config: {report['issues']}")
```

### 2. Use Parameter Groups

```python
# Enable for better regularization
config = OptimizerConfig(
    use_parameter_groups=True,  # Separate weight decay groups
    weight_decay=0.01,
)
```

### 3. Warmup for Stability

```python
# Use warmup for training stability
scheduler_config = SchedulerConfig(
    scheduler_type="linear_with_warmup",
    warmup_ratio=0.1,  # 10% warmup
)
```

### 4. Monitor Learning Rates

```python
# Track LR during training
for step in range(num_steps):
    # ... training step ...
    
    if step % 100 == 0:
        current_lr = optimizer_runtime.get_current_lr(optimizer_id)
        print(f"Step {step}, LR: {current_lr}")
```

### 5. Use Factories for Common Patterns

```python
# Instead of manual configuration
result = optimizer_factory.create_preset(
    model=model,
    model_id="my_model",
    preset="default",
    num_training_steps=1000,
)
```

## 📝 Examples

### Example 1: Basic Fine-Tuning

```python
# Standard fine-tuning setup
result = optimizer_factory.create_adamw(
    model=model,
    model_id="bert_finetuning",
    learning_rate=5e-5,
    weight_decay=0.01,
    with_scheduler=True,
    num_training_steps=1000,
)

optimizer = result["optimizer"]
scheduler = result["scheduler"]

# Training loop
for epoch in range(epochs):
    for batch in dataloader:
        optimizer.zero_grad()
        loss = model(batch)
        loss.backward()
        optimizer.step()
        scheduler.step()
```

### Example 2: Different LR for Layers

```python
# Custom parameter groups
groups = parameter_group_builder.create_custom_groups(
    model=model,
    group_configs=[
        {"name_patterns": ["embeddings"], "lr": 1e-5, "weight_decay": 0.0},
        {"name_patterns": ["encoder"], "lr": 5e-5, "weight_decay": 0.01},
        {"name_patterns": ["classifier"], "lr": 1e-4, "weight_decay": 0.01},
    ],
    default_lr=5e-5,
    default_weight_decay=0.01,
)
```

### Example 3: Cosine Annealing

```python
# Cosine schedule for longer training
result = optimizer_factory.create_with_cosine_schedule(
    model=model,
    model_id="long_training",
    learning_rate=5e-5,
    num_training_steps=10000,
    warmup_ratio=0.05,
)
```

## 🔍 Troubleshooting

### Issue: Learning rate not changing

**Solution**: Make sure to call `scheduler.step()` after each training step.

### Issue: Validation fails

**Solution**: Check validation report for specific issues:
```python
report = optimizer_manager.validate_configuration(...)
print(report["issues"])
```

### Issue: Memory issues with large models

**Solution**: Use Adafactor or reduce batch size. Future: use 8-bit optimizers.

## 🚦 Integration with Training Executor

```python
from app.training_executor import training_executor
from app.optimizer import optimizer_manager

# Training executor automatically handles optimizer
job = training_executor.create_job(
    model_id="my_model",
    config={
        "optimizer": {
            "type": "adamw",
            "learning_rate": 5e-5,
        },
        "scheduler": {
            "type": "linear_with_warmup",
            "warmup_ratio": 0.1,
        },
    },
)
```

## 📚 Related Modules

- **Training Executor** (`app/training_executor/`) - Orchestrates training
- **Trainer** (`app/trainer/`) - Hugging Face Trainer integration
- **PEFT** (`app/peft/`) - LoRA and adapter training
- **Model** (`app/model/`) - Model loading and management
- **Dataset** (`app/dataset/`) - Dataset management

## 🔮 Future Enhancements

- **8-bit Optimizers**: Memory-efficient training
- **PagedAdamW**: Very large model support
- **Lion Optimizer**: High-performance alternative
- **Advanced Schedulers**: OneCycleLR, custom schedules
- **Optimizer State Management**: Checkpoint save/load
- **Distributed Optimization**: Multi-GPU support

## 📖 API Reference

Full API documentation available at: `/api/v1/docs#/Optimizer`

## 🤝 Contributing

When adding new optimizers or schedulers:

1. Add type to `OptimizerType` or `SchedulerType` enum in `schemas.py`
2. Implement builder method in `builder.py`
3. Add validation logic in `validator.py`
4. Create tests in `tests/optimizer/`
5. Update this README

## 📄 License

Part of AI Calling Agent Training Engine - Enterprise Edition

---

**Phase 4.4.4.5.4 Complete** ✅

For questions or issues, refer to the main project documentation.
