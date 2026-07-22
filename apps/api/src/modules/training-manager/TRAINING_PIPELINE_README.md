# Training Pipeline Preparation Module

## Phase 4.4.2.6 - Enterprise Training Pipeline

### Overview
The Training Pipeline Preparation module provides a complete workflow for preparing AI model training jobs without executing actual training. This module validates datasets, models, configurations, estimates resources, generates checkpoint strategies, and queues pipelines for future training execution.

---

## Architecture

### Components

1. **TrainingPipelineService** - Core business logic for pipeline management
2. **TrainingPipelineController** - REST API endpoints with JWT authentication
3. **DTOs** - Data transfer objects with validation
4. **Database** - Prisma schema entities (TrainingPipeline, TrainingSession, PipelineStageLog)

---

## Pipeline Workflow

```
Dataset Ready
    ↓
Base Model Selected
    ↓
Compatibility Passed
    ↓
Training Ready
    ↓
Pipeline Prepared
    ↓
Waiting for Training Job
```

---

## Pipeline Stages

- **PENDING** - Initial state, awaiting validation
- **VALIDATED** - All validation checks passed
- **QUEUED** - Pipeline queued for execution
- **WAITING** - Waiting for resources or dependencies
- **PREPARED** - Fully prepared and ready
- **COMPLETED** - Pipeline execution completed
- **FAILED** - Pipeline failed validation or execution
- **CANCELLED** - Pipeline cancelled by user

---

## Pipeline Status

- **PENDING** - Initial status
- **VALIDATING** - Validation in progress
- **VALID** - Validation passed
- **INVALID** - Validation failed
- **PREPARING** - Preparation in progress
- **PREPARED** - Fully prepared
- **QUEUED** - In execution queue
- **WAITING** - Waiting state
- **PAUSED** - Paused by user
- **CANCELLED** - Cancelled
- **COMPLETED** - Completed
- **FAILED** - Failed

---

## API Endpoints

### Create Pipeline
```http
POST /api/training-pipeline
Authorization: Bearer <token>
Content-Type: application/json

{
  "trainingSessionId": "uuid",
  "pipelineName": "My Training Pipeline",
  "datasetId": "uuid",
  "modelRegistryId": "uuid",
  "trainingConfigurationId": "uuid",
  "workspaceId": "workspace-id",
  "executionProvider": "LOCAL_GPU",
  "storageProvider": "local"
}
```

### Get All Pipelines
```http
GET /api/training-pipeline?sessionId=uuid&status=PREPARED&stage=VALIDATED
Authorization: Bearer <token>
```

### Get Pipeline by ID
```http
GET /api/training-pipeline/:id
Authorization: Bearer <token>
```

### Get Pipeline Summary
```http
GET /api/training-pipeline/:id/summary
Authorization: Bearer <token>
```

### Update Pipeline
```http
PUT /api/training-pipeline/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "pipelineName": "Updated Pipeline Name",
  "pipelineStatus": "PREPARED",
  "resourceEstimation": { ... },
  "checkpointPlan": { ... }
}
```

### Delete Pipeline
```http
DELETE /api/training-pipeline/:id
Authorization: Bearer <token>
```

### Cancel Pipeline
```http
POST /api/training-pipeline/:id/cancel
Authorization: Bearer <token>
```

### Validate Pipeline
```http
POST /api/training-pipeline/:id/validate
Authorization: Bearer <token>
```

### Prepare Training Session
```http
POST /api/training-pipeline/prepare-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "trainingSessionId": "uuid",
  "skipValidation": false,
  "autoEstimateResources": true,
  "autoGenerateCheckpointPlan": true
}
```

### Estimate Resources
```http
POST /api/training-pipeline/estimate-resources
Authorization: Bearer <token>
Content-Type: application/json

{
  "datasetId": "uuid",
  "modelRegistryId": "uuid",
  "trainingConfigurationId": "uuid",
  "batchSize": 16,
  "epochs": 3
}
```

### Generate Checkpoint Plan
```http
POST /api/training-pipeline/generate-checkpoint-plan
Authorization: Bearer <token>
Content-Type: application/json

{
  "durationHours": 10,
  "totalSteps": 10000,
  "intervalPreference": "frequent",
  "storageConstraintGB": 100
}
```

