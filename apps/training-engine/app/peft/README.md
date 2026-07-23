# Enterprise PEFT & LoRA Integration Engine

Production-ready Parameter-Efficient Fine-Tuning (PEFT) integration for the AI Training Engine.

## 📁 Module Structure

```
app/peft/
├── __init__.py              # Main exports
├── manager.py               # PEFT Manager (core orchestration)
├── factory.py               # PEFT Factory (convenient creation)
├── validator.py             # Validation layer
├── api.py                   # REST API endpoints
├── schemas.py               # Pydantic models
├── interfaces.py            # Abstract interfaces
├── exceptions.py            # PEFT exceptions
│
├── lora/                    # LoRA components
│   ├── __init__.py
│   ├── builder.py          # LoRA Builder
│   ├── config.py           # LoRA Configuration Factory
│   └── detector.py         # Target Module Detector
│
└── adapter/                 # Adapter management
    ├── __init__.py
    ├── manager.py          # Adapter Manager
    ├── registry.py         # Adapter Registry
    └── runtime.py          # Adapter Runtime
```

## 🎯 Core Components

### PEFT Manager (`manager.py`)
Central orchestration for PEFT operations.

```python
from app.peft import peft_manager

peft_model, metadata = peft_manager.create_adapter(model, request)
```

**Responsibilities:**
- Load and validate PEFT configurations
- Apply/remove adapters
- Coordinate between components
- Generate metadata

### PEFT Factory (`factory.py`)
Convenient methods for creating adapters.

```python
from app.peft import peft_factory

# Quick creation
peft_model, metadata = peft_factory.create_lora(
    model, "gpt2", rank=8, alpha=16
)

# Use presets
peft_model, metadata = peft_factory.create_lora_preset(
    model, "gpt2", preset="balanced"
)
```

**Presets:**
- `fast`: Rank 4, Alpha 8 (speed optimized)
- `balanced`: Rank 16, Alpha 32 (recommended)
- `quality`: Rank 64, Alpha 128 (performance optimized)

### LoRA Builder (`lora/builder.py`)
Builds and applies LoRA configurations.

```python
from app.peft import lora_builder

# Build config
config = lora_builder.build_config(params, model=model)

# Apply LoRA
peft_model = lora_builder.apply_lora(model, config)

# Build and apply
peft_model, metadata = lora_builder.build_and_apply(
    model, params, adapter_name="my-adapter"
)
```

### Target Module Detector (`lora/detector.py`)
Detects and validates target modules.

```python
from app.peft import target_module_detector

# Auto-detect
detected = target_module_detector.auto_detect_target_modules(model)

# Get stats
stats = target_module_detector.get_module_stats(model)

# Get recommendations
recommended = target_module_detector.recommend_target_modules(
    model, efficiency="balanced"
)
```

**Supported Patterns:**
- Attention: `q_proj`, `k_proj`, `v_proj`, `o_proj`
- MLP: `gate_proj`, `up_proj`, `down_proj`
- GPT-style: `c_attn`, `c_proj`, `c_fc`
- Feed-forward: `fc1`, `fc2`

### PEFT Validator (`validator.py`)
Validates environment, models, and configurations.

```python
from app.peft import peft_validator

# Validate environment
peft_validator.validate_environment()

# Validate model
peft_validator.validate_model(model)

# Validate config
peft_validator.validate_lora_config(config)

# Get full report
report = peft_validator.get_validation_report(model, config)
```

### Adapter Manager (`adapter/manager.py`)
Manages adapter lifecycle and metadata.

```python
from app.peft import adapter_manager

# Register adapter
adapter_manager.register_adapter(metadata, model_id="gpt2")

# Get adapter
metadata = adapter_manager.get_adapter(adapter_id)

# List adapters
adapters = adapter_manager.list_adapters(model_id="gpt2")

# Set active
adapter_manager.set_active_adapter("gpt2", adapter_id)
```

### Adapter Runtime (`adapter/runtime.py`)
Runtime state and query operations.

```python
from app.peft import adapter_runtime

# Get metadata
metadata = adapter_runtime.get_metadata(adapter_id)

# List adapters
adapters = adapter_runtime.list_adapters(active_only=True)

# Get summary
summary = adapter_runtime.get_adapter_summary(adapter_id)

# Get stats
stats = adapter_runtime.get_runtime_stats()
```

## 🔌 REST API

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/peft/create` | Create PEFT adapter |
| POST | `/peft/apply` | Apply adapter to model |
| POST | `/peft/remove` | Remove adapter |
| POST | `/peft/validate` | Validate configuration |
| GET | `/peft/list` | List all adapters |
| GET | `/peft/{id}` | Get adapter by ID |
| GET | `/peft/metadata/{id}` | Get detailed metadata |
| GET | `/peft/detect-modules/{model_id}` | Detect target modules |
| GET | `/peft/health` | Health check |

### Example: Create Adapter

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
      "target_modules": ["c_attn", "c_proj"]
    }
  }'
```

## 📊 Schemas

### Request Schemas
- `LoRAConfigRequest`: LoRA configuration
- `CreatePEFTRequest`: Create adapter
- `ApplyPEFTRequest`: Apply adapter
- `RemovePEFTRequest`: Remove adapter
- `ValidatePEFTRequest`: Validate config

