# Decision Engine API Documentation

## Base URL
`/api`

## Authentication
All endpoints require JWT Bearer token authentication.

---

## Decision Engine Core

### Evaluate Decision
Evaluates a complete decision for a conversation turn.

**Endpoint**: `POST /decision-engine/evaluate`

**Permissions**: `decision:evaluate`

**Request Body**:
```json
{
  "conversationId": "string (required)",
  "rawInput": "string (required)",
  "sessionId": "string (optional)",
  "callId": "string (optional)",
  "contactId": "string (optional)",
  "campaignId": "string (optional)",
  "scriptNodeId": "string (optional)",
  "conversationMemory": {
    "history": [],
    "currentIntent": "string",
    "entities": {}
  },
  "customerContext": {},
  "campaignContext": {},
  "metadata": {}
}
```

**Response**:
```json
{
  "id": "string",
  "detectedIntent": "INTERESTED | NOT_INTERESTED | ...",
  "intentConfidence": 0.92,
  "extractedEntities": [
    {
      "entityType": "BUDGET",
      "entityValue": "1 crore",
      "confidence": 0.89
    }
  ],
  "businessRules": [
    {
      "ruleId": "string",
      "ruleName": "string",
      "passed": true
    }
  ],
  "conversationAction": "CONTINUE_SCRIPT | ASK_NEXT_QUESTION | ...",
  "responsePlan": {
    "reason": "string",
    "decision": "string",
    "scriptNode": "string",
    "knowledgeContext": {},
    "requiredVariables": {},
    "nextAction": "string"
  },
  "leadQualification": "HOT_LEAD | WARM_LEAD | COLD_LEAD | ...",
  "confidenceScores": {
    "intent": 0.92,
    "knowledge": 0.75,
    "decision": 0.88,
    "conversation": 0.81,
    "overall": 0.84
  },
  "overallConfidence": 0.84,
  "fallbackTriggered": false,
  "fallbackReason": "string | null",
  "decisionReason": "string",
  "executionTime": 245,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Decision History
Retrieves historical decisions with filtering and pagination.

**Endpoint**: `GET /decision-engine/history`

**Permissions**: `decision:read`

**Query Parameters**:
- `conversationId` (optional)
- `contactId` (optional)
- `campaignId` (optional)
- `intent` (optional)
- `action` (optional)
- `leadQualification` (optional)
- `minConfidence` (optional, 0-1)
- `fallbackTriggered` (optional, boolean)
- `startDate` (optional, ISO date)
- `endDate` (optional, ISO date)
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 543,
    "pages": 28
  }
}
```

### Get Decision Metrics
Retrieves aggregated decision metrics.

**Endpoint**: `GET /decision-engine/metrics`

**Permissions**: `decision:read`

**Query Parameters**:
- `startDate` (optional, ISO date)
- `endDate` (optional, ISO date)

**Response**:
```json
{
  "totalDecisions": 12543,
  "intentDistribution": {
    "INTERESTED": 3421,
    "NOT_INTERESTED": 1089
  },
  "actionDistribution": {
    "CONTINUE_SCRIPT": 5234,
    "ASK_NEXT_QUESTION": 3421
  },
  "leadQualificationDistribution": {
    "HOT_LEAD": 342,
    "WARM_LEAD": 567
  },
  "averageConfidence": 0.873,
  "fallbackRate": 8.2,
  "averageExecutionTime": 234,
  "successRate": 91.8
}
```

---

## Intent Detection

### Detect Intent
Detects the intent from conversation input.

**Endpoint**: `POST /intent-detection/detect`

**Permissions**: `decision:evaluate`

**Request Body**:
```json
{
  "rawInput": "string (required)",
  "conversationId": "string (required)",
  "sessionId": "string (optional)",
  "scriptNodeId": "string (optional)",
  "conversationContext": {},
  "metadata": {}
}
```

**Response**:
```json
{
  "intent": "INTERESTED",
  "confidence": 0.92,
  "alternativeIntents": [
    { "intent": "NEED_DETAILS", "confidence": 0.78 }
  ],
  "contextFactors": {},
  "linguisticFeatures": {
    "wordCount": 15,
    "sentenceCount": 2,
    "hasQuestionMark": false
  },
  "sentimentScore": 0.8,
  "detectionMethod": "rule-based-nlp",
  "metadata": {}
}
```

### Get Intent Statistics
Retrieves intent detection statistics.

**Endpoint**: `GET /intent-detection/statistics`

**Permissions**: `decision:read`

**Query Parameters**:
- `startDate` (optional, ISO date)
- `endDate` (optional, ISO date)

