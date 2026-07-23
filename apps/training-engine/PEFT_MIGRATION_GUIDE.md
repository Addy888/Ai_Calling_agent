# PEFT Migration Guide

Guide for integrating PEFT & LoRA into your existing training workflows.

---

## 🎯 Overview

This guide helps you migrate existing fine-tuning workflows to use PEFT adapters for parameter-efficient training.

---

## 📋 Prerequisites

Before migrating to PEFT:

1. ✅ Existing model training pipeline
2. ✅ Model loader configured
3. ✅ Training data prepared
4. ✅ PEFT dependencies installed (`pip install -r requirements.txt`)
5. ✅ PEFT validation passed (`python scripts/validate_peft.py`)

---

## 🔄 Migration Patterns

### Pattern 1: Simple Fine-Tuning → LoRA

**Before (Full Fine-Tuning):**

```python
from transformers import AutoModel, Trainer

# Load model
model = AutoModel.from_pretrained("gpt2")

# Train entire model
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
)
trainer.train()
```

**After (LoRA):**

```python
from transformers import AutoModel, Trainer
from app.peft import peft_factory

# Load model
model = AutoModel.from_pretrained("gpt2")

# Apply LoRA adapter
peft_model, metadata = peft_factory.create_lora_preset(
    model=model,
    model_id="gpt2",
    preset="balanced",
)

# Train only adapter
trainer = Trainer(
    model=peft_model,  # Use PEFT model
    args=training_args,
    train_dataset=train_dataset,
)
trainer.train()

print(f"Training {metadata['trainable_percent']:.2f}% of parameters")
```

**Benefits:**
- 📉 ~99% reduction in trainable parameters
- ⚡ Faster training
- 💾 Less memory usage
- 💰 Lower cost

---

### Pattern 2: Custom Training Loop

**Before:**

```python
import torch
from torch.optim import AdamW

model = load_model()
optimizer = AdamW(model.parameters(), lr=1e-5)

for batch in dataloader:
    outputs = model(**batch)
    loss = outputs.loss
    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
```

**After:**

```python
import torch
from torch.optim import AdamW
from app.peft import peft_factory

model = load_model()

# Apply LoRA
peft_model, metadata = peft_factory.create_lora(
    model=model,
    model_id="my-model",
    rank=16,
    alpha=32,
)

# Optimizer only trains adapter parameters
optimizer = AdamW(peft_model.parameters(), lr=1e-4)  # Higher LR possible

for batch in dataloader:
    outputs = peft_model(**batch)
    loss = outputs.loss
    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
```

---

### Pattern 3: Multi-Task Fine-Tuning

**Before:**

```python
# Train separate models for each task
for task in tasks:
    model = AutoModel.from_pretrained("base-model")
    trainer = Trainer(model=model, train_dataset=task_data[task])
    trainer.train()
    model.save_pretrained(f"model-{task}")
```

**After:**

```python
from app.peft import peft_factory

# Single base model, multiple adapters
base_model = AutoModel.from_pretrained("base-model")

for task in tasks:
    # Create task-specific adapter
    peft_model, metadata = peft_factory.create_lora(
        model=base_model,
        model_id="base-model",
        adapter_name=f"adapter-{task}",
        rank=8,
        alpha=16,
    )
    
    trainer = Trainer(model=peft_model, train_dataset=task_data[task])
    trainer.train()
    
    # Save only adapter (few MB vs GBs)
    peft_model.save_pretrained(f"adapter-{task}")
```

**Benefits:**
- 💾 Save 100x storage (adapters are ~1-10MB)
- 🔄 Share base model across tasks
- 🚀 Deploy multiple adapters efficiently

---

## 🎨 Integration with Training Executor

### Option 1: Training Executor API

```python
from app.training_executor import training_executor
from app.peft.schemas import CreatePEFTRequest, LoRAConfigRequest

# Create training job with PEFT
job_id = training_executor.submit_job(
    job_config={
        "model_id": "gpt2",
        "dataset_id": "my-dataset",
        "use_peft": True,
        "peft_config": {
            "adapter_type": "lora",
            "lora_config": {
                "r": 8,
                "lora_alpha": 16,
                "target_modules": ["c_attn", "c_proj"],
            }
        }
    }
)
```

