# PEFT & LoRA Quick Start Guide

Get started with the Enterprise PEFT & LoRA Integration Engine in minutes.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install peft>=0.7.0 transformers>=4.30.0 torch>=2.0.0
```

### 2. Start the Training Engine

```bash
cd apps/training-engine
python main.py
```

The server will start at `http://localhost:8000`

### 3. Check PEFT Health

```bash
curl http://localhost:8000/api/v1/peft/health
```

Expected response:
```json
{
  "status": "healthy",
  "healthy": true,
  "active_adapters": 0,
  "supported_types": ["lora"],
  "peft_version": "0.7.0",
  "timestamp": "2026-07-23T..."
}
```

---

## 📖 Basic Usage

### Create Your First LoRA Adapter

#### Using Python

```python
from app.peft import peft_factory
from transformers import AutoModel

# Load your model
model = AutoModel.from_pretrained("gpt2")

# Create LoRA adapter (simple)
peft_model, metadata = peft_factory.create_lora(
    model=model,
    model_id="gpt2",
    rank=8,
    alpha=16,
)

print(f"✅ Adapter created: {metadata['adapter_name']}")
print(f"📊 Trainable params: {metadata['trainable_params']:,} ({metadata['trainable_percent']:.2f}%)")
```

#### Using REST API

```bash
curl -X POST http://localhost:8000/api/v1/peft/create \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "gpt2",
    "adapter_type": "lora",
    "lora_config": {
      "r": 8,
      "lora_alpha": 16,
      "lora_dropout": 0.1,
      "task_type": "CAUSAL_LM"
    }
  }'
```

---

## 🎯 Common Use Cases

### Use Case 1: Fast Adapter with Auto-Detection

```python
from app.peft import peft_factory

# Fastest way to create a LoRA adapter
peft_model, metadata = peft_factory.create_lora_preset(
    model=model,
    model_id="gpt2",
    preset="fast",  # Options: fast, balanced, quality
)
```

### Use Case 2: Custom Target Modules

```python
from app.peft import peft_manager
from app.peft.schemas import CreatePEFTRequest, LoRAConfigRequest

request = CreatePEFTRequest(
    model_id="gpt2",
    adapter_name="custom-adapter",
    lora_config=LoRAConfigRequest(
        r=16,
        lora_alpha=32,
        target_modules=["c_attn", "c_proj", "c_fc"],  # Specify modules
    )
)

peft_model, metadata = peft_manager.create_adapter(model, request)
```

### Use Case 3: Detect Target Modules First

```python
from app.peft import target_module_detector

# See what modules are available
stats = target_module_detector.get_module_stats(model)
print("Available modules:", stats["detected_patterns"])

# Get recommendations
recommended = target_module_detector.recommend_target_modules(
    model, efficiency="balanced"
)
print("Recommended:", recommended["recommended"])

# Use recommendations
peft_model, metadata = peft_factory.create_lora(
    model=model,
    model_id="gpt2",
    target_modules=recommended["recommended"],
)
```

### Use Case 4: Validate Before Creating

```python
from app.peft import peft_validator

# Validate environment
try:
    peft_validator.validate_environment()
    print("✅ Environment OK")
except Exception as e:
    print(f"❌ Environment issue: {e}")

# Validate model
try:
    peft_validator.validate_model(model)
    print("✅ Model compatible")
except Exception as e:
    print(f"❌ Model issue: {e}")

# Get full validation report
config = {
    "r": 8,
    "lora_alpha": 16,
    "target_modules": ["c_attn"],
}

report = peft_validator.get_validation_report(model, config)
if report["valid"]:
    print("✅ Configuration valid")
else:
    print(f"❌ Issues: {report['issues']}")
```

---

## 🔧 Advanced Configuration

### Fine-Tune All Settings

```python
from app.peft.schemas import (
    CreatePEFTRequest,
    LoRAConfigRequest,
    TaskType,
    LoRABias,
)

request = CreatePEFTRequest(
    model_id="llama-7b",
    adapter_name="fine-tuned-adapter",
    lora_config=LoRAConfigRequest(
        r=32,
        lora_alpha=64,
        lora_dropout=0.05,
        bias=LoRABias.NONE,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj"],
        modules_to_save=["embed_tokens", "lm_head"],
        task_type=TaskType.CAUSAL_LM,
        inference_mode=False,
        fan_in_fan_out=False,
    )
)

peft_model, metadata = peft_manager.create_adapter(model, request)
```

### Optimize for Model Size

```python
# Automatically adjust hyperparameters based on model size
peft_model, metadata = peft_factory.create_lora_for_model_size(
    model=model,
    model_id="llama-13b",
    model_size="large",  # Options: small, base, large, xlarge
)
```

---

## 📊 Adapter Management

### List All Adapters

```python
from app.peft import adapter_runtime

adapters = adapter_runtime.list_adapters()
for adapter_data in adapters:
    print(f"- {adapter_data['adapter_name']}: {adapter_data['trainable_percent']:.2f}%")
```

### Get Adapter Details

```python
# Get comprehensive summary
summary = adapter_runtime.get_adapter_summary(adapter_id)
print(f"Adapter: {summary['adapter_name']}")
print(f"Active: {summary['is_active']}")
print(f"Trainable: {summary['trainable_params']:,}")
```

### Check Active Adapters

```python
# Get all active adapters
active = adapter_runtime.get_active_model_adapters()
for model_id, adapter_id in active.items():
    print(f"Model {model_id} using adapter {adapter_id}")
```

---

## 🌐 REST API Examples

