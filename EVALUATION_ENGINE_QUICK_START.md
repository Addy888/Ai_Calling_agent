# Enterprise Training Validation & Evaluation Engine
# QUICK START GUIDE

## 🚀 Getting Started

### Access the Evaluation System

**Frontend:**
- Training Evaluations: `http://localhost:3000/dashboard/training/evaluation`
- Conversation Evaluations: `http://localhost:3000/dashboard/evaluation`

**API Base URL:**
- `http://localhost:3000/api/training-manager/evaluations`

---

## 📍 Key Endpoints

```
# Create new evaluation
POST /training-manager/evaluations

# List all evaluations (with filters)
GET /training-manager/evaluations?evaluationType=FINAL_MODEL&page=1&limit=20

# Get specific evaluation
GET /training-manager/evaluations/:id

# Get evaluation report
GET /training-manager/evaluations/:id/report

# Update evaluation
PUT /training-manager/evaluations/:id

# Delete evaluation
DELETE /training-manager/evaluations/:id

# Approve evaluation
POST /training-manager/evaluations/:id/approve

# Reject evaluation
POST /training-manager/evaluations/:id/reject

# Compare two models
POST /training-manager/evaluations/compare

# Get validation rules
GET /training-manager/evaluations/validation-rules

# Update validation rules
PUT /training-manager/evaluations/validation-rules
```

---

## 📊 Evaluation Types

| Type | Code | Use Case |
|------|------|----------|
| Pre-Training | `PRE_TRAINING` | Validate before training |
| Training | `TRAINING` | Monitor during training |
| Post-Training | `POST_TRAINING` | Validate after training |
| Final Model | `FINAL_MODEL` | Complete validation |
| Regression | `REGRESSION` | Test against previous |
| Benchmark | `BENCHMARK` | Compare to standards |
| Human | `HUMAN` | Human evaluation |

---

## 📈 Metrics Overview

**35 Total Metrics Across:**
- 8 Training Metrics (Loss, Accuracy, F1, etc.)
- 15 LLM Quality Metrics (BLEU, ROUGE, Hallucination, etc.)
- 10 AI Agent Metrics (Greeting, Objection, Empathy, etc.)
- 2 Performance Metrics (Latency, Memory)

---

## ✅ Approval Workflow

```
DRAFT
  ↓
PENDING_REVIEW
  ↓
APPROVED → PRODUCTION_READY
  ↓
REJECTED / NEEDS_RETRAINING
```

---

## 🔑 Authentication

All requests require JWT authentication:

```bash
Authorization: Bearer {your_jwt_token}
```

---

## 📝 Create Evaluation Example

```json
POST /training-manager/evaluations
{
  "trainingSessionId": "session-123",
  "modelRegistryId": "model-456",
  "evaluationType": "FINAL_MODEL",
  "name": "AI Agent v2.0 - Final Validation",
  "description": "Complete final model evaluation"
}
```

**Response:**
```json
{
  "id": "eval-123",
  "overallScore": 92.5,
  "approvalStatus": "DRAFT",
  "metrics": { ... },
  "validationSummary": { ... },
  "recommendations": [ ... ]
}
```

---

## 🎯 Configure Validation Rules

```json
PUT /training-manager/evaluations/validation-rules
{
  "minimumAccuracy": 85,
  "minimumF1": 0.80,
  "maximumLoss": 0.3,
  "maximumHallucinationRate": 0.15,
  "minimumConversationScore": 80,
  "minimumResponseScore": 75,
  "minimumKnowledgeScore": 85
}
```

---

## 🔄 Compare Models

```json
POST /training-manager/evaluations/compare
{
  "modelAId": "model-new",
  "modelBId": "model-old",
  "metrics": ["accuracy", "f1Score", "conversationQuality"]
}
```

**Response includes:**
- Side-by-side metrics
- Improvement percentages
- Regression detection
- Overall winner

---

## ✅ Approve Evaluation

```json
POST /training-manager/evaluations/:id/approve
{
  "approvedBy": "user-789",
  "comments": "Excellent results - approved for production"
}
```

---

## ❌ Reject Evaluation

```json
POST /training-manager/evaluations/:id/reject
{
  "rejectedBy": "user-789",
  "reason": "Accuracy below threshold",
  "requiresRetraining": true
}
```

---

## 📊 Evaluation Report Structure

```json
{
  "id": "eval-123",
  "evaluationType": "FINAL_MODEL",
  "overallScore": 92.5,
  
  "validationSummary": {
    "passed": true,
    "passedRules": ["Accuracy ≥ 85%", "F1 ≥ 0.80"],
    "failedRules": [],
    "warnings": ["Latency slightly high"]
  },
  
  "metrics": {
    "accuracy": 94.2,
    "f1Score": 0.915,
    "conversationQuality": 92.3,
    // ... 32 more metrics
  },
  
  "benchmarks": {
    "currentModel": { ... },
    "previousModel": { ... },
    "baseModel": { ... }
  },
  
  "strengths": [
    "Excellent conversation quality (92.3%)",
    "High knowledge accuracy (89%)"
  ],
  
  "weaknesses": [
    "Slight latency in complex queries"
  ],
  
  "recommendations": [
    "Optimize for reduced latency",
    "Deploy to staging for real-world testing"
  ],
  
  "approvalStatus": "APPROVED"
}
```

---

## 🎨 Frontend Features

### Evaluation Dashboard (`/dashboard/training/evaluation`)
- View all evaluations
- Filter by type, status
- Search by name
- Create new evaluation
- View statistics

### Features:
- ✅ Statistics cards
- ✅ Search and filters
- ✅ Sortable table
- ✅ Status badges
- ✅ Progress bars
- ✅ Quick actions

---

## 🔧 Configuration

### Default Validation Rules
```
Minimum Accuracy: 85%
Minimum F1: 0.80
Maximum Loss: 0.3
Maximum Hallucination: 15%
Minimum Conversation Score: 80
Minimum Response Score: 75
Minimum Knowledge Score: 85
```

### Benchmark Models
- Current Model (being evaluated)
- Previous Model (last version)
- Base Model (pre-trained)
- Production Model (currently deployed)
- Best Model (historical best)

---

## 📦 Data Storage

Currently stores in `TrainingSession.metadata` as JSON.

**Future:** Dedicated `TrainingEvaluation` Prisma model recommended.

---

## 🛠️ Troubleshooting

### TypeScript Warnings
Decorator warnings are expected with TypeScript 5.x. They don't affect functionality.

### Authentication Errors
Ensure JWT token is valid and included in Authorization header.

### Not Found Errors
Verify training session and model registry IDs exist.

---

## 📚 Additional Resources

- Full Implementation: `TRAINING_EVALUATION_COMPLETE_IMPLEMENTATION.md`
- Completion Report: `PHASE_4.4.3.6_COMPLETION_REPORT.md`
- API Docs: `http://localhost:3000/api/docs` (when server running)

---

**Version:** 1.0.0  
**Last Updated:** July 22, 2026  
**Status:** ✅ OPERATIONAL