**Response**:
```json
[
  {
    "intent": "INTERESTED",
    "count": 3421,
    "averageConfidence": 0.89,
    "percentage": 35
  }
]
```

---

## Entity Extraction

### Extract Entities
Extracts entities from conversation input.

**Endpoint**: `POST /entity-extraction/extract`

**Permissions**: `decision:evaluate`

**Request Body**:
```json
{
  "rawInput": "string (required)",
  "conversationId": "string (required)",
  "decisionLogId": "string (required)",
  "previousEntities": {},
  "context": {},
  "metadata": {}
}
```

**Response**:
```json
{
  "entities": [
    {
      "entityType": "BUDGET",
      "entityValue": "1 crore",
      "confidence": 0.89,
      "startPosition": 45,
      "endPosition": 52,
      "normalizedValue": "10000000",
      "extractionMethod": "regex-pattern",
      "metadata": {}
    }
  ],
  "totalEntities": 3,
  "averageConfidence": 0.91,
  "metadata": {
    "extractionTime": 45,
    "inputLength": 87
  }
}
```

### Get Entity Statistics
Retrieves entity extraction statistics.

**Endpoint**: `GET /entity-extraction/statistics`

**Permissions**: `decision:read`

**Query Parameters**:
- `startDate` (optional, ISO date)
- `endDate` (optional, ISO date)

**Response**:
```json
[
  {
    "entityType": "BUDGET",
    "count": 4523,
    "averageConfidence": 0.89,
    "percentage": 32
  }
]
```

---

## Business Rules

### Create Business Rule
Creates a new business rule.

**Endpoint**: `POST /business-rules`

**Permissions**: `decision:manage`

