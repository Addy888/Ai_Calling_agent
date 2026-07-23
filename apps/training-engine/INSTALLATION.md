# Installation Guide - Enterprise Model Loader

## Prerequisites

- Python 3.10 or higher
- pip or conda
- Git
- 4GB+ RAM
- (Optional) NVIDIA GPU with CUDA support

---

## Installation Steps

### 1. Navigate to Training Engine

```bash
cd apps/training-engine
```

### 2. Create Virtual Environment

```bash
# Using venv
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate
```

### 3. Install Dependencies

```bash
# Core dependencies
pip install fastapi==0.104.0
pip install uvicorn[standard]==0.24.0
pip install pydantic==2.5.0
pip install python-multipart==0.0.6
pip install aiofiles==23.2.1
pip install python-jose[cryptography]==3.3.0

# Optional: For future model loading
# pip install torch>=2.0.0
# pip install transformers>=4.35.0
# pip install accelerate>=0.24.0
# pip install peft>=0.6.0
```

Or use requirements.txt:

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Create `.env` file in `apps/training-engine/`:

```bash
# Service Configuration
ENVIRONMENT=development
DEBUG=true
HOST=0.0.0.0
PORT=8001
WORKERS=1
LOG_LEVEL=INFO

# Storage Paths
TRAINING_DATA_DIR=./data/datasets
MODEL_STORAGE_DIR=./data/models
TOKENIZER_STORAGE_DIR=./data/tokenizers
SESSION_STORAGE_DIR=./data/sessions
JOB_STORAGE_DIR=./data/jobs

# Cache Configuration
CACHE_TTL_SECONDS=3600
MODEL_CACHE_TTL_SECONDS=7200

# Workers
MAX_WORKERS=4
WORKER_TIMEOUT=3600

# Authentication (Optional)
# JWT_SECRET=your-secret-key
# API_KEY=your-api-key
# INTERNAL_API_KEY=your-internal-key

# NestJS Integration
NESTJS_API_URL=http://localhost:3000

# Training Configuration
MAX_TRAINING_HOURS=24
CHECKPOINT_INTERVAL=1000

# Hardware (Optional)
USE_GPU=false
GPU_IDS=0
# MAX_GPU_MEMORY_GB=16

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 5. Verify Installation

```bash
# Check Python version
python --version
# Should be 3.10+

# Verify dependencies
pip list | grep fastapi
pip list | grep pydantic
pip list | grep uvicorn
```

---

## Directory Structure

After installation, your structure should look like:

```
apps/training-engine/
├── app/
│   ├── config/              # Configuration
│   ├── model/               # Model module (Phase 4.4.4.4)
│   │   ├── loader/          # Model loading
│   │   ├── manager/         # Model management
│   │   ├── registry/        # Model registry
│   │   ├── validator/       # Validation
│   │   ├── compatibility/   # Compatibility checks
│   │   ├── cache/           # Caching
│   │   ├── storage/         # Storage
│   │   ├── metadata/        # Metadata
│   │   ├── pipeline/        # Pipeline
│   │   ├── health/          # Health checks
│   │   ├── schemas/         # API schemas
│   │   ├── models.py        # Data models
│   │   ├── exceptions.py    # Exceptions
│   │   └── api.py           # REST API
│   ├── dataset/             # Dataset module
│   ├── core/                # Core engine
│   ├── sessions/            # Session management
│   ├── workers/             # Worker pool
│   ├── queue/               # Job queue
│   └── ...
├── tests/
│   ├── model/               # Model tests
│   ├── dataset/             # Dataset tests
│   └── ...
├── data/                    # Created automatically
│   ├── models/              # Model storage
│   ├── datasets/            # Dataset storage
│   ├── tokenizers/          # Tokenizer storage
│   ├── sessions/            # Session storage
│   └── jobs/                # Job storage
├── logs/                    # Created automatically
│   └── training.log         # Training logs
├── main.py                  # Application entry
├── requirements.txt         # Dependencies
├── .env                     # Environment config
├── MODEL_README.md          # Model module docs
├── QUICKSTART_MODEL.md      # Quick start guide
└── INSTALLATION.md          # This file
```

---

## Running the Service

### Development Mode

```bash
# Start with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Production Mode

