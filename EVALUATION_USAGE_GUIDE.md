# AI Evaluation Engine - Usage Guide

## Quick Start

### 1. Evaluate a Conversation

```bash
POST /api/evaluation/evaluate
Content-Type: application/json
Authorization: Bearer <token>

{
  "conversationId": "conv_123456",
  "sessionId": "session_789"
}
```

**Response:**
```json
{
  "id": "eval_123",
  "conversationId": "conv_123456",
  "overallScore": 85.5,
  "conversationScore": 88.0,
  "scriptComplianceScore": 92.0,
  "knowledgeAccuracyScore": 83.0,
  "decisionAccuracyScore": 87.0,
  "leadQualityScore": 90.0,
  "memoryUsageScore": 85.0,
  "businessRuleScore": 95.0,
  "safetyScore": 88.0,
  "confidenceScore": 0.82,
  "evaluationStatus": "COMPLETED",
  "issues": [...],
  "recommendations": [...],
  "evaluatedAt": "2024-01-15T10:30:00Z"
}
```

### 2. Get Evaluation Report

```bash
GET /api/evaluation/report/:conversationId
Authorization: Bearer <token>
```

Returns complete evaluation with all sub-evaluations included.

### 3. View Analytics

```bash
GET /api/evaluation/analytics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

Returns historical evaluation data for the date range.

### 4. Get Configuration

```bash
GET /api/evaluation/configuration
Authorization: Bearer <token>
```

**Response:**
```json
{
  "enableAutoEvaluation": true,
  "minimumScoreThreshold": 70.0,
  "hallucinationThreshold": 0.3,
  "confidenceThreshold": 0.7,
  "scriptComplianceWeight": 0.15,
  "knowledgeAccuracyWeight": 0.20,
  "decisionAccuracyWeight": 0.20,
  "conversationQualityWeight": 0.15,
  "leadQualityWeight": 0.10,
  "safetyWeight": 0.10,
  "businessRuleWeight": 0.05,
  "memoryWeight": 0.05
}
```

### 5. Update Configuration

```bash
PUT /api/evaluation/configuration
Content-Type: application/json
Authorization: Bearer <token>