### Queue Pipeline
```http
POST /api/training-pipeline/queue
Authorization: Bearer <token>
Content-Type: application/json

{
  "pipelineId": "uuid",
  "priority": 5,
  "dependencies": ["pipeline-uuid-1"]
}
```

### Get Training Session
```http
GET /api/training-pipeline/session/:sessionId
Authorization: Bearer <token>
```

---

## Validation Checks

The pipeline validates the following:

1. **Dataset Validation**
   - Dataset exists
   - Dataset is validated (status = VALIDATED)
   - Dataset has sufficient records

2. **Model Validation**
   - Model exists
   - Model is active (status = ACTIVE)
   - Model is accessible

3. **Configuration Validation**
   - Training configuration exists (if provided)
   - Configuration is valid

4. **Compatibility Validation**
   - Dataset language matches model supported languages
   - Dataset type compatible with model type
   - Version compatibility checks

5. **Readiness Validation**
   - All above validations passed
   - No critical blockers

6. **Workspace Validation**
   - Workspace ID is provided
   - Workspace is accessible

---

## Resource Estimation

The module estimates the following resources:

- **GPU Memory** - Based on model size (4x model size)
- **System RAM** - Based on GPU memory (2x GPU memory)
- **Disk Space** - Model size + dataset size + checkpoints
- **CPU Cores** - Based on batch size (batch_size / 4)
- **Checkpoint Storage** - Based on model size (5x model size)
- **Training Duration** - Based on dataset size, epochs, and batch size

### Estimation Formula

```javascript
// GPU Memory
gpuMemoryGB = modelSizeGB * 4

// System RAM
ramGB = gpuMemoryGB * 2

// Disk Space
diskSpaceGB = modelSizeGB * 10 + recordCount * 0.001

// CPU Cores
cpuCores = max(4, ceil(batchSize / 4))

// Checkpoint Storage
checkpointStorageGB = modelSizeGB * 5

// Duration
stepsPerEpoch = ceil(recordCount / batchSize)
totalSteps = stepsPerEpoch * epochs
durationHours = (totalSteps * secondsPerStep) / 3600
```

---

## Checkpoint Plan

The checkpoint plan defines the strategy for saving model checkpoints during training:

### Default Configuration

```json
{
  "checkpointInterval": 500,
  "maxCheckpoints": 3,
  "checkpointNaming": "step",
  "retentionPolicy": "KEEP_BEST",
  "autoCleanup": true,
  "pathPattern": "checkpoints/step-{step}"
}
```

### Checkpoint Strategies

- **checkpointInterval** - Save checkpoint every N steps
- **maxCheckpoints** - Maximum number of checkpoints to keep
- **checkpointNaming** - Naming convention (step, epoch, timestamp)
- **retentionPolicy** - KEEP_BEST, KEEP_LATEST, KEEP_ALL
- **autoCleanup** - Automatically delete old checkpoints
- **pathPattern** - Path template for checkpoint files

---

## Retry Policy

The retry policy defines how the pipeline handles failures:

```json
{
  "maxRetries": 3,
  "backoffStrategy": "EXPONENTIAL",
  "initialDelaySeconds": 10,
  "maxDelaySeconds": 300,
  "retryOnErrors": ["TRANSIENT_ERROR", "NETWORK_ERROR"]
}
```

---

## Queue Management

The pipeline supports sophisticated queue management:

- **Priority** - Pipeline priority (0-10)
- **Queue Position** - Position in the queue
- **Dependencies** - List of pipeline IDs that must complete first
- **Execution Order** - Order of execution
- **Queue Status** - Current queue state

### Queue Status Values

- **PENDING** - Not yet queued
- **QUEUED** - In the queue
- **WAITING** - Waiting for dependencies
- **PREPARING** - Preparing for execution
- **PAUSED** - Paused
- **CANCELLED** - Removed from queue
- **COMPLETED** - Execution completed
- **FAILED** - Execution failed

---

## Execution Providers (Future Support)

The module is architected to support multiple execution providers:

- **LOCAL_GPU** - Local GPU execution
- **GOOGLE_COLAB** - Google Colab notebooks
- **RUNPOD** - RunPod cloud GPUs
- **VAST_AI** - Vast.ai GPU marketplace
- **AWS_SAGEMAKER** - AWS SageMaker
- **AZURE_ML** - Azure Machine Learning
- **LAMBDA_LABS** - Lambda Labs GPUs
- **PAPERSPACE** - Paperspace Gradient

> **Note**: Provider integrations are not implemented. This is architectural preparation only.

---

## Storage Providers (Future Support)

The module is architected to support multiple storage providers:

- **local** - Local file system
- **s3** - Amazon S3
- **azure-blob** - Azure Blob Storage
- **gcs** - Google Cloud Storage

> **Note**: Storage integrations are not implemented. This is architectural preparation only.

---

## Audit Logging

All pipeline operations are tracked in audit logs:

- **PIPELINE_CREATED** - Pipeline created
- **PIPELINE_UPDATED** - Pipeline updated
- **PIPELINE_PREPARED** - Pipeline prepared
- **PIPELINE_QUEUED** - Pipeline queued
- **PIPELINE_CANCELLED** - Pipeline cancelled
- **PIPELINE_DELETED** - Pipeline deleted

Each audit log includes:
- Company ID
- User ID
- Entity Type (TRAINING_PIPELINE)
- Entity ID (Pipeline ID)
- Action
- Timestamp
- Details (operation-specific data)

---

## Database Schema

### TrainingPipeline

```prisma
model TrainingPipeline {
  id                        String
  companyId                 String
  workspaceId               String?
  trainingSessionId         String
  pipelineName              String
  pipelineIdentifier        String
  pipelineStage             TrainingPipelineStage
  pipelineStatus            TrainingPipelineStatus
  datasetId                 String
  modelRegistryId           String
  trainingConfigurationId   String?
  
  // Validation
  datasetValid              Boolean
  modelValid                Boolean
  configurationValid        Boolean
  compatibilityValid        Boolean
  readinessValid            Boolean
  workspaceValid            Boolean
  validationPassed          Boolean
  
  // Resource Estimation
  resourceEstimation        Json?
  
  // Checkpoint Plan
  checkpointPlan            Json?
  
  // Queue Management
  queuePosition             Int?
  queueStatus               TrainingQueueStatus
  
  // Retry Configuration
  retryPolicy               Json?
  retryCount                Int
  maxRetries                Int
  
  // Execution
  executionProvider         String?
  storageProvider           String?
  
  // Timestamps
  createdAt                 DateTime
  updatedAt                 DateTime
  preparedAt                DateTime?
  validatedAt               DateTime?
  cancelledAt               DateTime?
}
```

### TrainingSession

```prisma
model TrainingSession {
  id                        String
  companyId                 String
  workspaceId               String?
  sessionName               String
  sessionIdentifier         String
  datasetId                 String
  modelRegistryId           String
  trainingConfigurationId   String?
  status                    TrainingSessionStatus
  queueStatus               TrainingQueueStatus
  
  // Resource Estimates
  estimatedGpuMemoryGB      Float?
  estimatedRamGB            Float?
  estimatedDiskGB           Float?
  estimatedCpuCores         Int?
  estimatedDurationHours    Float?
  
  // Checkpoint Config
  checkpointInterval        Int?
  maxCheckpoints            Int?
  checkpointNaming          String?
  
  pipelines                 TrainingPipeline[]
  logs                      TrainingSessionLog[]
}
```

---

## Frontend Components

### Training Pipeline Dashboard
- Location: `/dashboard/training/pipeline`
- Features:
  - Pipeline list with filters
  - Create new pipeline
  - Pipeline status overview
  - Queue management
  - Resource estimation display

### Pipeline Details Page
- Location: `/dashboard/training/pipeline/[id]`
- Features:
  - Pipeline timeline
  - Validation status
  - Resource estimation
  - Checkpoint plan
  - Configuration details
  - Action buttons (Validate, Queue, Cancel)

---

## Usage Examples

### 1. Create and Prepare a Pipeline

