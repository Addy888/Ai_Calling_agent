# Model Packaging & Export Engine - Quick Start Guide

## 🚀 Getting Started

This guide will help you quickly start using the Enterprise Model Packaging & Export Engine.

---

## Overview

The Model Packaging & Export Engine prepares trained AI models for deployment across multiple platforms with comprehensive validation, security features, and export workflows.

---

## Access Points

### Frontend UI
- **Dashboard**: `/dashboard/training/packages`
- **Package Detail**: `/dashboard/training/packages/[id]`

### API Base URL
- **Endpoint**: `/api/training-manager/packages`
- **Authentication**: JWT Bearer Token required

---

## Quick Actions

### 1. Create a New Package

**UI Method**:
1. Navigate to `/dashboard/training/packages`
2. Click "New Package" button
3. Fill in the form:
   - Package Name: `ai-calling-agent-v2.0`
   - Version: `2.0.0` (semantic versioning)
   - Description: Brief description
   - Export Format: Choose from 8 formats
   - Deployment Target: Choose from 11 targets
   - Compression: GZIP recommended
   - Encryption: AES-256 for security
4. Click "Create Package"

**API Method**:
```bash
curl -X POST https://your-api.com/api/training-manager/packages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelRegistryId": "model-123",
    "trainingSessionId": "session-456",
    "packageName": "ai-calling-agent-v2.0",
    "packageVersion": "2.0.0",
    "exportFormat": "SAFETENSORS",
    "deploymentTarget": "DOCKER",
    "compression": "GZIP",
    "encryption": "AES_256"
  }'
```

### 2. View Package Details

**UI Method**:
1. Click on any package in the list
2. View 5 comprehensive tabs:
   - **Overview**: Package info, security, deployment
   - **Manifest**: Files, dependencies, checksums
   - **Metadata**: Model details, training info
   - **Configuration**: Technical parameters
   - **History**: Version history, activity log

**API Method**:
```bash
curl -X GET https://your-api.com/api/training-manager/packages/pkg-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Validate Package

**UI Method**:
- Validation runs automatically on package detail page
- View validation status in the green/red panel
- Check 5 validation points

**API Method**:
```bash
curl -X POST https://your-api.com/api/training-manager/packages/pkg-123/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Prepare Export

**UI Method**:
1. Open package detail page
2. Click "Prepare Export" button (visible when status is READY)
3. Export configuration dialog appears
4. Confirm export preparation

**API Method**:
```bash
curl -X POST https://your-api.com/api/training-manager/packages/pkg-123/prepare-export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "includeMetadata": true,
    "includeConfiguration": true,
    "includeEvaluation": true,
    "generateChecksum": true,
    "signPackage": true
  }'
```

---

## Export Formats

Choose the right format for your deployment:

| Format | Best For | File Extension |
|--------|----------|----------------|
| **GGUF** | Ollama, llama.cpp | `.gguf` |
| **SafeTensors** | Hugging Face, Production | `.safetensors` |
| **PyTorch** | PyTorch applications | `.pt`, `.pth` |
| **ONNX** | Cross-platform inference | `.onnx` |
| **TensorRT** | NVIDIA GPU optimization | `.plan` |
| **TorchScript** | Production PyTorch | `.pt` |
| **Hugging Face** | HF ecosystem | Various |
| **Custom Archive** | Specialized needs | `.tar.gz` |

---

## Deployment Targets

Choose where you'll deploy:

| Target | Description | Requirements |
|--------|-------------|--------------|
| **Docker** | Container deployment | Docker installed |
| **Kubernetes** | Orchestrated deployment | K8s cluster |
| **Ollama** | Local LLM runtime | Ollama installed |
| **vLLM** | High-performance inference | vLLM server |
| **AWS SageMaker** | AWS ML platform | AWS account |
| **Azure ML** | Microsoft Azure ML | Azure subscription |
| **Google Vertex AI** | Google Cloud AI | GCP project |
| **Hugging Face Hub** | Model hub | HF account |
| **RunPod** | GPU cloud | RunPod account |
| **Local Server** | On-premise | Local setup |
| **Custom API** | Custom endpoint | API configured |

---

## Package Status Flow

```
1. DRAFT
   ↓ (Create package)
   
2. PREPARING
   ↓ (Validation)
   
3. READY
   ↓ (Prepare export)
   
4. EXPORTED
   ↓ (Optional)
   
5. ARCHIVED
```

