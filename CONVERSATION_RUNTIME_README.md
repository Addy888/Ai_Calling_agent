# Enterprise Real-Time Conversation Runtime Engine

## Overview

The Conversation Runtime Engine is the core component responsible for managing live AI conversations during phone calls. It orchestrates the entire conversation lifecycle from greeting to goodbye, integrating with LLMs, knowledge bases, memory systems, and telephony providers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Conversation Runtime Engine                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐        ┌────────────────────┐        │
│  │ Runtime Manager  │───────▶│ Session Service    │        │
│  └──────────────────┘        └────────────────────┘        │
│          │                            │                      │
│          ▼                            ▼                      │
│  ┌──────────────────┐        ┌────────────────────┐        │
│  │ Processor        │───────▶│ Prompt Builder     │        │
│  └──────────────────┘        └────────────────────┘        │
│          │                            │                      │
│          ▼                            ▼                      │
│  ┌──────────────────┐        ┌────────────────────┐        │
│  │ Intent Router    │        │ Response Generator │        │
│  └──────────────────┘        └────────────────────┘        │
│          │                            │                      │
│          ▼                            ▼                      │
│  ┌──────────────────┐        ┌────────────────────┐        │
│  │ Response         │───────▶│ Fallback Manager   │        │
│  │ Validator        │        └────────────────────┘        │
│  └──────────────────┘                                       │
│          │                                                   │
│          ▼                                                   │
│  ┌──────────────────┐                                       │
│  │ Session          │                                       │
│  │ Persistence      │                                       │
│  └──────────────────┘                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│ Telephony      │    │ Knowledge      │    │ Memory         │
│ Engine         │    │ Base           │    │ Engine         │
└────────────────┘    └────────────────┘    └────────────────┘
```

## Core Components

### 1. ConversationRuntimeManagerService
The main orchestrator that coordinates all conversation services.

**Responsibilities:**
- Start and end conversations
- Process customer messages
- Handle silence timeouts
- Manage session lifecycle
- Coordinate with other services

### 2. ConversationSessionService
Manages conversation session state and memory.

**Responsibilities:**
- Create and track sessions
- Manage conversation history
- Update session memory
- Track intents and states
- Session cleanup

### 3. ConversationProcessorService
Core processor that handles conversation turns.

**Responsibilities:**
- Process customer messages
- Generate greetings and goodbyes
- Detect and route intents
- Coordinate response generation
- Update conversation state

### 4. PromptBuilderService
Constructs comprehensive prompts for LLM.

**Responsibilities:**
- Build system prompts
- Combine all context sources
- Include conversation history
- Format for LLM consumption

### 5. ResponseGeneratorService
Integrates with LLM to generate responses.

**Responsibilities:**
- Call OpenAI/LLM APIs
- Generate conversation responses
- Detect intents using AI
- Handle API errors

### 6. IntentRouterService
Detects customer intents from messages.

**Responsibilities:**
- Rule-based intent detection
- AI-powered intent detection
- Intent confidence scoring
- Route special intents

### 7. ResponseValidatorService
Validates AI-generated responses.

**Responsibilities:**
- Check response quality
- Validate appropriateness
- Detect problematic content
- Ensure response safety

### 8. FallbackManagerService
Provides fallback responses when AI fails.

**Responsibilities:**
- Generate fallback responses
- Handle AI failures gracefully
- Maintain conversation flow
- Prevent empty responses

### 9. SessionPersistenceService
Persists conversation data to database.

**Responsibilities:**
- Save conversation sessions
- Create transcript entries
- Update call records
- Update campaign queue

## Conversation Flow

### 1. Call Initiated
```typescript
POST /conversation-runtime/start
{
  "callId": "call-123",
  "campaignId": "campaign-456",
  "contactId": "contact-789",
  "companyId": "company-012",
  "customerPhone": "+1234567890",
  "customerName": "John Doe"
}
```

**Process:**
1. Create conversation session
2. Load campaign, script, agent data
3. Initialize memory
4. Generate greeting
5. Validate greeting
6. Return session and greeting

### 2. Customer Speaks
```typescript
POST /conversation-runtime/message
{
  "sessionId": "session-abc",
  "message": "Yes, I am interested"
}
```

**Process:**
1. Update state to LISTENING
2. Add customer message to history
3. Detect intent
4. Build prompt with full context
5. Generate AI response
6. Validate response
7. Add AI response to history
8. Update memory
9. Return response

### 3. Silence Detected
```typescript
POST /conversation-runtime/silence/:sessionId
```

**Process:**
1. Increment silence counter
2. Generate silence prompt
3. Check if max silences reached
4. Return prompt or end signal

### 4. Call Ended
```typescript
POST /conversation-runtime/end
{
  "sessionId": "session-abc",
  "reason": "COMPLETED"
}
```

**Process:**
1. Generate goodbye message
2. End session
3. Persist to database
4. Create transcript
5. Update analytics

## REST API Endpoints

### Start Conversation
```http
POST /conversation-runtime/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "callId": "string",
  "campaignId": "string",
  "contactId": "string",
  "companyId": "string",
  "customerPhone": "string",
  "customerName": "string (optional)",
  "customerLanguage": "string (optional)",
  "metadata": "object (optional)"
}

