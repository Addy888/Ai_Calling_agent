# Conversation Manager API Reference

Base URL: `http://localhost:3000/api/conversation-manager`

All endpoints require JWT authentication via Bearer token.

---

## Sessions

### Create Session
```http
POST /sessions
Content-Type: application/json

{
  "sessionId": "unique-session-id",
  "companyId": "company-uuid",
  "campaignId": "campaign-uuid",
  "contactId": "contact-uuid",
  "language": "en"
}
```

### Get Session
```http
GET /sessions/:id
GET /sessions/by-session-id/:sessionId
```

### List Sessions
```http
GET /sessions?companyId=uuid&page=1&limit=20&state=ACTIVE
```

### Update State
```http
PUT /sessions/:sessionId/state

{
  "newState": "QUALIFICATION",
  "reason": "Moving to qualification phase",
  "triggerType": "SYSTEM"
}
```

### Next Step
```http
POST /sessions/:sessionId/next-step

{
  "customerInput": "I am interested in 3BHK apartments",
  "context": {}
}
```

### Complete Session
```http
POST /sessions/:sessionId/complete

{
  "result": "INTERESTED",
  "notes": "Customer interested in premium apartments"
}
```

### Cancel Session
```http
POST /sessions/:sessionId/cancel

{
  "reason": "Customer requested cancellation"
}
```

---

## Timeline

### Create Event
```http
POST /timeline

{
  "sessionId": "session-id",
  "companyId": "company-uuid",
  "eventType": "QUESTION_ASKED",
  "eventTitle": "Asked about budget",
  "conversationState": "QUALIFICATION",
  "customerInput": "What is the price range?",
  "confidenceScore": 0.95
}
```

### Get Timeline
```http
GET /timeline/:sessionId?eventType=QUESTION_ASKED&state=QUALIFICATION
```

### Timeline Stats
```http
GET /timeline/:sessionId/stats
```

---

## Questions

### Create Question
```http
POST /questions

{
  "sessionId": "session-id",
  "companyId": "company-uuid",
  "questionId": "q_budget",
  "questionText": "What is your budget?",
  "questionType": "BUDGET",
  "conversationState": "QUALIFICATION",
  "isRequired": true
}
```

### Answer Question
```http
POST /questions/:id/answer

{
  "customerAnswer": "Around 50 lakhs",
  "extractedValue": "50L",
  "confidenceScore": 0.9
}
```

### Skip Question
```http
POST /questions/:id/skip

{
  "reason": "Customer declined to answer"
}
```

### Get Next Question
```http
GET /questions/session/:sessionId/next
```

### Generate Questions
```http
POST /questions/session/:sessionId/generate

{
  "context": {
    "campaignType": "real-estate"
  }
}
```

---

## Objections

### Create Objection
```http
POST /objections

{
  "sessionId": "session-id",
  "companyId": "company-uuid",
  "objectionType": "TOO_EXPENSIVE",
  "objectionText": "This is too expensive for me",
  "conversationState": "QUALIFICATION",
  "handlingStrategy": "VALUE_PROPOSITION"
}
```

### Detect Objection
```http
POST /objections/detect

{
  "customerInput": "I need to think about it"
}

Response:
{
  "detected": true,
  "type": "NEED_TIME",
  "confidence": 0.8,
  "strategy": "CREATE_URGENCY"
}
```

### Resolve Objection
```http
POST /objections/:id/resolve

{
  "wasResolved": true,
  "resolutionNotes": "Explained value proposition"
}
```

---

## Follow-ups

### Schedule Follow-up
```http
POST /follow-ups

{
  "sessionId": "session-id",
  "companyId": "company-uuid",
  "followUpType": "TOMORROW",
  "scheduledDate": "2024-01-15",
  "scheduledTime": "10:00",
  "reason": "Customer requested callback"
}
```

### Update Follow-up
```http
PUT /follow-ups/:id

{
  "status": "COMPLETED",
  "scheduledDate": "2024-01-16"
}
```

### Cancel Follow-up
```http
POST /follow-ups/:id/cancel

{
  "cancellationReason": "Customer no longer interested"
}
```

### Get Upcoming
```http
GET /follow-ups/company/:companyId/upcoming?days=7
```

### Get Overdue
```http
GET /follow-ups/company/:companyId/overdue
```