**Request Body**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "ruleType": "LEAD_QUALIFICATION | COMPANY_POLICY | ...",
  "category": "string (required)",
  "conditions": {
    "intent": ["INTERESTED"],
    "entities": {
      "budget": { "min": 5000000 }
    }
  },
  "actions": {
    "setVariable": { "leadScore": 90 },
    "triggerAction": "qualify_hot_lead"
  },
  "priority": 10,
  "isActive": true,
  "validFrom": "2024-01-01T00:00:00.000Z",
  "validUntil": "2024-12-31T23:59:59.999Z",
  "metadata": {}
}
```

**Response**: Created business rule object

### Update Business Rule
Updates an existing business rule.

**Endpoint**: `PUT /business-rules/:id`

**Permissions**: `decision:manage`

**Request Body**: Same as create (all fields optional)

**Response**: Updated business rule object

### Delete Business Rule
Deletes a business rule.

**Endpoint**: `DELETE /business-rules/:id`

**Permissions**: `decision:manage`

**Response**: Deleted business rule object

### Get Business Rules
Retrieves all business rules with optional filtering.

**Endpoint**: `GET /business-rules`

**Permissions**: `decision:read`

**Query Parameters**:
- `ruleType` (optional)
- `category` (optional)

**Response**: Array of business rule objects

### Get Business Rule
Retrieves a specific business rule.

**Endpoint**: `GET /business-rules/:id`

**Permissions**: `decision:read`

**Response**: Business rule object

### Evaluate Business Rules
Evaluates business rules against context.

**Endpoint**: `POST /business-rules/evaluate`

**Permissions**: `decision:evaluate`

**Request Body**:
```json
{
  "conversationId": "string (required)",
  "decisionLogId": "string (optional)",
  "context": {},
  "intent": "string (optional)",
  "entities": {},
  "metadata": {}
}
```

**Response**:
```json
{
  "totalRules": 5,
  "rulesPassed": 3,
  "rulesFailed": 2,
  "results": [
    {
      "ruleId": "string",
      "ruleName": "string",
      "evaluationResult": true,
      "conditionsMet": {},
      "actionsExecuted": {},
      "executionTime": 12,
      "metadata": {}
    }
  ],
  "totalExecutionTime": 67
}
```

---

## Lead Qualification

### Qualify Lead
Qualifies a lead based on conversation data.

**Endpoint**: `POST /lead-qualification/qualify`

**Permissions**: `decision:evaluate`

**Request Body**:
```json
{
  "contactId": "string (required)",
  "conversationId": "string (required)",
  "decisionLogId": "string (optional)",
  "qualificationFactors": {
    "intent": "INTERESTED",
    "budget": "1 crore",
    "timeline": "immediate",
    "interest": 0.9,
    "engagement": 0.85,
    "responseQuality": 0.88,
    "informationProvided": ["name", "budget", "location"],
    "conversationLength": 8,
    "previousInteractions": 0
  },
  "previousQualification": "COLD_LEAD",
  "customWeights": {},
  "metadata": {}
}
```

**Response**:
```json
{
  "qualification": "HOT_LEAD",
  "score": 92,
  "qualificationFactors": {},
  "qualificationRules": [
    {
      "ruleId": "string",
      "ruleName": "string",
      "passed": true,
      "impact": 25
    }
  ],
  "previousQualification": "COLD_LEAD",
  "confidenceScore": 0.91,
  "recommendedAction": "Immediate follow-up with detailed proposal",
  "followUpDate": "2024-01-02T10:00:00.000Z",
  "metadata": {}
}
```

### Get Lead Statistics
Retrieves lead qualification statistics.

**Endpoint**: `GET /lead-qualification/statistics`

**Permissions**: `decision:read`

**Query Parameters**:
- `startDate` (optional, ISO date)
- `endDate` (optional, ISO date)

**Response**:
```json
{
  "totalLeads": 1230,
  "qualificationDistribution": {
    "HOT_LEAD": 342,
    "WARM_LEAD": 567,
    "COLD_LEAD": 321
  },
  "averageScore": 67.5,
  "hotLeadsCount": 342,
  "warmLeadsCount": 567,
  "coldLeadsCount": 321,
  "conversionRate": 27.8,
  "averageConfidence": 0.86
}
```

---

## Fallback Engine

### Trigger Fallback
Triggers fallback mechanism when confidence is low.

**Endpoint**: `POST /fallback/trigger`

**Permissions**: `decision:evaluate`

**Request Body**:
```json
{
  "conversationId": "string (required)",
  "decisionLogId": "string (optional)",
  "triggerReason": "LOW_INTENT_CONFIDENCE | LOW_KNOWLEDGE_CONFIDENCE | ...",
  "confidenceScore": 0.45,
  "threshold": 0.7,
  "originalIntent": "INTERESTED",
  "recoveryAttempts": 1,
  "conversationContext": {},
  "metadata": {}
}
```

**Response**:
```json
{
  "id": "string",
  "triggerReason": "LOW_INTENT_CONFIDENCE",
  "fallbackAction": "CLARIFY",
  "actionParameters": {
    "message": "I want to make sure I understand correctly. Could you clarify?",
    "requestClarification": true
  },
  "wasSuccessful": true,
  "recoveryAttempts": 1,
  "confidenceScore": 0.45,
  "threshold": 0.7,
  "originalIntent": "INTERESTED",
  "metadata": {},
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Fallback Statistics
Retrieves fallback execution statistics.

**Endpoint**: `GET /fallback/statistics`

**Permissions**: `decision:read`

**Query Parameters**:
- `startDate` (optional, ISO date)
- `endDate` (optional, ISO date)

**Response**:
```json
{
  "totalFallbacks": 1234,
  "successfulFallbacks": 987,
  "failedFallbacks": 247,
  "successRate": 80,
  "reasonDistribution": {
    "LOW_INTENT_CONFIDENCE": 543,
    "LOW_OVERALL_CONFIDENCE": 321
  },
  "actionDistribution": {
    "CLARIFY": 456,
    "REPEAT": 234
  },
  "averageRecoveryAttempts": 1.3,
  "averageConfidence": 0.58
}
```

---

## Conversation Planner

### Plan Conversation
Plans the next conversation action.

**Endpoint**: `POST /conversation-planner/plan`

**Permissions**: `decision:evaluate`

**Request Body**:
```json
{
  "conversationId": "string (required)",
  "intent": "INTERESTED",
  "entities": {},
  "currentNodeId": "string (optional)",
  "conversationMemory": {},
  "businessRulesResults": {},
  "knowledgeResults": {},
  "context": {}
}
```

**Response**:
```json
{
  "action": "CONTINUE_SCRIPT",
  "actionParameters": {
    "nodeId": "budget_collection"
  },
  "shouldContinue": true,
  "shouldEndConversation": false,
  "escalationRequired": false,
  "currentNodeId": "qualification",
  "nextNodeId": "budget_collection",
  "reasoningSteps": [
    {
      "step": 1,
      "description": "Analyze detected intent",
      "outcome": "Intent: INTERESTED"
    }
  ],
  "alternativeActions": [
    {
      "action": "CLARIFY",
      "priority": 2,
      "reason": "If primary action fails, seek clarification"
    }
  ],
  "metadata": {}
}
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "statusCode": 400 | 401 | 403 | 404 | 500,
  "message": "Error message",
  "error": "Error type"
}
```

### Common Status Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting
All endpoints are subject to rate limiting based on company tier.

---

## Webhook Support
Decision events can be configured to trigger webhooks (future enhancement).

---

## SDK Support
Official SDKs available for:
- JavaScript/TypeScript
- Python
- Java
- PHP

---

## Support
For API support, contact: api-support@ai-calling-agent.com