{
  "minimumScoreThreshold": 75.0,
  "knowledgeAccuracyWeight": 0.25,
  "decisionAccuracyWeight": 0.25
}
```

## Frontend Pages

### Main Dashboard
**URL**: `/dashboard/evaluation`

Features:
- Overall performance metrics
- Score breakdown by category
- Quality indicators
- Daily evaluation history
- Trends and analytics

### Evaluation Detail
**URL**: `/dashboard/evaluation/:conversationId`

Features:
- Complete score breakdown
- Conversation analysis details
- Confidence metrics
- Identified issues with severity
- AI-generated recommendations

### Configuration
**URL**: `/dashboard/evaluation/configuration`

Features:
- Toggle auto-evaluation
- Set score thresholds
- Adjust category weights
- Configure safety thresholds

## Score Interpretation

### Overall Score Ranges
- **90-100**: Excellent - Conversation quality is exceptional
- **75-89**: Good - Conversation quality meets standards
- **60-74**: Fair - Improvement needed
- **0-59**: Poor - Significant issues detected

### Category Scores

#### Conversation Score (0-100)
- Greeting quality
- Flow smoothness
- Question handling
- Answer relevance
- Closing quality
- Customer experience

#### Script Compliance (0-100)
- Correct script usage
- Valid branch following
- Required steps completed
- No invalid steps
- Rule compliance

#### Knowledge Accuracy (0-100)
- Relevant knowledge retrieved
- High confidence scores
- No missing knowledge
- Valid usage

#### Decision Accuracy (0-100)
- Intent detection accuracy
- Entity extraction accuracy
- Action selection accuracy
- Minimal fallback usage

#### Lead Quality (0-100)
- Accurate qualification
- High category confidence
- Complete information
- No contradictions

#### Safety Score (0-100)
- No unsafe responses
- Low hallucination risk
- Policy compliance
- Valid decisions

#### Confidence Score (0-1)
- Intent confidence
- Knowledge confidence
- Decision confidence
- Conversation confidence

## Issue Severity Levels

### CRITICAL
- Immediate action required
- System may generate unsafe content
- High hallucination risk (>0.4)

### HIGH
- Urgent attention needed
- Poor performance in key areas
- Multiple rule violations

### MEDIUM
- Should be addressed soon
- Performance below optimal
- Minor compliance issues

### LOW
- Monitor for trends
- Minor improvements possible
- No immediate impact

## Recommendations

The system automatically generates recommendations based on:
- Score thresholds
- Issue patterns
- Performance trends
- Safety concerns

Example recommendations:
```json
[
  {
    "priority": "HIGH",
    "category": "KNOWLEDGE_BASE",
    "recommendation": "Expand knowledge base and improve retrieval accuracy",
    "details": [...]
  },
  {
    "priority": "CRITICAL",
    "category": "SAFETY",
    "recommendation": "Reduce hallucination risk through better knowledge grounding",
    "details": [...]
  }
]
```

## Best Practices

### 1. Regular Evaluation
- Enable auto-evaluation for all conversations
- Review evaluation reports daily
- Monitor trends weekly

### 2. Configuration Tuning
- Adjust weights based on business priorities
- Set appropriate thresholds
- Review configuration monthly

### 3. Issue Management
- Address CRITICAL issues immediately
- Plan HIGH priority improvements
- Monitor MEDIUM issues for patterns

### 4. Continuous Improvement
- Use recommendations for training
- Update knowledge base based on gaps
- Refine scripts based on compliance issues
- Improve prompts based on decision accuracy

### 5. Safety First
- Always prioritize safety score
- Monitor hallucination risk closely
- Ensure policy compliance
- Review low confidence decisions

## Integration Example

```typescript
// After a conversation completes
async function evaluateConversation(conversationId: string, sessionId: string) {
  try {
    const response = await fetch('/api/evaluation/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversationId, sessionId })
    });
    
    const evaluation = await response.json();
    
    // Check if score is below threshold
    if (evaluation.overallScore < 70) {
      console.warn('Low quality conversation detected:', conversationId);
      // Trigger alerts or notifications
    }
    
    // Check safety score
    if (evaluation.safetyScore < 80) {
      console.error('Safety concern in conversation:', conversationId);
      // Immediate review required
    }
    
    return evaluation;
  } catch (error) {
    console.error('Evaluation failed:', error);
  }
}
```

## Troubleshooting

### Evaluation Not Running
1. Check if conversation session exists
2. Verify conversation is completed
3. Ensure all required data is present
4. Check service logs for errors

### Low Scores
1. Review detailed breakdown
2. Check specific category issues
3. Review conversation timeline
4. Examine decision logs

### Configuration Issues
1. Ensure weights sum to 1.0
2. Verify thresholds are reasonable
3. Check company-specific settings
4. Review audit logs

## Performance Optimization

### Database Queries
- Evaluations are indexed by conversationId
- History aggregated by date
- Use date ranges for analytics

### Caching
- Configuration is cached per company
- Analytics can be cached for recent periods

### Batch Processing
- Evaluate multiple conversations in parallel
- Use queue for async evaluation
- Process during low-traffic periods

## Monitoring

### Key Metrics to Monitor
- Average overall score
- Evaluation success rate
- Processing time
- Issue frequency
- Safety incidents

### Alerts
- Score below threshold
- Safety score < 70
- Hallucination risk > 0.4
- Multiple CRITICAL issues

## Support

For issues or questions:
1. Check evaluation logs
2. Review configuration
3. Examine conversation data
4. Contact system administrator

---

**The AI Evaluation Engine ensures every conversation meets quality standards and helps continuously improve the AI system.**
