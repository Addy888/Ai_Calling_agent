# Enterprise Model Loader & Lifecycle Manager

## Overview

The Enterprise Model Loader is a production-ready infrastructure for managing AI models in the AI Calling Agent platform. It provides complete lifecycle management, validation, compatibility checking, and preparation for training workflows.

## Architecture

```
model/
├── __init__.py           # Main exports
├── models.py             # Data models (20+ Pydantic models)
├── exceptions.py         # Custom exceptions
├── loader/               # Model loading engine
├── manager/              # Orchestration layer
├── registry/             # Model registry
├── validator/            # Validation engine
├── compatibility/        # Compatibility checks
├── cache/                # In-memory cache
├── storage/              # File system storage
├── metadata/             # Metadata service
├── pipeline/             # Complete workflow pipeline
├── health/               # Health checks
├── schemas/              # API schemas
└── api.py                # REST API routes
```

## Supported Architectures

- **Llama** (Llama 2, Llama 3)
- **Qwen** (Qwen, Qwen 2)
- **Gemma**
- **Mistral**
- **DeepSeek**
- **Phi** (Phi 2, Phi 3)
- **GPT** (GPT-2, GPT-NeoX)
- **BERT**
- **T5**
- **Custom Company Models**

## Features

### 1. Model Registration
Register models with complete metadata:
- Architecture detection
- Parameter counting
- File validation
- Metadata generation
- Compatibility checks

### 2. Model Lifecycle
Complete lifecycle management:
- **Register** - Add model to registry
- **Load** - Load model into memory
- **Activate** - Set as active model
- **Deactivate** - Unset active status
- **Archive** - Move to archive
- **Delete** - Remove completely

### 3. Validation Engine
Comprehensive validation:
- Model file checks
- Configuration validation
- Tokenizer compatibility
- Vocabulary compatibility
- Architecture compatibility
- Context length validation
- Training readiness

### 4. Compatibility Engine
Check compatibility with:
- Tokenizers
- Datasets
- Training engine
- GPU hardware
- LoRA/PEFT
- Future quantization

### 5. Caching System
Intelligent caching:
- In-memory cache
- Metadata cache
- TTL-based expiration
- Access tracking
- Cache warming

### 6. Storage System
Flexible storage:
- Local file system
- Registry storage
- Metadata storage
- Archive management
- Future cloud support

## REST API Endpoints

### Registration & Management
```
POST   /api/v1/model/register       # Register new model
POST   /api/v1/model/load            # Load model
POST   /api/v1/model/unload          # Unload model
POST   /api/v1/model/activate        # Activate model
POST   /api/v1/model/deactivate      # Deactivate model
DELETE /api/v1/model/{id}            # Delete model
```

### Validation & Health
```
POST   /api/v1/model/validate        # Validate model
POST   /api/v1/model/prepare-training # Prepare for training
GET    /api/v1/model/health/{id}     # Check model health
GET    /api/v1/model/health           # Check system health
```

### Information & Statistics
```
GET    /api/v1/model/list            # List all models
GET    /api/v1/model/{id}            # Get model details
GET    /api/v1/model/status/{id}     # Get model status
GET    /api/v1/model/metadata/{id}   # Get model metadata
GET    /api/v1/model/stats           # Get statistics
```

## Usage Examples

### Register a Model

```python
# Request
POST /api/v1/model/register
{
  "model_path": "./models/llama-7b",
  "model_name": "Llama-7B-Base",
  "architecture": "llama",
  "model_type": "base",
  "version": "1.0.0",
  "description": "Base Llama 7B model",
  "parameter_count": 7000000000,
  "context_length": 4096,
  "vocabulary_size": 32000,
  "supported_languages": ["en"],
  "validate": true,
  "load": false
}

# Response
{
  "success": true,
  "message": "Model registered successfully",
  "data": {
    "model_id": "uuid-here",
    "name": "Llama-7B-Base",
    "status": "registered"
  }
}
```

### Load a Model

```python
POST /api/v1/model/load
{
  "model_id": "uuid-here",
  "load_tokenizer": true,
  "load_config": true,
  "validate": true,
  "use_gpu": false,
  "device": "cpu"
}
```

### Prepare for Training

