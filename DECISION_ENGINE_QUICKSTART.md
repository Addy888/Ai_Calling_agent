# AI Decision Engine - Quick Start Guide

## Overview
The AI Decision Engine is now fully integrated and ready to use. This guide will help you get started quickly.

---

## 🚀 Quick Start (5 Minutes)

### 1. Database Setup
```bash
cd apps/api
npm run db:generate
npm run db:push
```

### 2. Start Backend
```bash
npm run dev
```
Backend runs on: `http://localhost:3000`

### 3. Start Frontend
```bash
cd ../web
npm run dev
```
Frontend runs on: `http://localhost:3001`

### 4. Access Decision Engine
Navigate to: `http://localhost:3001/dashboard/decision-engine`

---

## 📊 Test the Engine

### Using the UI
1. Go to Decision Engine page
2. Enter test input: `"Yes, I'm interested in a 3 BHK apartment in Mumbai around 1 crore"`
3. Click "Evaluate Decision"
4. View results instantly

### Using API (cURL)
```bash
curl -X POST http://localhost:3000/api/decision-engine/evaluate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-123",
    "rawInput": "Yes, I need a 3 BHK in Mumbai",
    "sessionId": "session-456",
    "conversationMemory": {
      "history": [],
      "currentIntent": null
    },
    "customerContext": {},
    "campaignContext": {}
  }'
```

### Using JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3000/api/decision-engine/evaluate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversationId: 'conv-123',
    rawInput: 'Yes, I want to buy a property',
    sessionId: 'session-456',
    conversationMemory: {},
    customerContext: {},
    campaignContext: {}
  })
});

const decision = await response.json();
console.log('Intent:', decision.detectedIntent);
console.log('Confidence:', decision.intentConfidence);
console.log('Action:', decision.conversationAction);
console.log('Lead:', decision.leadQualification);
```

---

## 🎯 Common Use Cases

### 1. Detect Customer Intent
```typescript
// API: POST /intent-detection/detect
const intent = await detectIntent({
  rawInput: "I'm looking for a flat",
  conversationId: "conv-123"
});
// Returns: { intent: "INTERESTED", confidence: 0.89 }
```

### 2. Extract Entities
```typescript
// API: POST /entity-extraction/extract
const entities = await extractEntities({
  rawInput: "I need 3 BHK in Mumbai under 1 crore",
  conversationId: "conv-123",
  decisionLogId: "decision-456"
});
// Returns: [
//   { entityType: "PROPERTY_TYPE", entityValue: "3 BHK" },
//   { entityType: "CITY", entityValue: "Mumbai" },
//   { entityType: "BUDGET", entityValue: "1 crore" }
// ]
```

### 3. Qualify Lead
```typescript
// API: POST /lead-qualification/qualify
const qualification = await qualifyLead({
  contactId: "contact-123",
  conversationId: "conv-456",
  qualificationFactors: {
    intent: "INTERESTED",
    budget: "1 crore",
    timeline: "immediate",
    interest: 0.9,
    engagement: 0.85
  }
});
// Returns: {
//   qualification: "HOT_LEAD",
//   score: 92,
//   recommendedAction: "Immediate follow-up"
// }
```

### 4. Create Business Rule
```typescript
// API: POST /business-rules
const rule = await createBusinessRule({
  name: "High Budget Hot Lead",
  ruleType: "LEAD_QUALIFICATION",
  category: "sales",
  conditions: {
    entities: {
      budget: { min: 10000000 }
    }
  },
  actions: {
    setVariable: { leadScore: 95 }
  },
  priority: 10
});
```

### 5. Plan Conversation
```typescript
// API: POST /conversation-planner/plan
const plan = await planConversation({
  conversationId: "conv-123",
  intent: "INTERESTED",
  entities: { budget: "1 crore", city: "Mumbai" },
  currentNodeId: "qualification"
});
// Returns: {
//   action: "CONTINUE_SCRIPT",
//   nextNodeId: "budget_collection",
//   shouldContinue: true
// }
```

---

## 📈 View Analytics

### Decision Metrics
```bash
GET /api/decision-engine/metrics?startDate=2024-01-01&endDate=2024-01-31
```

### Intent Statistics
```bash
GET /api/intent-detection/statistics?startDate=2024-01-01
```

### Lead Statistics
```bash
GET /api/lead-qualification/statistics
```

### Fallback Statistics
```bash
GET /api/fallback/statistics
```

---

## ⚙️ Configuration

### Set Confidence Thresholds
```typescript
// Update decision configuration
await updateConfiguration(companyId, {
  intentConfidenceThreshold: 0.7,
  knowledgeConfidenceThreshold: 0.6,
  decisionConfidenceThreshold: 0.7,
  overallConfidenceThreshold: 0.7,
  enableFallback: true,
  maxFallbackAttempts: 3
});
```

### Create Custom Rules
```typescript
// Create a rule for business hours
await createBusinessRule({
  name: "Business Hours Only",
  ruleType: "CONVERSATION_LIMIT",
  conditions: {
    time: {
      businessHoursOnly: true,
      hours: { start: 9, end: 18 },
      weekdaysOnly: true
    }
  },
  actions: {
    triggerAction: "schedule_callback"
  }
});
```

---

## 🔍 Debugging

### Enable Detailed Logging
```typescript
// Check decision history
GET /api/decision-engine/history?conversationId=conv-123