**Alternative States**:
- **FAILED**: Validation or export failure
- **CANCELLED**: User cancelled operation

---

## Validation Checks

Every package goes through 5 validation checks:

1. ✅ **Training Completed**: Model training finished successfully
2. ✅ **Evaluation Approved**: Model evaluation passed requirements
3. ✅ **Checkpoint Exists**: Model checkpoint files available
4. ✅ **Configuration Exists**: Valid packaging configuration
5. ✅ **Model Registry Exists**: Model registered in registry

---

## Security Features

### Compression Options
- **GZIP**: Standard compression (recommended)
- **BZIP2**: High compression ratio
- **XZ**: Maximum compression
- **ZSTD**: Fast compression
- **NONE**: No compression

### Encryption Options
- **AES-256**: Symmetric encryption (recommended)
- **RSA-2048**: Asymmetric encryption
- **GPG**: PGP encryption
- **NONE**: No encryption

### Package Signing
- Enable in export preparation
- Uses RSA signatures
- Ensures integrity verification

---

## Search & Filtering

### Search by Name
Use the search box to filter packages by name:
```
Search: "ai-calling-agent"
```

### Filter by Format
Select export format from dropdown:
- All Formats
- SAFETENSORS
- GGUF
- PyTorch
- ONNX

### Filter by Status
Select status from dropdown:
- All Status
- DRAFT
- PREPARING
- READY
- EXPORTED

---

## Common Workflows

### Workflow 1: Quick Package Creation
1. Create package with SAFETENSORS format
2. Select DOCKER deployment
3. Wait for automatic validation
4. Prepare export when ready
5. Download package

### Workflow 2: Ollama Deployment
1. Create package with GGUF format
2. Select OLLAMA deployment
3. Use GZIP compression
4. Validate package
5. Export for Ollama

### Workflow 3: Cloud Deployment
1. Create package with SafeTensors
2. Select AWS_SAGEMAKER or AZURE_ML
3. Enable AES-256 encryption
4. Sign package for security
5. Export with full metadata

---

## API Endpoints Reference

### Package Management
- `POST /packages` - Create package
- `GET /packages/:id` - Get package details
- `GET /packages` - List packages (with filters)
- `PUT /packages/:id` - Update package
- `DELETE /packages/:id` - Delete package

### Package Operations
- `POST /packages/:id/validate` - Validate package
- `POST /packages/:id/prepare-export` - Prepare export
- `GET /packages/:id/manifest` - Get manifest
- `GET /packages/:id/metadata` - Get metadata

---

## Troubleshooting

### Package Validation Failed
**Problem**: Validation shows failed checks

**Solution**:
1. Review each failed check
2. Ensure training is completed
3. Verify evaluation approved
4. Check checkpoint files exist
5. Confirm configuration valid

### Export Preparation Failed
**Problem**: Cannot prepare export

**Solution**:
1. Run validation first
2. Fix any validation errors
3. Ensure package status is READY
4. Check all required fields filled
5. Retry export preparation

### Package Not Found
**Problem**: Cannot find package

**Solution**:
1. Verify package ID correct
2. Check company access permissions
3. Ensure JWT token valid
4. Confirm package not deleted

---

## Best Practices

### 1. Naming Convention
Use semantic versioning:
```
ai-calling-agent-v1.0.0
ai-calling-agent-v1.1.0
ai-calling-agent-v2.0.0
```

### 2. Security
- Always use encryption for production
- Enable package signing
- Generate checksums
- Use HTTPS for downloads

### 3. Validation
- Validate before preparing export
- Review all warnings
- Test in staging first
- Document validation results

### 4. Metadata
- Include comprehensive descriptions
- Document training parameters
- Record evaluation scores
- Track version history

### 5. Export
- Choose appropriate format
- Match target platform
- Include all dependencies
- Test exported package

---

## Next Steps

1. ✅ Create your first package
2. ✅ Validate the package
3. ✅ Prepare export configuration
4. ✅ Review manifest and metadata
5. ✅ Export package for deployment

---

## Support & Documentation

- **Full Documentation**: `PHASE_4.4.3.7_COMPLETION_REPORT.md`
- **API Docs**: `/api/docs` (Swagger)
- **UI Dashboard**: `/dashboard/training/packages`

---

**Happy Packaging! 🚀**