Response: 200 OK
{
  "session": ConversationSession,
  "greeting": ResponseGenerationResult
}
```

### Process Message
```http
POST /conversation-runtime/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "sessionId": "string",
  "message": "string",
  "metadata": "object (optional)"
}

Response: 200 OK
{
  "success": boolean,
  "response": string,
  "intent": string,
  "confidence": number,
  "shouldEndConversation": boolean,
  "duration": number,
  "metadata": object
}
```

### Handle Silence
```http
POST /conversation-runtime/silence/:sessionId
Authorization: Bearer {token}

Response: 200 OK
{
  "success": boolean,
  "response": string,
  "shouldEndConversation": boolean
}
```

### End Conversation
```http
POST /conversation-runtime/end
Authorization: Bearer {token}
Content-Type: application/json

{
  "sessionId": "string",
  "reason": "COMPLETED | NOT_INTERESTED | ERROR | TIMEOUT"
}

Response: 200 OK
{
  "session": ConversationSession,
  "goodbye": ResponseGenerationResult (optional)
}
```

### Get Session
```http
GET /conversation-runtime/session/:sessionId
Authorization: Bearer {token}

Response: 200 OK
ConversationSession
```

### Get Transcript
```http
GET /conversation-runtime/transcript/:sessionId
Authorization: Bearer {token}

Response: 200 OK
{
  "sessionId": string,
  "callId": string,
  "transcript": TranscriptEntry[],
  "totalEntries": number
}
```

### Get Session State
```http
GET /conversation-runtime/state/:sessionId
Authorization: Bearer {token}

Response: 200 OK
{
  "sessionId": string,
  "state": string,
  "isActive": boolean,
  "currentStep": number,
  "turnCount": number,
  "lastActivity": Date
}
```

### Get Active Sessions
```http
GET /conversation-runtime/sessions/active
Authorization: Bearer {token}

Response: 200 OK
{
  "sessions": ConversationSession[],
  "count": number
}
```

### Get Statistics
```http
GET /conversation-runtime/statistics/:sessionId
Authorization: Bearer {token}

Response: 200 OK
ConversationStatistics
```

### Health Check
```http
GET /conversation-runtime/health
Authorization: Bearer {token}

Response: 200 OK
{
  "healthy": boolean,
  "activeSessions": number,
  "timestamp": Date
}
```

## Configuration

### Environment Variables

```bash
# Conversation Runtime Engine
CONVERSATION_RUNTIME_ENABLED=true

# AI Intent Detection
USE_AI_INTENT_DETECTION=true
INTENT_CONFIDENCE_THRESHOLD=0.7

# Silence Detection
CONVERSATION_SILENCE_TIMEOUT=30
CONVERSATION_MAX_SILENCE_COUNT=3

# Response Configuration
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=150
RESPONSE_MAX_LENGTH=300

# Conversation Limits
MAX_CONVERSATION_HISTORY=20
MAX_CONVERSATION_DURATION=1800

# Validation
RESPONSE_VALIDATION_ENABLED=true
MIN_RESPONSE_CONFIDENCE=0.6

