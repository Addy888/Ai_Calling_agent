# Quick Start - Enterprise Model Loader

## 5-Minute Setup Guide

### Prerequisites
- Python 3.10+
- Training Engine running on port 8001
- Model files accessible on file system

---

## Step 1: Start the Service

```bash
cd apps/training-engine
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Server starts at: `http://localhost:8001`  
API Docs: `http://localhost:8001/api/v1/docs`

---

## Step 2: Check System Health

```bash
curl http://localhost:8001/api/v1/model/health
```

Expected response:
```json
{
  "healthy": true,
  "components": {
    "registry": {"healthy": true, "total_models": 0},
    "storage": {"healthy": true},
    "cache": {"healthy": true}
  },
  "statistics": {
    "total_models": 0,
    "active_models": 0
  }
}
```

---

## Step 3: Register Your First Model

### Option A: Local Llama Model

```bash
curl -X POST http://localhost:8001/api/v1/model/register \
  -H "Content-Type: application/json" \
  -d '{
    "model_path": "./models/llama-2-7b",
    "model_name": "Llama-2-7B",
    "architecture": "llama",
    "model_type": "base",
    "version": "1.0.0",
    "parameter_count": 7000000000,
    "context_length": 4096,
    "vocabulary_size": 32000,
    "supported_languages": ["en"],
    "validate": true,
    "load": false
  }'
```

### Option B: Custom Model

```bash
curl -X POST http://localhost:8001/api/v1/model/register \
  -H "Content-Type: application/json" \
  -d '{
    "model_path": "./models/my-custom-model",
    "model_name": "My-Custom-Model",
    "architecture": "custom",
    "model_type": "fine_tuned",
    "version": "1.0.0",
    "description": "Fine-tuned for customer service",
    "tags": ["customer-service", "voice-ai"],
    "validate": true
  }'
```

Response:
```json
{
  "success": true,
  "message": "Model registered successfully",
  "data": {
    "model_id": "abc-123-def-456",
    "name": "Llama-2-7B",
    "status": "registered"
  }
}
```

**Save the `model_id` for next steps!**

---

## Step 4: View Model Details

```bash
curl http://localhost:8001/api/v1/model/{model_id}
```

Response includes:
- Full specifications
- File information
- Compatibility status
- Training capabilities
- Metadata

---

## Step 5: Validate Model

```bash
curl -X POST http://localhost:8001/api/v1/model/validate?model_id={model_id}
```

Response:
```json
{
  "model_id": "abc-123-def-456",
  "is_valid": true,
  "file_checks": {
    "model_exists": true,
    "config_exists": true
  },
  "config_valid": true,
  "errors": [],
  "warnings": []
}
```

---

## Step 6: Load Model (Optional)

```bash
curl -X POST http://localhost:8001/api/v1/model/load \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "{model_id}",
    "load_tokenizer": true,
    "load_config": true,
    "validate": true,
    "device": "cpu"
  }'
```

---

## Step 7: Activate Model

```bash
curl -X POST http://localhost:8001/api/v1/model/activate?model_id={model_id}
```

Response:
```json
{
  "success": true,
  "message": "Model activated successfully",
  "data": {
    "model_id": "abc-123-def-456",
    "is_active": true
  }
}
```

---

## Step 8: Prepare for Training

```bash
curl -X POST http://localhost:8001/api/v1/model/prepare-training \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "{model_id}",
    "tokenizer_id": "{tokenizer_id}",
    "dataset_id": "{dataset_id}"
  }'
```

Response:
```json
{
  "model_id": "abc-123-def-456",
  "is_ready": true,
  "readiness": {
    "is_ready": true,
    "checks": {
      "model_loaded": true,
      "tokenizer_available": true,
      "configuration_valid": true
    }
  },
  "compatibility": [
    {
      "component": "tokenizer",
      "compatible": true,
      "status": "compatible"
    },
    {
      "component": "dataset",
      "compatible": true,
      "status": "compatible"
    }
  ],
  "errors": [],
  "warnings": []
}
```

✅ **Your model is ready for training!**

---

## Common Operations

