# Training Engine Integration Guide

Complete guide for integrating the Python Training Engine with the NestJS backend.

## 🎯 Overview

The Training Engine is a **Python microservice** that runs independently and communicates with the NestJS backend via REST APIs.

```
┌─────────────────┐         REST API         ┌─────────────────┐
│                 │ ◄──────────────────────► │                 │
│  NestJS Backend │                          │ Training Engine │
│  (Port 3000)    │                          │  (Port 8001)    │
│                 │                          │                 │
└────────┬────────┘                          └────────┬────────┘
         │                                            │
         │                                            │
    ┌────▼────┐                                  ┌────▼────┐
    │ Prisma  │                                  │ PyTorch │
    │   DB    │                                  │ML Stack │
    └─────────┘                                  └─────────┘
```

## 📡 Communication Flow

### 1. Job Creation (NestJS → Python)

```typescript
// apps/api/src/modules/training-manager/services/training-execution.service.ts

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TrainingExecutionService {
  private readonly trainingEngineUrl: string;
  private readonly trainingEngineApiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.trainingEngineUrl = this.configService.get('TRAINING_ENGINE_URL');
    this.trainingEngineApiKey = this.configService.get('TRAINING_ENGINE_API_KEY');
  }

  async createTrainingJob(dto: CreateTrainingJobDto) {
    // 1. Prepare training configuration
    const trainingConfig = {
      training_type: dto.trainingType,
      dataset_id: dto.datasetId,
      model_name: dto.modelName,
      batch_size: dto.batchSize || 8,
      num_epochs: dto.numEpochs || 3,
      learning_rate: dto.learningRate || 0.00002,
      hyperparameters: dto.hyperparameters || {},
      training_args: dto.trainingArgs || {},
    };

    // 2. Call Python Training Engine
    const response = await this.httpService.axiosRef.post(
      `${this.trainingEngineUrl}/api/v1/training/session`,
      {
        job_id: dto.jobId,
        user_id: dto.userId,
        project_id: dto.projectId,
        training_config: trainingConfig,
      },
      {
        headers: {
          'X-API-Key': this.trainingEngineApiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    // 3. Store job info in Prisma (NestJS owns the database)
    const trainingJob = await this.prisma.trainingJob.create({
      data: {
        jobId: dto.jobId,
        sessionId: response.data.data.session_id,
        userId: dto.userId,
        projectId: dto.projectId,
        status: 'queued',
        config: trainingConfig,
        createdAt: new Date(),
      },
    });

    return trainingJob;
  }
}
```

### 2. Status Polling (NestJS → Python)

```typescript
async getTrainingStatus(sessionId: string) {
  const response = await this.httpService.axiosRef.get(
    `${this.trainingEngineUrl}/api/v1/training/status/${sessionId}`,
    {
      headers: {
        'X-API-Key': this.trainingEngineApiKey,
      },
    },
  );

  // Update Prisma database
  await this.prisma.trainingJob.update({
    where: { sessionId },
    data: {
      status: response.data.status,
      progress: response.data.progress,
      currentEpoch: response.data.current_epoch,
      currentStep: response.data.current_step,
      metrics: response.data.metrics,
      updatedAt: new Date(),
    },
  });

  return response.data;
}
```

### 3. Control Operations (NestJS → Python)

```typescript
async pauseTraining(sessionId: string) {
  await this.httpService.axiosRef.post(
    `${this.trainingEngineUrl}/api/v1/training/pause`,
    { session_id: sessionId },
    {
      headers: { 'X-API-Key': this.trainingEngineApiKey },
    },
  );

  await this.prisma.trainingJob.update({
    where: { sessionId },
    data: { status: 'paused' },
  });
}

async resumeTraining(sessionId: string) {
  await this.httpService.axiosRef.post(
    `${this.trainingEngineUrl}/api/v1/training/resume`,
    { session_id: sessionId },
    {
      headers: { 'X-API-Key': this.trainingEngineApiKey },
    },
  );

  await this.prisma.trainingJob.update({
    where: { sessionId },
    data: { status: 'running' },
  });
}

async cancelTraining(sessionId: string, reason?: string) {
  await this.httpService.axiosRef.post(
    `${this.trainingEngineUrl}/api/v1/training/cancel`,
    { session_id: sessionId, reason },
    {
      headers: { 'X-API-Key': this.trainingEngineApiKey },
    },
  );

  await this.prisma.trainingJob.update({
    where: { sessionId },
    data: { status: 'cancelled' },
  });
}
```

## 🔐 Environment Configuration

### NestJS (.env)

```bash
# Training Engine Configuration
TRAINING_ENGINE_URL=http://localhost:8001
TRAINING_ENGINE_API_KEY=your-training-engine-api-key-here
```

### Python Training Engine (.env)

```bash
# NestJS Integration
NESTJS_API_URL=http://localhost:3000
NESTJS_API_KEY=your-nestjs-api-key-here
INTERNAL_API_KEY=your-training-engine-api-key-here
```

## 📊 Prisma Schema Updates

