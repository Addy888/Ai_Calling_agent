# Enterprise Training Strategy Engine

## Phase 4.4.3.3 - Complete Implementation

### Overview

The Training Strategy Engine is a comprehensive module that allows administrators to define **HOW** the AI model will be trained in the future. This module prepares strategy configurations only and does not execute any training.

---

## Architecture

### Database Schema

The `TrainingStrategy` entity in Prisma schema includes:

- **Basic Information**: id, name, description, version
- **Strategy Configuration**: strategyType, pipelineType
- **Objectives**: primaryObjective, secondaryObjective, conversationObjective, etc.
- **Dataset Strategy**: primaryDatasetId, secondaryDatasetId, validationDatasetId
- **Sampling Strategy**: samplingStrategy, shuffleDataset, curriculumOrder
- **Loss Function**: lossFunction, labelSmoothing, weightedLoss
- **Training Flow**: stageOrder, evaluationBetweenStages, checkpointBetweenStages
- **Evaluation Strategy**: evaluationInterval, automaticBestModelSelection
- **Failure Strategy**: retryCount, rollbackStrategy, abortPolicy
- **Status & Validation**: status, isValidated, validationResult

### Backend Structure

```
training-manager/
├── controllers/
│   └── training-strategy.controller.ts
├── services/
│   └── training-strategy.service.ts
├── dto/
│   └── training-strategy.dto.ts
└── TRAINING_STRATEGY_README.md
```

---

## API Endpoints

### 1. Create Strategy
**POST** `/api/training/strategies`

Creates a new training strategy.

**Request Body**:
```json
{
  "name": "Customer Service Fine-Tuning Strategy",
  "description": "Strategy for improving customer service responses",
  "strategyType": "SUPERVISED_FINE_TUNING",
  "pipelineType": "SINGLE_STAGE",
  "primaryObjective": "Improve conversation quality",
  "primaryDatasetId": "uuid",
  "samplingStrategy": "RANDOM",
  "lossFunction": "CROSS_ENTROPY",
  "evaluationInterval": 100,
  "retryCount": 3,
  "rollbackStrategy": "LAST_CHECKPOINT",
  "abortPolicy": "MANUAL"
}
```

**Response**: Strategy object with ID

---

### 2. List Strategies
**GET** `/api/training/strategies`

List all training strategies with pagination and filters.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (enum): Filter by status (DRAFT, READY, VALIDATED, ARCHIVED)
- `strategyType` (string): Filter by strategy type

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 3. Get Strategy
**GET** `/api/training/strategies/:id`

Get a single strategy with full details including related entities.

**Response**: Strategy object with relationships (datasets, configs, audit logs)

---

### 4. Update Strategy
**PUT** `/api/training/strategies/:id`

Update an existing strategy.

**Request Body**: Partial strategy object

**Response**: Updated strategy object

---

### 5. Delete Strategy
**DELETE** `/api/training/strategies/:id`

Delete a strategy (soft delete with audit trail).

**Response**: 204 No Content

---

### 6. Validate Strategy
**POST** `/api/training/strategies/:id/validate`

Validate a strategy configuration.

**Response**:
```json
{
  "strategy": {...},
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "checks": {
      "hasStrategyType": true,
      "hasPrimaryObjective": true,
      "hasPrimaryDataset": true,
      "hasFineTuningConfig": true,
      "hasHyperparameterConfig": true
    }
  }
}
```

---

### 7. Get Statistics
**GET** `/api/training/strategies/statistics`

Get strategy statistics for the dashboard.

**Response**:
```json
{
  "total": 25,
  "validated": 15,
  "byStatus": {
    "DRAFT": 5,
    "READY": 8,
    "VALIDATED": 10,
    "ARCHIVED": 2
  },
  "byType": {
    "SUPERVISED_FINE_TUNING": 12,
    "INSTRUCTION_TUNING": 8,
    "CONVERSATION_FINE_TUNING": 5
  }
}
```

---

## Training Strategy Types

