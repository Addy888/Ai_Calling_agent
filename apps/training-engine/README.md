# AI Training Engine

Enterprise-grade Python microservice for managing AI model training infrastructure.

## 🎯 Current Phase Status

### ✅ Phase 4.4.4.1 - Training Engine Core (COMPLETE)
- Training Session Management
- Job Queue & Execution
- Worker Pool Management
- Process Monitoring
- Progress Tracking
- Event System
- REST API

### ✅ Phase 4.4.4.2 - Dataset Processing (COMPLETE)
- Dataset Loader (7 formats)
- Dataset Parser (11 types)
- Data Validator
- Data Cleaner
- Preprocessor
- Unified Formatter
- Dataset Splitter
- Metadata Generator
- Cache & Storage
- Complete Pipeline
- 10 REST APIs

### ⏳ Phase 4.4.4.3 - Model Training (Next)
- PyTorch integration
- HuggingFace Transformers
- Training loops
- Checkpoint management

## 🏗️ Architecture

```
training-engine/
├── app/
│   ├── api/          # REST API endpoints
│   ├── config/       # Configuration management
│   ├── core/         # Application core
│   ├── events/       # Event bus system
│   ├── exceptions/   # Custom exceptions
│   ├── health/       # Health check endpoints
│   ├── jobs/         # Job runner
│   ├── logger/       # Structured logging
│   ├── middleware/   # API middleware
│   ├── models/       # Data models
│   ├── process/      # Process management
│   ├── queue/        # Job queue
│   ├── schemas/      # API schemas
│   ├── sessions/     # Session manager
│   └── workers/      # Training workers
├── tests/            # Unit & integration tests
├── scripts/          # Utility scripts
├── logs/             # Application logs
├── main.py           # Application entry point
├── requirements.txt  # Python dependencies
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- pip or uv

### Installation

```bash
# Navigate to training-engine directory
cd apps/training-engine

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Important: Change security keys in production!
```

### Run the Service

```bash
# Development mode (auto-reload)
python main.py

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

The service will be available at:
- API: http://localhost:8001/api/v1
- Docs: http://localhost:8001/api/v1/docs
- Health: http://localhost:8001/health

## 📡 API Endpoints

### Health Checks

```bash
GET /health          # Basic health check
GET /readiness       # Readiness probe
GET /liveness        # Liveness probe
GET /version         # Version info
```

### Training Management

```bash
POST /api/v1/training/session      # Create training session
POST /api/v1/training/start        # Start training
POST /api/v1/training/pause        # Pause training
POST /api/v1/training/resume       # Resume training
POST /api/v1/training/cancel       # Cancel training
GET  /api/v1/training/session/{id} # Get session details
GET  /api/v1/training/status/{id}  # Get training status
GET  /api/v1/training/jobs         # List all jobs
GET  /api/v1/training/health       # Training service health
```

## 🔧 Integration with NestJS

The training engine communicates with the main NestJS backend via REST APIs:

```typescript
// From NestJS backend
const response = await httpx.post('http://localhost:8001/api/v1/training/session', {
  headers: {
    'X-API-Key': process.env.TRAINING_ENGINE_API_KEY
  },
  json: {
    job_id: 'job-123',
    user_id: 'user-123',
    project_id: 'project-123',
    training_config: {
      training_type: 'voice_cloning',
      dataset_id: 'dataset-123',
      model_name: 'xtts-v2',
      batch_size: 8,
      num_epochs: 3,
      learning_rate: 0.00002
    }
  }
});
```

**Important:** Never connect directly to Prisma from Python. Always go through NestJS APIs.

## 🎯 Core Components

### 1. Training Session Manager
Manages the lifecycle of training sessions:
- Create, update, pause, resume, cancel
- Progress tracking
- Metrics collection
- Status management

### 2. Job Runner
Orchestrates job execution:
- Queue management
- Worker assignment
- Retry logic
- Event emission

### 3. Worker Pool
Manages training workers:
- Worker allocation
- Resource monitoring
- Process management
- Heartbeat tracking

### 4. Process Manager
Monitors system processes:
- CPU/Memory monitoring
- Resource limit enforcement
- Process lifecycle
- Health checks

### 5. Event Bus
Pub/sub event system:
- Training lifecycle events
- Progress updates
- Worker events
- Resource alerts

## 📊 Event System

Events are emitted throughout the training lifecycle:

```python
# Subscribe to events
event_bus.subscribe(EventType.TRAINING_STARTED, handler)

# Events include:
- TRAINING_CREATED
- TRAINING_QUEUED
- TRAINING_STARTED
- TRAINING_PAUSED
- TRAINING_RESUMED
- TRAINING_COMPLETED
- TRAINING_CANCELLED
- TRAINING_FAILED
- PROGRESS_UPDATED
- WORKER_STARTED
- WORKER_STOPPED
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_session_manager.py

# Run with verbose output
pytest -v
```

## 📝 Logging

Structured logging with multiple outputs:

```python
# Logs are written to:
- Console (colored, formatted)
- logs/training-engine.log (all logs)
- logs/training-engine-error.log (errors only)

# Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
```

## 🔐 Security

### API Authentication

```bash
# Include API key in requests
X-API-Key: your-internal-api-key
```

### Environment Variables

```bash
# Never commit sensitive values!
JWT_SECRET_KEY=change-in-production
INTERNAL_API_KEY=change-in-production
NESTJS_API_KEY=change-in-production
```

## 🎓 Future Extensions

This architecture is ready for:

### PyTorch Training
```python
# Extension points exist for:
- Model loading
- Dataset preparation
- Training loops
- Gradient accumulation
- Mixed precision
```

### HuggingFace Integration
```python
# Ready for:
- Transformers
- Datasets
- Tokenizers
- Model Hub
```

### LoRA/QLoRA
```python
# PEFT integration:
- LoRA adapters
- QLoRA quantization
- Adapter merging
```

### GPU Support
```python
# GPU features:
- CUDA device management
- Multi-GPU training
- Memory optimization
- Mixed precision (FP16/BF16)
```

### Monitoring
```python
# Integration ready:
- TensorBoard
- Weights & Biases
- Custom metrics
- Real-time dashboards
```

## 📚 Dependencies

Core framework:
- FastAPI - Modern web framework
- Uvicorn - ASGI server
- Pydantic - Data validation

ML Infrastructure (Ready):
- PyTorch - Deep learning framework
- Transformers - NLP models
- PEFT - Parameter-efficient fine-tuning
- Accelerate - Distributed training

Utilities:
- loguru - Structured logging
- psutil - System monitoring
- httpx - HTTP client

## 🐛 Troubleshooting

### Service won't start
```bash
# Check Python version
python --version  # Should be 3.10+

# Check dependencies
pip list

# Check logs
tail -f logs/training-engine.log
```

### Worker not processing jobs
```bash
# Check worker pool status
curl http://localhost:8001/api/v1/training/health

# Check system resources
# Ensure CPU/Memory within limits
```

### API returns 503
```bash
# Service not initialized
# Wait for startup or check logs
```

## 📈 Monitoring

### Health Endpoints

```bash
# Check service health
curl http://localhost:8001/health

# Check training subsystem
curl -H "X-API-Key: your-key" \
  http://localhost:8001/api/v1/training/health
```

### Metrics

The health endpoint returns:
- System resources (CPU, Memory, Disk)
- Worker pool status
- Queue size
- Active training sessions

## 🤝 Integration Guide

### From NestJS Backend

```typescript
// training-manager.service.ts
async createTrainingJob(dto: CreateTrainingDto) {
  // 1. Prepare data in NestJS
  const trainingConfig = this.prepareConfig(dto);
  
  // 2. Call Python training engine
  const response = await this.httpService.post(
    `${TRAINING_ENGINE_URL}/api/v1/training/session`,
    {
      job_id: generateId(),
      user_id: dto.userId,
      project_id: dto.projectId,
      training_config: trainingConfig
    },
    {
      headers: {
        'X-API-Key': process.env.TRAINING_ENGINE_API_KEY
      }
    }
  );
  
  // 3. Store job info in Prisma (via NestJS)
  return this.prisma.trainingJob.create({
    data: {
      jobId: response.data.job_id,
      userId: dto.userId,
      status: 'queued',
      // ...
    }
  });
}
```

## 📖 API Documentation

Interactive API documentation available at:
- Swagger UI: http://localhost:8001/api/v1/docs
- ReDoc: http://localhost:8001/api/v1/redoc

## 🎯 Next Steps

1. ✅ **Phase 4.4.4.1** - Infrastructure Complete
2. ⏳ **Phase 4.4.4.2** - Dataset Integration
3. ⏳ **Phase 4.4.4.3** - Model Training Implementation
4. ⏳ **Phase 4.4.4.4** - GPU Training
5. ⏳ **Phase 4.4.4.5** - LoRA/QLoRA
6. ⏳ **Phase 4.4.4.6** - Production Optimization

## 📄 License

Part of the AI Calling Agent project.

---

**Built with ❤️ for Enterprise AI Training**