### Option 2: Direct Integration

```python
from app.training_executor import training_executor
from app.peft import peft_manager
from app.model.loader import model_loader

# Load model
model = model_loader.load_model("gpt2")

# Apply PEFT
request = CreatePEFTRequest(
    model_id="gpt2",
    adapter_type="lora",
    lora_config=LoRAConfigRequest(r=8, lora_alpha=16),
)
peft_model, metadata = peft_manager.create_adapter(model, request)

# Continue with training executor
job = training_executor.create_training_job(
    model=peft_model,
    dataset=dataset,
    config=training_config,
)
```

---

## 🔧 Configuration Migration

### Step 1: Determine Model Size

```python
from app.peft import target_module_detector

model = load_model()
stats = target_module_detector.get_module_stats(model)

print(f"Total parameters: {sum(p.numel() for p in model.parameters()):,}")
print(f"Linear modules: {stats['linear_modules']}")
```

### Step 2: Choose Configuration

| Your Model | Recommended Preset | Rank | Alpha |
|------------|-------------------|------|-------|
| < 1B params | `fast` | 4-8 | 8-16 |
| 1-7B params | `balanced` | 8-16 | 16-32 |
| 7-13B params | `balanced` | 16-32 | 32-64 |
| > 13B params | `quality` | 32-64 | 64-128 |

### Step 3: Apply Configuration

```python
from app.peft import peft_factory

# Using preset
peft_model, _ = peft_factory.create_lora_preset(
    model, "model-id", preset="balanced"
)

# Or custom
peft_model, _ = peft_factory.create_lora(
    model, "model-id", rank=16, alpha=32
)
```

---

## 📊 Performance Comparison

### Before Migration (Full Fine-Tuning)

| Model | Trainable Params | Memory | Time/Epoch | Storage |
|-------|-----------------|---------|------------|---------|
| GPT-2 (125M) | 125M | 2GB | 10 min | 500MB |
| GPT-2 Large (774M) | 774M | 12GB | 60 min | 3GB |
| LLaMA-7B | 7B | 28GB | 480 min | 26GB |

### After Migration (LoRA r=16)

| Model | Trainable Params | Memory | Time/Epoch | Storage |
|-------|-----------------|---------|------------|---------|
| GPT-2 (125M) | 400K (0.3%) | 1GB | 4 min | 2MB |
| GPT-2 Large (774M) | 2.4M (0.3%) | 6GB | 24 min | 10MB |
| LLaMA-7B | 25M (0.4%) | 14GB | 200 min | 100MB |

**Improvements:**
- 📉 99%+ reduction in trainable parameters
- 💾 50%+ memory savings
- ⚡ 2-3x faster training
- 💰 100-1000x smaller model files

---

## 🚨 Common Migration Issues

### Issue 1: "No modules matched target_modules"

**Problem:**
```python
# Error: No matching modules found
peft_model, _ = peft_factory.create_lora(
    model, "model-id", target_modules=["wrong_module"]
)
```

**Solution:**
```python
from app.peft import target_module_detector

# Auto-detect first
detected = target_module_detector.auto_detect_target_modules(model)
print(f"Available: {detected}")

# Use detected modules
peft_model, _ = peft_factory.create_lora(
    model, "model-id", target_modules=detected
)
```

### Issue 2: Learning Rate Too Low

**Problem:**
```python
# Same LR as full fine-tuning (too low for adapters)
optimizer = AdamW(peft_model.parameters(), lr=1e-5)
```

**Solution:**
```python
# Use 5-10x higher learning rate for adapters
optimizer = AdamW(peft_model.parameters(), lr=5e-4)  # Or 1e-3
```

### Issue 3: Validation Failing