// View specific decision
GET /api/decision-engine/history?decisionId=decision-456
```

### Monitor Confidence Scores
```typescript
// Low confidence decisions
GET /api/decision-engine/history?minConfidence=0.5&maxConfidence=0.7

// Fallback triggered
GET /api/decision-engine/history?fallbackTriggered=true
```

---

## 📚 Advanced Features

### Fallback Handling
When confidence is low, the engine automatically:
1. Detects low confidence
2. Determines fallback reason
3. Selects appropriate action
4. Executes fallback
5. Tracks success

### Multi-Engine Coordination
Single API call coordinates:
- Intent Detection
- Entity Extraction
- Business Rule Evaluation
- Confidence Calculation
- Lead Qualification
- Fallback Handling
- Conversation Planning

---

## 🎨 UI Components

### Dashboard Features
1. **Test Interface** - Live testing
2. **Intent Viewer** - Distribution charts
3. **Entity Viewer** - Extraction analytics
4. **Rules Manager** - Create/edit rules
5. **Lead Panel** - Qualification overview
6. **Metrics** - Performance stats

---

## 🔐 Security

### Authentication
```typescript
// All requests require JWT token
const token = await login(email, password);

// Use in headers
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Permissions
Required permissions:
- `decision:evaluate` - Evaluate decisions
- `decision:read` - View decisions
- `decision:manage` - Manage rules

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: Decision not evaluating
**Solution**: Check conversation ID and authentication

**Issue**: Low confidence scores
**Solution**: Review and adjust thresholds in configuration

**Issue**: Entities not extracted
**Solution**: Check input format and entity patterns

**Issue**: Rules not firing
**Solution**: Verify rule conditions and priority

---

## 📖 Documentation

- **API Reference**: See `DECISION_ENGINE_API.md`
- **Implementation Details**: See `PHASE_3.5_SUMMARY.md`
- **Delivery Report**: See `PHASE_3.5_DELIVERY.md`

---

## 🆘 Support

### Getting Help
- Review error logs in console
- Check API response messages
- Verify authentication token
- Confirm database connection

### Best Practices
1. Always provide conversation ID
2. Include context when available
3. Monitor confidence scores
4. Review decision history
5. Adjust thresholds as needed
6. Create company-specific rules
7. Track lead qualifications

---

## ✨ Quick Tips

1. **Start Simple**: Test with basic inputs first
2. **Use UI**: Dashboard is great for initial testing
3. **Monitor Metrics**: Track performance over time
4. **Adjust Thresholds**: Fine-tune for your use case
5. **Create Rules**: Customize for your business
6. **Review History**: Learn from past decisions
7. **Handle Fallbacks**: Plan for low confidence

---

## 🎯 Next Steps

1. ✅ Test with real conversation data
2. ✅ Create custom business rules
3. ✅ Adjust confidence thresholds
4. ✅ Monitor decision metrics
5. ✅ Integrate with response generation
6. ✅ Connect to conversation flow
7. ✅ Deploy to production

---

## 🚦 Status Check

Run these commands to verify everything works:

```bash
# Backend health
curl http://localhost:3000/api/health

# Test decision evaluation
curl -X POST http://localhost:3000/api/decision-engine/evaluate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test","rawInput":"Hello",...}'

# Check metrics
curl http://localhost:3000/api/decision-engine/metrics \
  -H "Authorization: Bearer TOKEN"
```

---

**You're all set! The AI Decision Engine is ready to power your conversations.** 🚀