### List All Models
```bash
curl http://localhost:8001/api/v1/model/list
```

### Filter by Architecture
```bash
curl http://localhost:8001/api/v1/model/list?architecture=llama
```

### Get Active Models Only
```bash
curl http://localhost:8001/api/v1/model/list?active_only=true
```

### Get Model Status
```bash
curl http://localhost:8001/api/v1/model/status/{model_id}
```

### Get Model Metadata
```bash
curl http://localhost:8001/api/v1/model/metadata/{model_id}
```

### Get Statistics
```bash
curl http://localhost:8001/api/v1/model/stats
```

### Deactivate Model
```bash
curl -X POST http://localhost:8001/api/v1/model/deactivate?model_id={model_id}
```

### Unload Model
```bash
curl -X POST http://localhost:8001/api/v1/model/unload?model_id={model_id}
```

### Delete Model
```bash
curl -X DELETE http://localhost:8001/api/v1/model/{model_id}
```

---

## Python Client Example

```python
import requests

BASE_URL = "http://localhost:8001/api/v1"

# Register model
response = requests.post(
    f"{BASE_URL}/model/register",
    json={
        "model_path": "./models/llama-2-7b",
        "model_name": "Llama-2-7B",
        "architecture": "llama",
        "validate": True,
    }
)

model_id = response.json()["data"]["model_id"]
print(f"Model registered: {model_id}")

# Validate
response = requests.post(
    f"{BASE_URL}/model/validate",
    params={"model_id": model_id}
)
print(f"Valid: {response.json()['is_valid']}")

# Activate
response = requests.post(
    f"{BASE_URL}/model/activate",
    params={"model_id": model_id}
)
print(f"Activated: {response.json()['success']}")

# Get details
response = requests.get(f"{BASE_URL}/model/{model_id}")
model = response.json()
print(f"Model: {model['name']}")
print(f"Status: {model['status']}")
print(f"Parameters: {model['parameter_count']}")
```

---

## TypeScript/NestJS Integration

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class ModelService {
  private readonly apiUrl = 'http://localhost:8001/api/v1/model';

  async registerModel(data: RegisterModelDto) {
    const response = await fetch(`${this.apiUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getModel(modelId: string) {
    const response = await fetch(`${this.apiUrl}/${modelId}`);
    return response.json();
  }

  async activateModel(modelId: string) {
    const response = await fetch(
      `${this.apiUrl}/activate?model_id=${modelId}`,
      { method: 'POST' }
    );
    return response.json();
  }

  async listModels(filters?: {
    architecture?: string;
    activeOnly?: boolean;
  }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${this.apiUrl}/list?${params}`);
    return response.json();
  }
}
```

---

## Troubleshooting

### Issue: Model not found
**Solution**: Check that model_path exists and is accessible

```bash
# Check model path
ls -la /path/to/model

# Verify model files
curl http://localhost:8001/api/v1/model/health/{model_id}
```

### Issue: Validation failed
**Solution**: Check validation errors

```bash
curl -X POST http://localhost:8001/api/v1/model/validate?model_id={model_id}
```

### Issue: Load failed
**Solution**: Check logs

```bash
tail -f logs/training.log
```

### Issue: Compatibility error
**Solution**: Check compatibility report

```bash
curl -X POST http://localhost:8001/api/v1/model/prepare-training \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "{model_id}"
  }'
```

---

## Next Steps

1. ✅ Model registered and validated
2. ✅ Model loaded and activated
3. ✅ Ready for training preparation

**Continue to**:
- Phase 4.4.4.5 - LoRA/QLoRA Adapter Manager
- Phase 4.4.4.6 - Training Orchestrator
- Full training pipeline integration

---

## API Documentation

Interactive API docs available at:
- **Swagger UI**: http://localhost:8001/api/v1/docs
- **ReDoc**: http://localhost:8001/api/v1/redoc

---

## Support

- Health Check: `GET /api/v1/model/health`
- System Status: `GET /api/v1/model/stats`
- Logs: `logs/training.log`
- Documentation: `MODEL_README.md`

---

**You're all set! 🚀**
