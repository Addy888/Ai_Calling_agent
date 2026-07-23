# HuggingFace Trainer Integration - Quick Start Guide

## 📋 Overview

The **HuggingFace Trainer Integration** (Phase 4.4.4.5.2) provides production-ready integration with HuggingFace Transformers library for actual model training.

---

## 🚀 Quick Usage

### 1. Using Training Executor (Recommended)

The simplest way is to use the Training Executor which handles everything:

```python
from app.training_executor.executor import training_executor
from app.training_executor.factory import TrainingConfigFactory

# Create configuration
config = TrainingConfigFactory.create_full_finetune_config(
    num_epochs=3,
    learning_rate=2e-5,
    batch_size=4,
)

# Submit job
job = await training_executor.submit_job(
    model_id="model-123",
    dataset_id="dataset-456",
    config=config,
    company_id="company-789",
)

# Start training (automatic HF Trainer integration)
await training_executor.start_training(job.job_id)
```

### 2. Using Trainer Directly

For more control, use the trainer API directly:

```python
from app.trainer.trainer_factory import trainer_factory
from app.trainer.trainer_runtime import trainer_runtime_manager

# Get training context (from executor or manually)
context = ...  # TrainingContext

# Create trainer
trainer = trainer_factory.create_trainer(context)

# Create runtime
runtime = trainer_runtime_manager.create_runtime(job_id)

# Initialize
await runtime.initialize(trainer, context)

# Start training
result = await runtime.start_training()

print(f"Training completed: {result['duration_seconds']}s")
print(f"Model saved to: {result['model_path']}")
```

---

## 🌐 REST API Usage

### 1. Create Trainer (Validate Configuration)

```bash
curl -X POST http://localhost:8000/api/v1/trainer/create \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "job-123",
    "trainer_type": "hf_trainer"
  }'
```

### 2. Initialize Trainer

```bash
curl -X POST http://localhost:8000/api/v1/trainer/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "job-123"
  }'
```

### 3. Start Training

```bash
curl -X POST http://localhost:8000/api/v1/trainer/start \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "job-123"
  }'
```

### 4. Check Status

```bash
curl http://localhost:8000/api/v1/trainer/status/job-123
```

### 5. Get Runtime Info

```bash
curl http://localhost:8000/api/v1/trainer/runtime/job-123
```

### 6. Check Health

```bash
curl http://localhost:8000/api/v1/trainer/health
```

---

## 🎯 Training Configuration

### Basic Configuration

```python
from app.training_executor.models import TrainingConfig

config = TrainingConfig(
    # Training
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    
    # Learning rate
    learning_rate=2e-5,
    weight_decay=0.01,
    warmup_ratio=0.03,
    
    # Precision
    fp16=True,
    
    # Gradient
    max_grad_norm=1.0,
    gradient_checkpointing=True,
    
    # Logging
    logging_steps=10,
    eval_steps=100,
    save_steps=100,
)
```

### Full Fine-Tuning

```python
from app.training_executor.factory import TrainingConfigFactory

config = TrainingConfigFactory.create_full_finetune_config(
    num_epochs=3,
    learning_rate=2e-5,
    batch_size=4,
    max_seq_length=512,
)
```

---

## 📊 Event Tracking

Subscribe to training events:

```python
from app.events import event_bus

# Training started
async def on_training_started(event):
    print(f"Training started: {event.data}")

event_bus.subscribe("trainer_training_started", on_training_started)

# Training progress
async def on_step(event):
    progress = event.data.get("progress_percentage")
    print(f"Progress: {progress:.1f}%")

event_bus.subscribe("trainer_step", on_step)

# Training completed
async def on_training_finished(event):
    duration = event.data.get("duration_seconds")
    print(f"Training finished in {duration}s")

event_bus.subscribe("trainer_training_finished", on_training_finished)
```

---

## 🎓 Components

