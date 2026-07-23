# Training Engine Quick Start

Get the Training Engine running in 5 minutes.

## ⚡ Quick Setup

### Windows

```bash
# Navigate to training engine
cd apps\training-engine

# Run setup script
scripts\setup.bat

# Start the service
scripts\start.bat
```

### Linux/Mac

```bash
# Navigate to training engine
cd apps/training-engine

# Make scripts executable
chmod +x scripts/*.sh

# Run setup script
./scripts/setup.sh

# Start the service
./scripts/start.sh
```

## 🧪 Verify Installation

```bash
# Check health
curl http://localhost:8001/health

# Expected response:
{
  "status": "healthy",
  "service": "training-engine",
  "version": "1.0.0",
  "timestamp": "..."
}
```

## 🎯 First Training Job

### 1. Create a Training Job

```bash
curl -X POST http://localhost:8001/api/v1/training/session \
  -H "X-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-job-001",
    "user_id": "user-123",
    "project_id": "project-123",
    "training_config": {
      "training_type": "voice_cloning",
      "dataset_id": "dataset-123",
      "model_name": "test-model",
      "batch_size": 4,
      "num_epochs": 2,
      "learning_rate": 0.00002
    }
  }'
```

### 2. Check Job Status

```bash
# Get session details
curl http://localhost:8001/api/v1/training/session/SESSION_ID \
  -H "X-API-Key: your-internal-api-key"

# Get training status
curl http://localhost:8001/api/v1/training/status/SESSION_ID \
  -H "X-API-Key: your-internal-api-key"
```

### 3. Monitor Progress

```bash
# Watch logs
tail -f logs/training-engine.log

# Check service health
curl http://localhost:8001/api/v1/training/health \
  -H "X-API-Key: your-internal-api-key"
```

## 📊 Interactive API Docs

Open your browser:

- Swagger UI: http://localhost:8001/api/v1/docs
- ReDoc: http://localhost:8001/api/v1/redoc

## 🔧 Configuration

Edit `.env` file:

```bash
# Service
PORT=8001
DEBUG=true

# Security
INTERNAL_API_KEY=your-secure-api-key

# Training
MAX_CONCURRENT_JOBS=2
DEFAULT_BATCH_SIZE=8
DEFAULT_EPOCHS=3
```

## 🎛️ Control Operations

### Pause Training

```bash
curl -X POST http://localhost:8001/api/v1/training/pause \
  -H "X-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID"}'
```

### Resume Training

```bash
curl -X POST http://localhost:8001/api/v1/training/resume \
  -H "X-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID"}'
```

### Cancel Training

```bash
curl -X POST http://localhost:8001/api/v1/training/cancel \
  -H "X-API-Key: your-internal-api-key" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID", "reason": "User requested"}'
```

## 📝 Logs

```bash
# View all logs
tail -f logs/training-engine.log

# View errors only
tail -f logs/training-engine-error.log

# Search logs
grep "session_id" logs/training-engine.log
```

## 🧪 Run Tests

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate.bat  # Windows

# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html
```

## 🐳 Docker

```bash
# Build image
docker build -t training-engine .

# Run container
docker run -p 8001:8001 \
  -e INTERNAL_API_KEY=your-key \
  training-engine

# Using docker-compose
docker-compose up -d
```

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Change port in .env
PORT=8002

# Or stop conflicting service
lsof -ti:8001 | xargs kill -9  # Linux/Mac
netstat -ano | findstr :8001   # Windows
```

### Dependencies Failed

```bash
# Upgrade pip
pip install --upgrade pip

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Permission Denied (Linux/Mac)

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

## 📚 Next Steps

1. ✅ Service running
2. 📖 Read [README.md](./README.md) for full documentation
3. 🔗 Read [INTEGRATION.md](./INTEGRATION.md) for NestJS integration
4. 🧪 Explore API at http://localhost:8001/api/v1/docs

## 🆘 Need Help?

- Check logs: `logs/training-engine.log`
- API docs: http://localhost:8001/api/v1/docs
- Health check: http://localhost:8001/health

---

**You're all set!** 🚀
