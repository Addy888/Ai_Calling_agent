# STT Engine Deployment Guide

Complete deployment guide for the Enterprise Streaming Speech-to-Text Engine in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Scaling](#scaling)
7. [Monitoring](#monitoring)
8. [Security](#security)

## Prerequisites

### Hardware Requirements

**Minimum (CPU-only)**
- 4 CPU cores
- 8GB RAM
- 20GB storage

**Recommended (GPU)**
- 8 CPU cores
- 16GB RAM
- NVIDIA GPU with 4GB+ VRAM (RTX 2060 or better)
- 50GB storage

### Software Requirements

- Docker 20.10+
- Docker Compose 1.29+
- Node.js 18+
- Python 3.11+
- NVIDIA Docker Runtime (for GPU support)

### GPU Setup (Optional but Recommended)

```bash
# Install NVIDIA Docker Runtime
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# Verify GPU access
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ai-calling-agent.git
cd ai-calling-agent
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for Whisper service
cd apps/whisper-service
pip install -r requirements.txt
cd ../..
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and configure STT settings
nano .env
```

Required STT configuration:

```env
# Faster Whisper Service
FASTER_WHISPER_ENDPOINT=http://localhost:9000
WHISPER_MODEL_SIZE=base
STT_PROVIDER=faster-whisper

# VAD Configuration
STT_VAD_SPEECH_THRESHOLD=0.025
STT_VAD_SILENCE_MS=1200

# Audio Processing
STT_SAMPLE_RATE=16000
STT_NOISE_REDUCTION_ENABLED=true
```

### 4. Start Services

**Terminal 1: Start Whisper Service**
```bash
cd apps/whisper-service
python main.py
```

**Terminal 2: Start API Server**
```bash
npm run dev:api
```

**Terminal 3: Start Web Client**
```bash
npm run dev:web
```

### 5. Verify Setup

```bash
# Check Whisper service health
curl http://localhost:9000/health

# Check API STT endpoints
curl http://localhost:3001/api/v1/stt/providers
```

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # API Server
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - FASTER_WHISPER_ENDPOINT=http://whisper-stt:9000
    depends_on:
      - whisper-stt
      - redis
      - mysql
    restart: unless-stopped

  # Whisper STT Service
  whisper-stt:
    build:
      context: ./apps/whisper-service
      dockerfile: Dockerfile
    environment:
      - WHISPER_MODEL_SIZE=base
      - PORT=9000
    volumes:
      - whisper-models:/app/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

  # Redis for caching
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  # MySQL Database
  mysql:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=ai_calling_agent
    volumes:
      - mysql-data:/var/lib/mysql
    restart: unless-stopped

  # NGINX Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  whisper-models:
  redis-data:
  mysql-data:
```

### Build and Deploy

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale Whisper service
docker-compose -f docker-compose.prod.yml up -d --scale whisper-stt=3
```

## Kubernetes Deployment

### 1. Create Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-calling-agent
```

### 2. Deploy Whisper Service

```yaml
# k8s/whisper-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whisper-stt
  namespace: ai-calling-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: whisper-stt
  template:
    metadata:
      labels:
        app: whisper-stt
    spec:
      containers:
      - name: whisper
        image: your-registry/whisper-stt:latest
        ports:
        - containerPort: 9000
        env:
        - name: WHISPER_MODEL_SIZE
          value: "base"
        - name: PORT
          value: "9000"
        resources:
          limits:
            nvidia.com/gpu: 1
            memory: "4Gi"
            cpu: "2000m"
          requests:
            nvidia.com/gpu: 1
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: models
          mountPath: /app/models
        livenessProbe:
          httpGet:
            path: /health
            port: 9000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 9000
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: whisper-models-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: whisper-stt-service
  namespace: ai-calling-agent
spec:
  selector:
    app: whisper-stt
  ports:
  - port: 9000
    targetPort: 9000
  type: ClusterIP
```

### 3. Deploy API Server

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: ai-calling-agent
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: your-registry/api-server:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: FASTER_WHISPER_ENDPOINT
          value: "http://whisper-stt-service:9000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          limits:
            memory: "1Gi"
            cpu: "1000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: ai-calling-agent
spec:
  selector:
    app: api-server
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

### 4. Create Persistent Volume for Models

```yaml
# k8s/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: whisper-models-pvc
  namespace: ai-calling-agent
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
```

### 5. Deploy

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/whisper-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml

# Check status
kubectl get pods -n ai-calling-agent
kubectl get svc -n ai-calling-agent

# View logs
kubectl logs -f deployment/whisper-stt -n ai-calling-agent
```

### 6. Horizontal Pod Autoscaling

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: whisper-stt-hpa
  namespace: ai-calling-agent
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: whisper-stt
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Cloud Deployment

### AWS ECS/Fargate

```json
// ecs-task-definition.json
{
  "family": "whisper-stt",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "whisper-stt",
      "image": "your-registry/whisper-stt:latest",
      "portMappings": [
        {
          "containerPort": 9000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "WHISPER_MODEL_SIZE",
          "value": "base"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/whisper-stt",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Deploy:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
aws ecs create-service \
  --cluster ai-calling-cluster \
  --service-name whisper-stt \
  --task-definition whisper-stt \
  --desired-count 3 \
  --launch-type FARGATE
```

### Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/whisper-stt

# Deploy
gcloud run deploy whisper-stt \
  --image gcr.io/PROJECT_ID/whisper-stt \
  --platform managed \
  --region us-central1 \
  --memory 4Gi \
  --cpu 2 \
  --max-instances 10 \
  --set-env-vars WHISPER_MODEL_SIZE=base
```

### Azure Container Instances

```bash
az container create \
  --resource-group ai-calling-rg \
  --name whisper-stt \
  --image your-registry/whisper-stt:latest \
  --cpu 2 \
  --memory 4 \
  --ports 9000 \
  --environment-variables WHISPER_MODEL_SIZE=base
```

## Scaling

### Load Balancing

NGINX configuration for load balancing multiple Whisper instances:

```nginx
# nginx-lb.conf
upstream whisper_backend {
    least_conn;
    server whisper-stt-1:9000 max_fails=3 fail_timeout=30s;
    server whisper-stt-2:9000 max_fails=3 fail_timeout=30s;
    server whisper-stt-3:9000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    
    location /transcribe {
        proxy_pass http://whisper_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }
    
    location /health {
        proxy_pass http://whisper_backend;
    }
}
```

### Auto-scaling Rules

**CPU-based:**
- Scale up when CPU > 70% for 2 minutes
- Scale down when CPU < 30% for 5 minutes

**Memory-based:**
- Scale up when memory > 80% for 2 minutes

**Custom metrics:**
- Scale up when active sessions > 10 per instance
- Scale up when average latency > 500ms

## Monitoring

### Prometheus Metrics

```typescript
// Add to API server
import * as promClient from 'prom-client';

const sttLatencyHistogram = new promClient.Histogram({
  name: 'stt_transcription_latency_ms',
  help: 'STT transcription latency in milliseconds',
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

const sttRequestsCounter = new promClient.Counter({
  name: 'stt_requests_total',
  help: 'Total STT transcription requests',
  labelNames: ['status', 'language'],
});
```

### Grafana Dashboard

Key metrics to monitor:

- **Latency**: P50, P95, P99 transcription latency
- **Throughput**: Requests per second
- **Error Rate**: Failed transcriptions
- **Resource Usage**: CPU, RAM, GPU utilization
- **Queue Depth**: Pending transcription requests
- **Model Performance**: Accuracy metrics

### Logging

Centralized logging with ELK Stack:

```yaml
# filebeat.yml
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'
  processors:
    - add_kubernetes_metadata:
        host: ${NODE_NAME}

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### Alerting

Set up alerts for:

- Latency > 1000ms (P95)
- Error rate > 5%
- GPU memory > 90%
- Service unavailable
- Model loading failures

## Security

### API Authentication

```typescript
// JWT authentication middleware
@UseGuards(JwtAuthGuard)
@Controller('stt')
export class SpeechRecognitionController {
  // ... endpoints
}
```

### Rate Limiting

```typescript
// Rate limit STT endpoints
@Throttle(100, 60) // 100 requests per minute
@Post('start')
async startSession(@Body() dto: StartSTTSessionDto) {
  // ...
}
```

### Network Security

```yaml
# Network policy for Kubernetes
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: whisper-stt-policy
spec:
  podSelector:
    matchLabels:
      app: whisper-stt
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-server
    ports:
    - protocol: TCP
      port: 9000
```

### Data Encryption

- Enable TLS/SSL for all endpoints
- Encrypt transcripts at rest
- Use secret management (AWS Secrets Manager, Vault)

## Backup and Recovery

### Model Backups

```bash
# Backup models
aws s3 sync /app/models s3://your-bucket/whisper-models/

# Restore models
aws s3 sync s3://your-bucket/whisper-models/ /app/models
```

### Database Backups

```bash
# Automated MySQL backups
0 2 * * * mysqldump -u root -p${DB_PASSWORD} ai_calling_agent > /backups/db_$(date +\%Y\%m\%d).sql
```

## Troubleshooting Production Issues

See [IMPLEMENTATION_GUIDE.md](./apps/api/src/modules/speech-recognition/IMPLEMENTATION_GUIDE.md) for detailed troubleshooting.

## Production Checklist

- [ ] GPU nodes provisioned
- [ ] Load balancer configured
- [ ] Auto-scaling enabled
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Backup strategy implemented
- [ ] Security hardening completed
- [ ] Performance testing done
- [ ] Disaster recovery plan documented
- [ ] Runbook created for on-call team

## Support

For production support:
- Email: support@your-company.com
- Slack: #ai-calling-support
- On-call: PagerDuty rotation