### Response Schemas
- `AdapterMetadata`: Complete metadata
- `PEFTResponse`: Standard response
- `AdapterListResponse`: List of adapters
- `ValidationResult`: Validation report
- `PEFTHealthResponse`: Health status

### Enums
- `AdapterType`: LORA, ADALORA, QLORA, IA3, PREFIX_TUNING, PROMPT_TUNING
- `TaskType`: CAUSAL_LM, SEQ_2_SEQ_LM, SEQ_CLS, TOKEN_CLS, QUESTION_ANS
- `LoRABias`: NONE, ALL, LORA_ONLY

## ⚠️ Exceptions

```python
PEFTException                    # Base exception
├── LoRAException               # LoRA-specific
├── AdapterException            # Adapter management
│   ├── AdapterNotFoundError   # Adapter not found
│   └── AdapterAlreadyExistsError  # Duplicate adapter
├── ConfigurationException      # Configuration error
│   └── InvalidTargetModulesError  # Invalid modules
└── CompatibilityException      # Compatibility error
    └── ModelNotCompatibleError  # Model incompatible
```

## 📡 Events

Events emitted by PEFT components:

- `adapter_created`: Adapter creation completed
- `adapter_applied`: Adapter applied to model
- `adapter_removed`: Adapter removed
- `adapter_registered`: Adapter registered
- `adapter_unregistered`: Adapter unregistered
- `adapter_activated`: Adapter set as active
- `adapter_deactivated`: Adapter deactivated
- `lora_config_created`: LoRA config generated
- `lora_adapter_applied`: LoRA adapter applied

## 🎨 Usage Patterns

### Pattern 1: Quick Start

```python
from app.peft import peft_factory
from transformers import AutoModel

model = AutoModel.from_pretrained("gpt2")

peft_model, metadata = peft_factory.create_lora_preset(
    model=model,
    model_id="gpt2",
    preset="balanced",
)
```

### Pattern 2: Custom Configuration

```python
from app.peft import peft_manager
from app.peft.schemas import CreatePEFTRequest, LoRAConfigRequest

request = CreatePEFTRequest(
    model_id="gpt2",
    adapter_name="custom-adapter",
    lora_config=LoRAConfigRequest(
        r=16,
        lora_alpha=32,
        lora_dropout=0.1,
        target_modules=["c_attn", "c_proj"],
    )
)

peft_model, metadata = peft_manager.create_adapter(model, request)
```

### Pattern 3: Auto-Detection

```python
from app.peft import lora_builder

detected = lora_builder.detect_target_modules(model)

peft_model, metadata = lora_builder.build_and_apply(
    model=model,
    params=LoRAConfigRequest(
        r=8,
        lora_alpha=16,
        target_modules=detected,  # Use auto-detected
    )
)
```

### Pattern 4: Validation First

```python
from app.peft import peft_validator

# Validate before creating
report = peft_validator.get_validation_report(model, config)

if report["valid"]:
    peft_model, metadata = peft_manager.create_adapter(model, request)
else:
    print(f"Validation failed: {report['issues']}")
```

## 🧪 Testing

```bash
# All PEFT tests
pytest tests/peft/ -v

# Specific component
pytest tests/peft/test_lora_builder.py -v

# With coverage
pytest tests/peft/ --cov=app.peft --cov-report=html
```

## 📖 Documentation

- [PHASE_4_4_4_5_3_COMPLETE.md](../../PHASE_4_4_4_5_3_COMPLETE.md) - Complete documentation
- [PEFT_QUICKSTART.md](../../PEFT_QUICKSTART.md) - Quick start guide
- [schemas.py](./schemas.py) - API schemas reference

## 🔧 Configuration

### Environment Variables

```bash
# PEFT settings (optional)
PEFT_DEFAULT_RANK=8
PEFT_DEFAULT_ALPHA=16
PEFT_DEFAULT_DROPOUT=0.1
```

### Validation Requirements

- Python >= 3.10
- PEFT >= 0.7.0
- Transformers >= 4.30.0
- PyTorch >= 2.0.0

## 🎯 Best Practices

1. **Use presets** for common use cases
2. **Auto-detect modules** for unfamiliar architectures
3. **Validate first** before creating adapters
4. **Start small** with rank 4-8, scale up if needed
5. **Monitor trainable %** - target 1-10% for efficiency
6. **Set alpha to 2x rank** as a starting point
7. **Test with health endpoint** regularly

## 🚀 Performance Tips

- Lower rank (4-8) = faster training, less memory
- Higher rank (32-64) = better quality, more memory
- Fewer target modules = faster, less capacity
- More target modules = slower, more capacity

## 📞 Support

Check validation reports and logs for detailed error messages:

```python
# Get detailed report
report = peft_validator.get_validation_report(model, config)
print(f"Issues: {report['issues']}")
print(f"Warnings: {report['warnings']}")
```

## ✨ Features

✅ LoRA adapter support
✅ Auto-detection of target modules
✅ Multiple presets (fast, balanced, quality)
✅ Model size optimization
✅ Comprehensive validation
✅ REST API
✅ Event system
✅ Metadata management
✅ Multi-adapter support
✅ Runtime state tracking
✅ Health monitoring

## 🔮 Future Extensions

Architecture ready for:
- AdaLoRA
- QLoRA
- IA3
- Prefix Tuning
- Prompt Tuning

---

**Phase 4.4.4.5.3 - Enterprise PEFT & LoRA Integration Engine**

*Production-ready PEFT integration for the AI Training Engine*