```prisma
// apps/api/prisma/schema.prisma

model TrainingJob {
  id          String   @id @default(uuid())
  jobId       String   @unique
  sessionId   String?  @unique
  userId      String
  projectId   String
  
  // Status
  status      String   @default("pending") // pending, queued, running, paused, completed, failed, cancelled
  progress    Float    @default(0)
  
  // Configuration
  config      Json
  
  // Progress
  currentEpoch Int     @default(0)
  currentStep  Int     @default(0)
  totalSteps   Int     @default(0)
  
  // Metrics
  metrics     Json?
  
  // Timestamps
  createdAt   DateTime @default(now())
  queuedAt    DateTime?
  startedAt   DateTime?
  completedAt DateTime?
  updatedAt   DateTime @updatedAt
  
  // Error
  errorMessage String?
  
  // Relations
  user        User     @relation(fields: [userId], references: [id])
  project     Project  @relation(fields: [projectId], references: [id])
  
  @@index([userId])
  @@index([projectId])
  @@index([status])
}
```

## 🔄 Real-time Updates (Future)

For real-time progress updates, you can use one of these approaches:

### Option 1: WebSocket (Python → NestJS)

```typescript
// NestJS Gateway
@WebSocketGateway()
export class TrainingGateway {
  @WebSocketServer()
  server: Server;

  emitTrainingProgress(sessionId: string, data: any) {
    this.server.emit(`training:progress:${sessionId}`, data);
  }
}
```

### Option 2: Server-Sent Events (Python)

```python
# Python endpoint for SSE
@router.get("/training/stream/{session_id}")
async def stream_training_progress(session_id: str):
    async def event_generator():
        while True:
            session = await session_manager.get_session(session_id)
            yield {
                "event": "progress",
                "data": json.dumps({
                    "progress": session.progress,
                    "epoch": session.current_epoch,
                    "step": session.current_step,
                })
            }
            await asyncio.sleep(1)
    
    return EventSourceResponse(event_generator())
```

### Option 3: Polling (Current)

```typescript
// NestJS polling service
@Injectable()
export class TrainingPollingService {
  async startPolling(sessionId: string) {
    const interval = setInterval(async () => {
      const status = await this.getTrainingStatus(sessionId);
      
      // Emit to WebSocket clients
      this.trainingGateway.emitTrainingProgress(sessionId, status);
      
      // Stop polling if completed
      if (['completed', 'failed', 'cancelled'].includes(status.status)) {
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds
  }
}
```

## 🚀 Deployment

### Development (Same Machine)

```bash
# Terminal 1 - NestJS Backend
cd apps/api
npm run dev

# Terminal 2 - Python Training Engine
cd apps/training-engine
python main.py
```

### Production (Docker Compose)

```yaml
# docker-compose.yml (root level)
version: '3.8'

services:
  api:
    build: ./apps/api
    ports:
      - "3000:3000"
    environment:
      - TRAINING_ENGINE_URL=http://training-engine:8001
    depends_on:
      - postgres
      - training-engine

  training-engine:
    build: ./apps/training-engine
    ports:
      - "8001:8001"
    environment:
      - NESTJS_API_URL=http://api:3000
    volumes:
      - training-data:/app/data

  postgres:
    image: postgres:15
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
  training-data:
```

## 🧪 Testing Integration

```typescript
// apps/api/test/training-integration.e2e-spec.ts

describe('Training Engine Integration', () => {
  it('should create training job', async () => {
    const response = await request(app.getHttpServer())
      .post('/training-manager/jobs')
      .send({
        userId: 'user-123',
        projectId: 'project-123',
        datasetId: 'dataset-123',
        modelName: 'xtts-v2',
        trainingType: 'voice_cloning',
      })
      .expect(201);

    expect(response.body.jobId).toBeDefined();
    expect(response.body.status).toBe('queued');
  });

  it('should get training status', async () => {
    const sessionId = 'session-123';
    
    const response = await request(app.getHttpServer())
      .get(`/training-manager/status/${sessionId}`)
      .expect(200);

    expect(response.body.progress).toBeGreaterThanOrEqual(0);
  });
});
```

## 📈 Monitoring

### Health Checks

```typescript
// NestJS Health Check
@Injectable()
export class TrainingEngineHealthIndicator extends HealthIndicator {
  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      await this.httpService.axiosRef.get(
        `${this.trainingEngineUrl}/health`,
        { timeout: 5000 }
      );
      return this.getStatus('training-engine', true);
    } catch (error) {
      return this.getStatus('training-engine', false);
    }
  }
}
```

## 🔒 Security Best Practices

1. **API Keys**: Use strong, randomly generated keys
2. **HTTPS**: Use TLS in production
3. **Rate Limiting**: Implement on both services
4. **Validation**: Validate all inputs
5. **Network**: Use internal network for service communication

## 📚 API Reference

See [README.md](./README.md) for complete API documentation.

## 🐛 Troubleshooting

### Connection Refused

```bash
# Check if training engine is running
curl http://localhost:8001/health

# Check network connectivity
ping training-engine
```

### Authentication Failed

```bash
# Verify API keys match in both .env files
echo $TRAINING_ENGINE_API_KEY  # NestJS
echo $INTERNAL_API_KEY          # Python
```

### Training Stuck

```bash
# Check worker status
curl -H "X-API-Key: your-key" \
  http://localhost:8001/api/v1/training/health

# Check logs
tail -f apps/training-engine/logs/training-engine.log
```

---

**Integration Complete!** 🎉

The Training Engine is now ready to accept jobs from your NestJS backend.