### Follow-up Stats
```http
GET /follow-ups/company/:companyId/stats

Response:
{
  "total": 150,
  "scheduled": 45,
  "completed": 80,
  "cancelled": 15,
  "overdue": 10,
  "completionRate": 53.33
}
```

---

## Summaries

### Generate Summary
```http
POST /summaries/:sessionId/generate

Response:
{
  "sessionId": "session-id",
  "conversationResult": "INTERESTED",
  "leadStatus": "QUALIFIED",
  "customerName": "John Doe",
  "questionsAsked": 8,
  "questionsAnswered": 7,
  "objectionsRaised": 2,
  "objectionsResolved": 2,
  "totalDuration": 1200,
  "conversationQuality": 85,
  "summaryText": "Customer John Doe interested in 3BHK..."
}
```

### Update Summary
```http
PUT /summaries/:sessionId

{
  "leadStatus": "CONVERTED",
  "nextAction": "SCHEDULE_SITE_VISIT"
}
```

### Get Summary
```http
GET /summaries/:sessionId
GET /summaries/company/:companyId?limit=50
```

---

## Flow Management

### Get Suggestions
```http
GET /flow/:sessionId/suggestions

Response:
[
  {
    "action": "ASK_QUESTION",
    "description": "Ask next qualification question",
    "nextState": "QUALIFICATION"
  },
  {
    "action": "HANDLE_OBJECTION",
    "description": "Handle objection if raised",
    "nextState": "OBJECTION_HANDLING"
  }
]
```

### State History
```http
GET /flow/:sessionId/history

Response:
[
  {
    "fromState": "GREETING",
    "toState": "INTRODUCTION",
    "transitionReason": "Greeting completed",
    "triggerType": "SYSTEM",
    "createdAt": "2024-01-14T10:30:00Z"
  }
]
```

---

## Conversation States

- `GREETING` - Initial greeting
- `INTRODUCTION` - Introduction phase
- `QUALIFICATION` - Qualification questions
- `INFORMATION_COLLECTION` - Collecting information
- `KNOWLEDGE_LOOKUP` - Searching knowledge
- `OBJECTION_HANDLING` - Handling objections
- `LEAD_QUALIFICATION` - Lead assessment
- `APPOINTMENT_OFFER` - Offering appointment
- `FOLLOW_UP` - Follow-up scheduling
- `CLOSING` - Closing conversation
- `COMPLETED` - Completed successfully
- `CANCELLED` - Cancelled

---

## Objection Types

- `TOO_EXPENSIVE` - Price objection
- `NEED_TIME` - Need time to think
- `ALREADY_PURCHASED` - Already bought
- `NOT_INTERESTED` - Not interested
- `BUSY` - Currently busy
- `CALL_LATER` - Call back later
- `NEED_FAMILY_DISCUSSION` - Family discussion needed
- `NEED_DETAILS` - Need more details
- `WRONG_NUMBER` - Wrong number
- `DO_NOT_CALL` - Do not call request
- `OTHER` - Other objection

---

## Lead Status

- `NEW` - New lead
- `INTERESTED` - Interested customer
- `NOT_INTERESTED` - Not interested
- `CALL_BACK_LATER` - Callback requested
- `WRONG_NUMBER` - Wrong number
- `BUSY` - Customer busy
- `DO_NOT_CALL` - Do not call
- `QUALIFIED` - Qualified lead
- `CONVERTED` - Converted to sale
- `LOST` - Lost lead

---

## Question Types

- `GREETING` - Greeting question
- `NAME` - Name question
- `CITY` - City/location
- `BUDGET` - Budget inquiry
- `PROPERTY_TYPE` - Property type
- `TIMELINE` - Purchase timeline
- `CONTACT_INFO` - Contact information
- `CLARIFICATION` - Clarification question
- `QUALIFICATION` - Qualification question
- `FOLLOWUP` - Follow-up question
- `CLOSING` - Closing question
- `CUSTOM` - Custom question

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

Common status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Authentication

All requests require Bearer token:

```http
Authorization: Bearer <your-jwt-token>
```

Get token from login endpoint:
```http
POST /api/auth/login

{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Rate Limiting

- Default: 100 requests per minute per IP
- Authenticated: 1000 requests per minute per user

---

## Pagination

List endpoints support pagination:

```
?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

**Version:** 1.0.0
**Updated:** Phase 3.6