### Create Adapter

```bash
curl -X POST http://localhost:8000/api/v1/peft/create \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "gpt2",
    "adapter_type": "lora",
    "adapter_name": "my-adapter",
    "lora_config": {
      "r": 8,
      "lora_alpha": 16
    }
  }'
```

### List Adapters

```bash
# All adapters
curl http://localhost:8000/api/v1/peft/list

# Filter by model
curl "http://localhost:8000/api/v1/peft/list?model_id=gpt2"

# Only active adapters
curl "http://localhost:8000/api/v1/peft/list?active_only=true"
```

### Get Adapter

```bash
curl http://localhost:8000/api/v1/peft/{adapter_id}
```

### Detect Target Modules

```bash
curl http://localhost:8000/api/v1/peft/detect-modules/gpt2
```

### Validate Configuration

```bash
curl -X POST http://localhost:8000/api/v1/peft/validate \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "gpt2",
    "adapter_type": "lora",
    "config": {
      "r": 8,
      "lora_alpha": 16,
      "target_modules": ["c_attn"]
    }
  }'
```

---

## 🎨 Presets

### Fast Preset (Speed Optimized)
```python
peft_factory.create_lora_preset(model, "gpt2", preset="fast")
# - Rank: 4
# - Alpha: 8
# - Target: minimal modules
```

### Balanced Preset (Recommended)
```python
peft_factory.create_lora_preset(model, "gpt2", preset="balanced")
# - Rank: 16
# - Alpha: 32
# - Target: attention layers
```

### Quality Preset (Performance Optimized)
```python
peft_factory.create_lora_preset(model, "gpt2", preset="quality")
# - Rank: 64
# - Alpha: 128
# - Target: all major layers
```

---

## 📈 Monitoring

### Check PEFT Health

```python
import requests

response = requests.get("http://localhost:8000/api/v1/peft/health")
health = response.json()

if health["healthy"]:
    print(f"✅ PEFT is healthy")
    print(f"Active adapters: {health['active_adapters']}")
    print(f"PEFT version: {health['peft_version']}")
else:
    print(f"❌ PEFT is unhealthy: {health['status']}")
```

### Get Runtime Statistics

```python
from app.peft import adapter_runtime

stats = adapter_runtime.get_runtime_stats()
print(f"Total adapters: {stats['total_adapters']}")
print(f"Active adapters: {stats['active_adapters']}")
print(f"Adapter types: {stats['adapter_types']}")
```

---

## 🐛 Debugging

### Enable Detailed Logging

```python
import logging

# Set PEFT logger to DEBUG
logging.getLogger("app.peft").setLevel(logging.DEBUG)

# Now you'll see detailed logs
peft_model, metadata = peft_factory.create_lora(model, "gpt2")
```

### Common Issues & Solutions

#### Issue: "No modules matched target_modules"

```python
# Solution: Auto-detect first
from app.peft import target_module_detector

detected = target_module_detector.auto_detect_target_modules(model)
print(f"Available modules: {detected}")

# Use detected modules
peft_model, _ = peft_factory.create_lora(
    model, "gpt2", target_modules=detected
)
```

#### Issue: "Environment validation failed"

```bash
# Check versions
pip show peft transformers torch

# Upgrade if needed
pip install --upgrade peft transformers torch
```

#### Issue: "Model not compatible"

```python
# Check model structure
for name, module in model.named_modules():
    print(name, type(module).__name__)

# Ensure model has Linear layers
from app.peft import peft_validator
peft_validator.validate_model(model)
```

---

## 🧪 Testing Your Setup

```python
# Quick test script
from transformers import AutoModel
from app.peft import peft_factory

# 1. Load model
print("Loading model...")
model = AutoModel.from_pretrained("gpt2")

# 2. Create adapter
print("Creating LoRA adapter...")
peft_model, metadata = peft_factory.create_lora_preset(
    model=model,
    model_id="gpt2",
    preset="balanced",
)

# 3. Verify
print(f"✅ Success!")
print(f"Adapter: {metadata['adapter_name']}")
print(f"Trainable: {metadata['trainable_params']:,} ({metadata['trainable_percent']:.2f}%)")
print(f"Target modules: {metadata['target_modules']}")
```

---

## 📚 Next Steps

- Read [PHASE_4_4_4_5_3_COMPLETE.md](./PHASE_4_4_4_5_3_COMPLETE.md) for full documentation
- Check [tests/peft/](./tests/peft/) for more examples
- Explore the API at `http://localhost:8000/api/v1/docs`
- Review [app/peft/schemas.py](./app/peft/schemas.py) for all options

---

## 💡 Tips

1. **Start with presets** - They're optimized for common use cases
2. **Use auto-detection** - Let the system find the right modules
3. **Validate first** - Check configuration before creating adapters
4. **Monitor trainable %** - Target 1-10% for best efficiency
5. **Test with health endpoint** - Verify system status regularly

---

## 🎓 Best Practices

### For Small Models (<1B parameters)
```python
peft_factory.create_lora(model, "model-id", rank=4, alpha=8)
```

### For Medium Models (1-7B parameters)
```python
peft_factory.create_lora(model, "model-id", rank=16, alpha=32)
```

### For Large Models (7-13B parameters)
```python
peft_factory.create_lora(model, "model-id", rank=32, alpha=64)
```

### For XLarge Models (>13B parameters)
```python
peft_factory.create_lora(model, "model-id", rank=64, alpha=128)
```

---

**Ready to get started? Load a model and create your first LoRA adapter! 🚀**