```python
POST /api/v1/model/prepare-training
{
  "model_id": "uuid-here",
  "tokenizer_id": "tokenizer-uuid",
  "dataset_id": "dataset-uuid"
}

# Response
{
  "model_id": "uuid-here",
  "is_ready": true,
  "readiness": {
    "is_ready": true,
    "checks": {...}
  },
  "compatibility": [
    {
      "component": "tokenizer",
      "compatible": true,
      "status": "compatible"
    }
  ]
}
```

### List Models

```python
GET /api/v1/model/list?architecture=llama&active_only=true

# Response
{
  "total": 3,
  "models": [
    {
      "model_id": "uuid-1",
      "name": "Llama-7B-Base",
      "version": "1.0.0",
      "architecture": "llama",
      "status": "loaded",
      "is_active": true,
      ...
    }
  ]
}
```

## Model Status Flow

```
REGISTERED → LOADING → LOADED → ACTIVE
     ↓          ↓         ↓         ↓
  FAILED    FAILED    INACTIVE   ARCHIVED
```

## Integration with NestJS

The Python Training Engine communicates with NestJS through REST APIs:

```typescript
// NestJS Service
@Injectable()
export class ModelService {
  async registerModel(dto: RegisterModelDto) {
    const response = await fetch(
      'http://localhost:8001/api/v1/model/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      }
    );
    return response.json();
  }
}
```

## Configuration

Models are stored in the configured directory:

```python
# config.py
MODEL_STORAGE_DIR = os.getenv("MODEL_STORAGE_DIR", "./models")
```

Directory structure:
```
models/
├── registry/           # Registry JSON files
├── metadata/           # Metadata JSON files
├── configs/            # Configuration files
└── archive/            # Archived models
```

## Error Handling

Custom exceptions for different scenarios:

- `ModelLoadException` - Model loading errors
- `ModelValidationException` - Validation errors
- `CompatibilityException` - Compatibility errors
- `RegistryException` - Registry errors
- `CacheException` - Cache errors
- `ConfigurationException` - Configuration errors
- `ModelNotFoundException` - Model not found
- `InvalidModelPathException` - Invalid path

## Future Extensions

The architecture is designed for future capabilities:

### Training Extensions
- LoRA adapter support
- QLoRA quantization
- PEFT methods
- Adapter tuning
- Prefix tuning
- Prompt tuning

### Inference Extensions
- Model serving
- Streaming inference
- Batch inference
- Voice AI runtime
- Multi-GPU support
- Distributed inference

### Platform Extensions
- Cloud model storage (S3, Azure, GCS)
- HuggingFace Hub integration
- Enterprise model registry
- Model versioning
- A/B testing support
- Model analytics

## Health Monitoring

### Model Health Check
```python
GET /api/v1/model/health/{model_id}

{
  "model_id": "uuid",
  "healthy": true,
  "checks": {
    "registry": {"exists": true},
    "storage": {"exists": true},
    "cache": {"info_cached": true},
    "status": {"status": "loaded"},
    "files": {"accessible": true}
  },
  "warnings": [],
  "errors": []
}
```

### System Health Check
```python
GET /api/v1/model/health

{
  "healthy": true,
  "components": {
    "registry": {"healthy": true, "total_models": 5},
    "storage": {"healthy": true, "total_registries": 5},
    "cache": {"healthy": true, "total_entries": 3}
  },
  "statistics": {
    "total_models": 5,
    "active_models": 2,
    "loaded_models": 3,
    "failed_models": 0
  }
}
```

## Testing

Run tests:
```bash
# All model tests
pytest tests/model/

# Specific test files
pytest tests/model/test_loader.py
pytest tests/model/test_registry.py
pytest tests/model/test_validator.py
pytest tests/model/test_compatibility.py
pytest tests/model/test_cache.py
pytest tests/model/test_api.py

# With coverage
pytest tests/model/ --cov=app.model --cov-report=html
```

## Security

- JWT Authentication ready
- Internal API key support
- Service authentication ready
- No direct Prisma access
- Secure file path validation
- Input sanitization

## Performance

- Async/await throughout
- In-memory caching
- Lazy loading support
- Efficient file operations
- Minimal memory footprint
- Fast validation checks

## Support

For issues or questions:
1. Check health endpoints
2. Review logs in `logs/training.log`
3. Verify model file structure
4. Check compatibility reports

## Next Steps

After Phase 4.4.4.4:
1. Phase 4.4.4.5 - LoRA/QLoRA Adapter Manager
2. Phase 4.4.4.6 - Training Orchestrator
3. Phase 4.4.4.7 - Evaluation Engine
4. Integration testing with full pipeline