**Problem:**
```python
# Environment not validated
peft_model, _ = peft_factory.create_lora(model, "model-id")
# CompatibilityException: PEFT version below minimum
```

**Solution:**
```bash
# Upgrade dependencies
pip install --upgrade peft transformers torch

# Validate
python scripts/validate_peft.py
```

---

## 🎯 Best Practices

### 1. Always Validate First

```python
from app.peft import peft_validator

# Validate environment
peft_validator.validate_environment()

# Validate model
peft_validator.validate_model(model)

# Then create adapter
peft_model, _ = peft_factory.create_lora(model, "model-id")
```

### 2. Start Small, Scale Up

```python
# Start with fast preset
peft_model, metadata = peft_factory.create_lora_preset(
    model, "model-id", preset="fast"
)

# If quality insufficient, increase rank
if quality_not_good_enough:
    peft_model, metadata = peft_factory.create_lora(
        model, "model-id", rank=32, alpha=64
    )
```

### 3. Monitor Trainable Parameters

```python
peft_model, metadata = peft_factory.create_lora(model, "model-id")

print(f"Trainable: {metadata['trainable_params']:,}")
print(f"Frozen: {metadata['frozen_params']:,}")
print(f"Percentage: {metadata['trainable_percent']:.2f}%")

# Target: 0.1% - 10% for best efficiency
assert 0.1 <= metadata['trainable_percent'] <= 10.0
```

### 4. Use Presets for Common Cases

```python
# Don't overthink it - use presets
peft_model, _ = peft_factory.create_lora_preset(
    model, "model-id", preset="balanced"  # Good for 90% of cases
)
```

---

## 🔄 Gradual Migration Strategy

### Phase 1: Pilot (Week 1)

1. Select one small model/task
2. Apply LoRA with preset="fast"
3. Compare quality vs full fine-tuning
4. Measure improvements

### Phase 2: Expansion (Week 2-3)

1. Migrate 3-5 more tasks
2. Experiment with different presets
3. Fine-tune configurations
4. Document best practices

### Phase 3: Full Migration (Week 4+)

1. Migrate remaining tasks
2. Update training pipelines
3. Update deployment processes
4. Train team on PEFT usage

---

## 📝 Checklist

Before going to production:

- [ ] Validate PEFT installation (`python scripts/validate_peft.py`)
- [ ] Test with small dataset first
- [ ] Verify trainable parameter count is reasonable (0.1-10%)
- [ ] Compare quality with full fine-tuning baseline
- [ ] Monitor training metrics (loss, accuracy)
- [ ] Test inference with adapted model
- [ ] Document adapter configurations
- [ ] Update deployment processes for adapters
- [ ] Train team on PEFT workflows

---

## 🆘 Getting Help

### Health Check
```bash
curl http://localhost:8000/api/v1/peft/health
```

### Validation Report
```python
from app.peft import peft_validator

report = peft_validator.get_validation_report(model, config)
print(f"Valid: {report['valid']}")
print(f"Issues: {report['issues']}")
```

### Module Detection
```python
from app.peft import target_module_detector

stats = target_module_detector.get_module_stats(model)
print(f"Detected patterns: {stats['detected_patterns']}")
```

---

## 📚 Additional Resources

- **[PEFT_QUICKSTART.md](./PEFT_QUICKSTART.md)** - Quick start guide
- **[PHASE_4_4_4_5_3_COMPLETE.md](./PHASE_4_4_4_5_3_COMPLETE.md)** - Complete documentation
- **[app/peft/README.md](./app/peft/README.md)** - Module reference
- **API Docs**: `http://localhost:8000/api/v1/docs`

---

## ✅ Success Criteria

Your migration is successful when:

✅ Training completes without errors
✅ Model quality meets requirements
✅ Training time reduced significantly
✅ Memory usage reduced significantly  
✅ Model storage reduced significantly
✅ Team comfortable with PEFT workflow
✅ Documentation updated
✅ Deployment pipeline updated

---

**Happy migrating! 🚀**

*PEFT Migration Guide - Version 1.0.0*