### 1. TrainerBuilder
Constructs HF Trainer with all components:
- Loads tokenizer (AutoTokenizer)
- Loads dataset (HuggingFace datasets)
- Loads model (AutoModelForCausalLM)
- Creates data collator
- Builds training arguments
- Creates callbacks

### 2. HFTrainerWrapper
Wraps HuggingFace Trainer:
- Async/sync bridge
- Event emission
- Error handling
- Status tracking

### 3. TrainerFactory
Creates trainers:
- Dependency injection
- Compatibility validation
- Type-based creation

### 4. TrainerRuntime
Manages lifecycle:
- Runtime state
- Training session
- Graceful shutdown

---

## 🔍 Validation

All components are validated before training:

```python
from app.trainer.trainer_validation import trainer_validator

# Validate context
trainer_validator.validate_context(context)

# Validate components
trainer_validator.validate_dataset(dataset)
trainer_validator.validate_tokenizer(tokenizer)
trainer_validator.validate_model(model)
```

---

## 🏥 Health Monitoring

```python
from app.trainer.health import trainer_health_checker

# Check health
health = await trainer_health_checker.check_health()

print(f"Status: {health['status']}")
print(f"Active trainers: {health['active_trainers']}")
print(f"Total trainers: {health['total_trainers']}")

# Get statistics
stats = await trainer_health_checker.get_runtime_stats()
print(f"Runtime states: {stats['states']}")
```

---

## 🔧 Customization

### Custom Callbacks

```python
from transformers import TrainerCallback

class MyCallback(TrainerCallback):
    def on_step_end(self, args, state, control, **kwargs):
        print(f"Step {state.global_step} completed")

# Add to trainer builder
callbacks = [MyCallback()]
```

### Custom TrainingArguments

```python
from app.trainer.training_arguments import training_arguments_builder

# Build with custom output dir
args = training_arguments_builder.build(
    context,
    output_dir="/custom/output/path"
)
```

---

## 🎯 Supported Training Types

Phase 4.4.4.5.2 supports:

1. **FULL_FINE_TUNE** - Full model fine-tuning
2. **INSTRUCTION_TUNING** - Instruction following
3. **CONVERSATION_TUNING** - Conversational AI
4. **DOMAIN_ADAPTATION** - Domain-specific adaptation

---

## ⚠️ Important Notes

### What's Included ✅
- ✅ Real HuggingFace Trainer
- ✅ Full model fine-tuning
- ✅ AutoModelForCausalLM
- ✅ AutoTokenizer
- ✅ DataCollatorForLanguageModeling
- ✅ HuggingFace datasets

### What's NOT Included ❌
- ❌ LoRA/PEFT (Phase 4.4.4.5.3)
- ❌ QLoRA (Phase 4.4.4.5.3)
- ❌ Custom optimizers (Phase 4.4.4.5.3)
- ❌ Custom schedulers (Phase 4.4.4.5.3)
- ❌ Advanced checkpointing (Phase 4.4.4.5.4)
- ❌ Metrics system (Phase 4.4.4.5.4)

---

## 📚 API Documentation

Access Swagger docs at:
```
http://localhost:8000/api/v1/docs
```

Trainer endpoints are under the **Trainer** tag.

---

## 🔮 Next Steps

After Phase 4.4.4.5.2, implement:

### Phase 4.4.4.5.3 - LoRA/PEFT
- PEFT library integration
- LoRA configuration
- QLoRA support
- Adapter management

### Phase 4.4.4.5.4 - Checkpoints & Metrics
- Advanced checkpoint management
- Metrics tracking
- Model evaluation

---

## 🎉 Summary

Phase 4.4.4.5.2 provides:

✅ Real HuggingFace Trainer integration  
✅ Production-ready wrapper  
✅ Async/sync bridge  
✅ Event-driven architecture  
✅ 6 REST API endpoints  
✅ Complete validation  
✅ Runtime management  
✅ Health monitoring  

**Ready for production use!**

---

**Version**: 1.0.0  
**Date**: July 23, 2026  
**Status**: ✅ PRODUCTION READY