# Fallback Configuration
FALLBACK_ENABLED=true
FALLBACK_MAX_RETRIES=2
```

## Events

The Conversation Runtime emits the following events:

### Conversation Events
- `conversation.started` - Conversation initiated
- `conversation.greeting.completed` - Greeting played
- `conversation.customer.speech` - Customer spoke
- `conversation.intent.detected` - Intent detected
- `conversation.response.generated` - AI response ready
- `conversation.speech.played` - Response played
- `conversation.silence.detected` - Silence timeout
- `conversation.ended` - Conversation ended
- `conversation.error` - Error occurred

### Integration Events
- `conversation.transcript.saved` - Transcript persisted
- `conversation.analytics.updated` - Analytics updated

## Intent Types

The system detects the following intents:

- **INTERESTED** - Customer shows interest
- **NOT_INTERESTED** - Customer declines
- **BUSY** - Customer is busy
- **CALL_LATER** - Customer requests callback
- **WRONG_NUMBER** - Wrong contact
- **REQUEST_INFO** - Customer asks questions
- **FAQ** - Frequently asked questions
- **COMPLAINT** - Customer complaint
- **POSITIVE** - Positive response
- **NEGATIVE** - Negative response
- **GENERAL** - General conversation
- **GOODBYE** - Ending conversation
- **UNKNOWN** - Cannot determine intent

## Conversation States

- **INITIALIZING** - Setting up session
- **GREETING** - Playing greeting
- **LISTENING** - Waiting for customer
- **THINKING** - Processing input
- **GENERATING_RESPONSE** - Creating response
- **SPEAKING** - Playing AI response
- **WAITING** - Waiting for next input
- **PAUSED** - Conversation paused
- **COMPLETED** - Conversation ended
- **FAILED** - Error occurred

## Memory System

The session memory tracks:

```typescript
{
  // Customer Information
  customerName: string,
  customerPreferences: object,
  
  // Conversation Context
  previousAnswers: Array<{
    question: string,
    answer: string,
    timestamp: Date
  }>,
  
  // Current State
  currentTopic: string,
  currentStep: number,
  scriptProgress: number,
  
  // Extracted Data
  extractedData: {
    interest: string,
    budget: string,
    timeline: string,
    // ... custom fields
  },
  
  // Intent History
  intentHistory: Array<{
    intent: IntentType,
    confidence: number,
    timestamp: Date
  }>,
  
  // AI State
  lastAIResponse: string,
  lastAIIntent: string,
  
  // Custom Fields
  custom: object
}
```

## Prompt Construction

The prompt builder combines:

1. **Base Instructions** - Core AI behavior rules
2. **Agent Personality** - Tone, style, personality
3. **Campaign Context** - Goal, instructions
4. **Script Content** - Uploaded conversation script
5. **Customer Context** - Name, history, preferences
6. **Knowledge Base** - Relevant documents
7. **Memory** - Previous interactions
8. **Current State** - Step, progress, intents
9. **Response Guidelines** - How to respond

## Integration with Existing Modules

### Telephony Engine
- Receives call connected events
- Sends TTS audio for playback
- Receives STT transcriptions

### Knowledge Base
- Searches documents for relevant info
- Injects context into prompts
- Answers customer questions

### Memory Engine
- Stores long-term customer data
- Retrieves conversation history
- Updates customer preferences

### Campaign Engine
- Loads campaign configuration
- Applies campaign rules
- Updates campaign metrics

### Analytics
- Tracks conversation metrics
- Records intent distribution
- Measures response quality

## Testing

### Run Unit Tests
```bash
npm run test conversation-runtime
```

### Run Integration Tests
```bash
npm run test:e2e conversation-runtime
```

### Run Specific Test Suite
```bash
npm run test conversation-processor.spec
npm run test intent-router.spec
npm run test prompt-builder.spec
```

## Performance Considerations

- **Session Storage**: In-memory with periodic persistence
- **LLM Calls**: Async with timeout handling
- **Database Writes**: Batched at conversation end
- **Event Emission**: Non-blocking
- **Memory Cleanup**: Automatic after 60 minutes

## Error Handling

The system handles errors gracefully:

1. **LLM Failures**: Fallback to predefined responses
2. **Database Errors**: Continue with in-memory state
3. **Validation Failures**: Use fallback responses
4. **Timeout Errors**: Retry with backoff
5. **Unknown Errors**: Generic fallback + logging

## Security

- All endpoints require JWT authentication
- Session IDs are UUIDs
- Customer data is sanitized
- API keys are environment variables
- Rate limiting on external APIs

## Monitoring

Key metrics to monitor:

- Active session count
- Average response time
- Intent detection accuracy
- Fallback usage rate
- Conversation completion rate
- Error rate
- LLM token usage

## Troubleshooting

### Conversations Not Starting
- Check if `CONVERSATION_RUNTIME_ENABLED=true`
- Verify OpenAI API key is valid
- Check database connectivity
- Review campaign configuration

### Poor Response Quality
- Adjust `OPENAI_TEMPERATURE` (lower = more consistent)
- Increase `OPENAI_MAX_TOKENS` for longer responses
- Review and improve script content
- Add more knowledge base documents

### High Fallback Rate
- Check `MIN_RESPONSE_CONFIDENCE` threshold
- Review response validation rules
- Monitor OpenAI API status
- Check prompt quality

### Memory Issues
- Reduce `MAX_CONVERSATION_HISTORY`
- Run cleanup more frequently
- Monitor session count
- Check for memory leaks

## Future Enhancements

- Multi-language support
- Voice emotion detection
- Real-time sentiment analysis
- Advanced conversation routing
- A/B testing framework
- Custom LLM providers
- Conversation analytics dashboard

## Support

For issues or questions:
- GitHub Issues: [repository-url]
- Documentation: [docs-url]
- Email: support@example.com