```typescript
// Step 1: Create a training session (if not exists)
const session = await fetch('/api/training-manager/training-versions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionName: 'My Training Session',
    datasetId: 'dataset-uuid',
    modelRegistryId: 'model-uuid',
    trainingConfigurationId: 'config-uuid'
  })
});

// Step 2: Prepare the pipeline
const pipeline = await fetch('/api/training-pipeline/prepare-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    trainingSessionId: session.id,
    autoEstimateResources: true,
    autoGenerateCheckpointPlan: true
  })
});

// Step 3: Queue the pipeline
await fetch('/api/training-pipeline/queue', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pipelineId: pipeline.id,
    priority: 5
  })
});
```

### 2. Validate Existing Pipeline

```typescript
const validation = await fetch(`/api/training-pipeline/${pipelineId}/validate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (validation.overallValid) {
  console.log('Pipeline is ready for training');
} else {
  console.error('Validation failed:', validation.errors);
  console.warn('Warnings:', validation.warnings);
  console.warn('Blockers:', validation.blockers);
}
```

### 3. Estimate Resources

```typescript
const estimation = await fetch('/api/training-pipeline/estimate-resources', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    datasetId: 'dataset-uuid',
    modelRegistryId: 'model-uuid',
    batchSize: 16,
    epochs: 3
  })
});

console.log('Required Resources:', {
  gpu: `${estimation.gpuMemoryGB} GB`,
  ram: `${estimation.ramGB} GB`,
  disk: `${estimation.diskSpaceGB} GB`,
  duration: `${estimation.durationHours} hours`
});
```

---

## Security

### Authentication
- All endpoints require JWT authentication
- Bearer token must be included in Authorization header

### Authorization
- Role-based access control (RBAC)
- Roles: `admin`, `training_manager`, `training_viewer`
- Admin and training_manager can create/update/delete
- All roles can view pipelines

### Data Isolation
- All operations are scoped to company ID
- Users can only access pipelines within their company

---

## Error Handling

The module provides comprehensive error handling:

- **400 Bad Request** - Invalid input data
- **401 Unauthorized** - Missing or invalid authentication
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Pipeline, session, dataset, or model not found
- **409 Conflict** - Validation failed or state conflict
- **500 Internal Server Error** - Server error

---

## Testing

### Unit Tests
```bash
npm run test -- training-pipeline.service.spec.ts
```

### Integration Tests
```bash
npm run test:e2e -- training-pipeline.e2e-spec.ts
```

### Manual Testing
1. Navigate to `/dashboard/training/pipeline`
2. Click "Prepare Pipeline"
3. Select a training session
4. Verify pipeline creation
5. Validate the pipeline
6. Check resource estimation
7. Review checkpoint plan
8. Queue the pipeline
9. Verify audit logs

---

## Maintenance

### Adding New Validation Rules
Edit `validatePipeline` method in `training-pipeline.service.ts`

### Modifying Resource Estimation
Edit `estimateResources` method in `training-pipeline.service.ts`

### Updating Checkpoint Strategy
Edit `generateCheckpointPlan` method in `training-pipeline.service.ts`

### Adding New Pipeline Stage
1. Update `TrainingPipelineStage` enum in DTO
2. Update Prisma schema enum
3. Run migration: `npm run db:migrate`
4. Update frontend status badges

---

## Future Enhancements

1. **Execution Provider Integration**
   - Implement actual provider connections
   - Add provider-specific configuration
   - Support provider switching

2. **Advanced Resource Optimization**
   - ML-based resource prediction
   - Historical data analysis
   - Cost optimization recommendations

3. **Pipeline Templates**
   - Save pipeline configurations as templates
   - Share templates across teams
   - Community template marketplace

4. **Real-time Monitoring**
   - WebSocket-based live updates
   - Progress tracking
   - Performance metrics

5. **Advanced Queue Management**
   - Dynamic priority adjustment
   - Resource-aware scheduling
   - Dependency graph visualization

---

## Support

For issues or questions:
- Check logs in `/api/logs`
- Review audit logs in `/api/audit-logs`
- Contact: support@aicallingagent.com

---

## License

Proprietary - AI Calling Agent Platform
© 2024 All Rights Reserved