1. **SUPERVISED_FINE_TUNING**: Standard supervised fine-tuning
2. **INSTRUCTION_TUNING**: Fine-tuning for instruction following
3. **CONVERSATION_FINE_TUNING**: Optimized for conversational AI
4. **DOMAIN_ADAPTATION**: Adapt model to specific domain
5. **MULTI_TASK_LEARNING**: Train on multiple tasks simultaneously
6. **CONTINUAL_LEARNING**: Continuous learning without forgetting
7. **CURRICULUM_LEARNING**: Progressive difficulty training
8. **MULTI_STAGE_FINE_TUNING**: Multiple training stages
9. **ADAPTER_BASED_TRAINING**: Parameter-efficient training
10. **CUSTOM_STRATEGY**: Custom training approach

---

## Pipeline Types

1. **SINGLE_STAGE**: Single training stage
2. **MULTI_STAGE**: Multiple sequential stages
3. **SEQUENTIAL_TRAINING**: Sequential dataset training
4. **PARALLEL_DATASET_PREPARATION**: Parallel data processing
5. **HYBRID_STRATEGY**: Combination of approaches

---

## Sampling Strategies

1. **RANDOM**: Random sampling
2. **SEQUENTIAL**: Sequential sampling
3. **WEIGHTED**: Weighted sampling based on importance
4. **BALANCED**: Balanced across categories
5. **CURRICULUM**: Curriculum-based ordering
6. **ADAPTIVE**: Adaptive based on performance

---

## Loss Functions

1. **CROSS_ENTROPY**: Standard cross-entropy loss
2. **LABEL_SMOOTHING**: Cross-entropy with label smoothing
3. **WEIGHTED_LOSS**: Weighted loss for imbalanced data
4. **CUSTOM_LOSS**: Custom loss function placeholder

---

## Rollback Strategies

1. **LAST_CHECKPOINT**: Roll back to last checkpoint
2. **BEST_CHECKPOINT**: Roll back to best performing checkpoint
3. **SPECIFIC_CHECKPOINT**: Roll back to specific checkpoint
4. **NO_ROLLBACK**: No rollback on failure

---

## Abort Policies

1. **MANUAL**: Manual intervention required
2. **AUTOMATIC_ON_ERROR**: Abort automatically on error
3. **AUTOMATIC_ON_METRIC_THRESHOLD**: Abort if metrics don't meet threshold
4. **NEVER**: Never abort automatically

---

## Strategy Status

1. **DRAFT**: Initial draft state
2. **READY**: Configuration complete
3. **VALIDATED**: Validation passed
4. **ARCHIVED**: Archived strategy
5. **DEPRECATED**: Deprecated strategy

---

## Frontend Components

### Training Strategy Dashboard
**Path**: `/dashboard/training/strategy`

Features:
- List all strategies with filters
- Search by name/description
- Filter by type and status
- View statistics cards
- Quick actions (view, edit, delete)

### Strategy Creation Wizard
**Path**: `/dashboard/training/strategy/create`

Multi-step wizard with 8 steps:
1. **Basic Info**: Name, type, pipeline
2. **Objectives**: Training objectives
3. **Dataset**: Dataset assignment
4. **Sampling**: Sampling strategy
5. **Loss Function**: Loss configuration
6. **Evaluation**: Evaluation strategy
7. **Failure Handling**: Failure recovery
8. **Review**: Final review and create

### Strategy Detail View
**Path**: `/dashboard/training/strategy/[id]`

Features:
- Overview tab with key metrics
- Objectives tab with all objectives
- Datasets tab showing assigned datasets
- Configuration tab with evaluation and failure settings
- Audit log tab with change history
- Validate button to check readiness
- Edit and delete actions

---

## Validation Rules

### Required Fields
- Strategy type
- Primary objective
- Primary dataset

### Warnings
- Missing fine-tuning configuration
- Missing hyperparameter configuration
- Missing validation dataset

### Multi-Stage Validation
- Stage order required for multi-stage pipeline
- Dataset assignment recommended

### Dataset Validation
- Primary dataset must exist
- Secondary dataset must exist if referenced
- Validation dataset must exist if referenced

---

## Audit Logging

All actions are logged in `TrainingStrategyAuditLog`:

- **CREATED**: Strategy created
- **UPDATED**: Strategy updated
- **DELETED**: Strategy deleted
- **VALIDATED**: Validation executed
- **STATUS_CHANGED**: Status changed
- **DATASET_ASSIGNED**: Dataset assigned
- **OBJECTIVE_UPDATED**: Objective updated
- **EVALUATION_CONFIGURED**: Evaluation configured

Each log includes:
- Timestamp
- Performed by (user ID)
- Old values
- New values
- Calculated changes

---

## Integration Points

### With Dataset Manager
- References `TrainingDataset` for primary, secondary, and validation datasets
- Validates dataset existence before assignment

### With Fine-Tuning Configuration
- Optional reference to `FineTuningConfiguration`
- Includes method, taskType, and technique settings

### With Hyperparameter Configuration
- Optional reference to `HyperparameterConfiguration`
- Includes learning rate, batch size, epochs, etc.

### With Model Registry
- Strategy can reference models through configurations
- Enables model-specific training strategies

---

## Security & RBAC

- All endpoints protected with JWT authentication
- Company-level data isolation
- User actions tracked in audit logs
- RBAC support through existing permission system

---

## Usage Example

### Creating a Strategy

```typescript
const strategy = {
  name: "Customer Service Fine-Tuning v1",
  description: "Improve customer service agent responses",
  strategyType: "SUPERVISED_FINE_TUNING",
  pipelineType: "SINGLE_STAGE",
  primaryObjective: "Enhance response accuracy and empathy",
  secondaryObjective: "Reduce response time",
  primaryDatasetId: "dataset-uuid-123",
  validationDatasetId: "dataset-uuid-456",
  samplingStrategy: "BALANCED",
  lossFunction: "CROSS_ENTROPY",
  evaluationInterval: 100,
  automaticBestModelSelection: true,
  retryCount: 3,
  rollbackStrategy: "BEST_CHECKPOINT",
  abortPolicy: "AUTOMATIC_ON_ERROR"
};

const response = await fetch('/api/training/strategies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(strategy)
});
```

### Validating a Strategy

```typescript
const response = await fetch(`/api/training/strategies/${strategyId}/validate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { validation } = await response.json();

if (validation.isValid) {
  console.log('Strategy is ready for execution');
} else {
  console.error('Validation errors:', validation.errors);
  console.warn('Validation warnings:', validation.warnings);
}
```

---

## Testing

### Backend Tests
Run NestJS tests:
```bash
npm run test --workspace=apps/api
```

### Frontend Tests
Run Next.js build:
```bash
npm run build --workspace=apps/web
```

### Database Tests
Generate Prisma client:
```bash
npm run db:generate
```

---

## Future Enhancements

1. **Strategy Templates**: Pre-built strategy templates
2. **Strategy Versioning**: Track strategy versions over time
3. **Strategy Comparison**: Compare multiple strategies
4. **Strategy Recommendations**: AI-powered strategy suggestions
5. **Performance Tracking**: Track strategy effectiveness
6. **Strategy Scheduling**: Schedule strategy execution
7. **Strategy Dependencies**: Define strategy dependencies
8. **Import/Export**: Import/export strategies as JSON

---

## Troubleshooting

### Common Issues

1. **Validation Fails**
   - Ensure all required fields are provided
   - Check that referenced datasets exist
   - Verify fine-tuning and hyperparameter configs if referenced

2. **Strategy Not Found**
   - Verify strategy ID is correct
   - Check user has access to the company
   - Ensure strategy hasn't been deleted

3. **Update Fails**
   - Check for concurrent updates
   - Verify all referenced entities exist
   - Review validation errors

---

## Conclusion

The Enterprise Training Strategy Engine provides a comprehensive, production-ready solution for defining training strategies. It is fully integrated with the existing AI Training Center and follows enterprise best practices for security, validation, and audit logging.

**Status**: ✅ **Phase 4.4.3.3 Complete**

---

## Support

For issues or questions, refer to:
- API Documentation: `/api/docs` (Swagger UI)
- Database Schema: `database/prisma/schema.prisma`
- Frontend Components: `apps/web/src/app/dashboard/training/strategy/`
- Backend Services: `apps/api/src/modules/training-manager/`