```bash
# Start with multiple workers
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

### Using Python Script

```bash
python main.py
```

---

## Verify Installation

### 1. Check Service Health

```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "AI Training Engine",
  "version": "1.0.0"
}
```

### 2. Check Model System Health

```bash
curl http://localhost:8001/api/v1/model/health
```

### 3. Access API Documentation

Open in browser:
- Swagger UI: http://localhost:8001/api/v1/docs
- ReDoc: http://localhost:8001/api/v1/redoc

### 4. Get Model Statistics

```bash
curl http://localhost:8001/api/v1/model/stats
```

---

## Running Tests

### Install Test Dependencies

```bash
pip install pytest==7.4.3
pip install pytest-asyncio==0.21.1
pip install pytest-cov==4.1.0
pip install httpx==0.25.1
```

### Run All Tests

```bash
# All tests
pytest

# Model tests only
pytest tests/model/

# With coverage
pytest tests/model/ --cov=app.model --cov-report=html

# Verbose output
pytest -v tests/model/
```

### Run Specific Test Files

```bash
pytest tests/model/test_loader.py
pytest tests/model/test_registry.py
pytest tests/model/test_validator.py
pytest tests/model/test_compatibility.py
pytest tests/model/test_cache.py
pytest tests/model/test_api.py
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 8001
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8001
kill -9 <PID>

# Or use different port
uvicorn main:app --port 8002
```

### Issue: Import Errors

```bash
# Ensure you're in the right directory
cd apps/training-engine

# Ensure virtual environment is activated
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: Permission Errors

```bash
# Windows: Run as Administrator
# Linux/Mac: Check directory permissions
chmod -R 755 data/
chmod -R 755 logs/
```

### Issue: Module Not Found

```bash
# Add current directory to PYTHONPATH
# Windows
set PYTHONPATH=%PYTHONPATH%;.

# Linux/Mac
export PYTHONPATH=$PYTHONPATH:.

# Or install in development mode
pip install -e .
```

---

## Development Setup

### Install Development Tools

```bash
pip install black==23.11.0
pip install flake8==6.1.0
pip install mypy==1.7.0
pip install isort==5.12.0
```

### Code Formatting

```bash
# Format code
black app/ tests/

# Sort imports
isort app/ tests/

# Check style
flake8 app/ tests/

# Type checking
mypy app/
```

### Pre-commit Hooks (Optional)

```bash
pip install pre-commit
pre-commit install
```

---

## Docker Setup (Optional)

### Create Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV PORT=8001

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Build and Run

```bash
# Build image
docker build -t ai-training-engine .

# Run container
docker run -p 8001:8001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  ai-training-engine
```

---

## Production Deployment

### Using Systemd (Linux)

Create `/etc/systemd/system/training-engine.service`:

```ini
[Unit]
Description=AI Training Engine
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/training-engine
Environment="PATH=/opt/training-engine/venv/bin"
ExecStart=/opt/training-engine/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable training-engine
sudo systemctl start training-engine
sudo systemctl status training-engine
```

### Using PM2 (Node.js Process Manager)

```bash
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4" --name training-engine
pm2 save
pm2 startup
```

### Behind Nginx

```nginx
upstream training_engine {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name training.example.com;

    location / {
        proxy_pass http://training_engine;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Monitoring

### Health Check Endpoint

```bash
# Automated health check
while true; do
  curl http://localhost:8001/health
  sleep 30
done
```

### Logs

```bash
# View logs
tail -f logs/training.log

# Search logs
grep "ERROR" logs/training.log
grep "model" logs/training.log
```

### Metrics (if enabled)

```bash
curl http://localhost:9090/metrics
```

---

## Uninstallation

```bash
# Stop service
# Systemd
sudo systemctl stop training-engine
sudo systemctl disable training-engine

# PM2
pm2 delete training-engine

# Remove virtual environment
rm -rf venv/

# Remove data (optional)
rm -rf data/
rm -rf logs/
```

---

## Next Steps

After successful installation:

1. ✅ Read `QUICKSTART_MODEL.md` for quick start guide
2. ✅ Read `MODEL_README.md` for detailed documentation
3. ✅ Explore API at http://localhost:8001/api/v1/docs
4. ✅ Register your first model
5. ✅ Integrate with NestJS backend

---

## Support

For issues or questions:
- Check logs: `logs/training.log`
- Health check: `GET /health`
- System health: `GET /api/v1/model/health`
- API docs: http://localhost:8001/api/v1/docs

---

**Installation Complete! 🚀**
