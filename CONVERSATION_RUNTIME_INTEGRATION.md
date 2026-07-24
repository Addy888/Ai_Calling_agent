# Conversation Runtime Integration Guide

## Overview

This guide explains how to integrate the Conversation Runtime Engine with existing modules in the AI Calling Agent system.

## Architecture Integration

```
┌──────────────────────────────────────────────────────────────────┐
│                     AI Calling Agent Platform                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐      ┌────────────────┐      ┌──────────────┐ │
│  │  Campaign    │─────▶│  Calling       │─────▶│  Telephony   │ │
│  │  Engine      │      │  Pipeline      │      │  Engine      │ │
│  └──────────────┘      └────────────────┘      └──────────────┘ │
│         │                      │                        │         │
│         │                      ▼                        ▼         │
│         │              ┌────────────────┐      ┌──────────────┐ │
│         └─────────────▶│ Conversation   │◀────▶│  Speech      │ │
│                        │ Runtime Engine │      │  (STT/TTS)   │ │
│                        └────────────────┘      └──────────────┘ │
│                                │                                  │
│         ┌──────────────────────┼──────────────────────┐         │
│         │                      │                      │          │
│         ▼                      ▼                      ▼          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │  Knowledge   │      │   Memory     │      │  Analytics   │  │
│  │  Base        │      │   Engine     │      │  Engine      │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Calling Pipeline Integration

The Conversation Runtime integrates with the Calling Pipeline to manage live conversations.

#### Event Flow

**From Calling Pipeline → Conversation Runtime:**
```typescript
// When call is answered
eventEmitter.emit('pipeline.call.answered', {
  callId: 'call-123',
  campaignId: 'campaign-456',
  contactId: 'contact-789',
  timestamp: new Date(),
});

// Listen in Conversation Runtime
@OnEvent('pipeline.call.answered')
async handleCallAnswered(payload: any) {
  // Start conversation
  await this.conversationRuntimeManager.startConversation({
    callId: payload.callId,
    campaignId: payload.campaignId,
    contactId: payload.contactId,
    companyId: payload.companyId,
    customerPhone: payload.customerPhone,
    customerName: payload.customerName,
  });
}
```

**From Conversation Runtime → Calling Pipeline:**
```typescript
// Conversation events
eventEmitter.emit('conversation.started', { sessionId, callId });
eventEmitter.emit('conversation.response.generated', { sessionId, response });
eventEmitter.emit('conversation.ended', { sessionId, reason });
```

#### Service Integration

```typescript
// In calling-pipeline/services/call-lifecycle.service.ts

import { ConversationRuntimeManagerService } from '../../conversation-runtime/services/conversation-runtime-manager.service';

export class CallLifecycleService {
  constructor(
    private readonly conversationRuntime: ConversationRuntimeManagerService,
  ) {}

  async handleCallAnswered(callId: string, campaignId: string) {
    // Start conversation
    const result = await this.conversationRuntime.startConversation({
      callId,
      campaignId,
      contactId: this.getContactId(callId),
      companyId: this.getCompanyId(callId),
      customerPhone: this.getCustomerPhone(callId),
    });

    // Play greeting through TTS
    await this.playGreeting(result.greeting.response);
  }

  async handleCustomerSpeech(callId: string, transcript: string) {
    // Get session by call ID
    const session = await this.conversationRuntime.getSessionByCallId(callId);
    
    if (!session) return;

    // Process message
    const response = await this.conversationRuntime.processMessage({
      sessionId: session.sessionId,
      message: transcript,
    });

    // Play response through TTS
    await this.playResponse(response.response);

    // Check if should end
    if (response.shouldEndConversation) {
      await this.endCall(callId);
    }
  }

  async handleCallEnded(callId: string, reason: string) {
    const session = await this.conversationRuntime.getSessionByCallId(callId);
    
    if (session) {
      await this.conversationRuntime.endConversation({
        sessionId: session.sessionId,
        reason: this.mapEndReason(reason),
      });
    }
  }
}
```

### 2. Telephony Engine Integration

The Conversation Runtime works with the Telephony Engine for call control.

#### Webhook Handling

```typescript
// In telephony-engine/telephony-engine.controller.ts

@Post('webhooks/twilio/voice')
async handleTwilioVoiceWebhook(@Body() body: any) {
  const callSid = body.CallSid;
  const callStatus = body.CallStatus;

  if (callStatus === 'in-progress') {
    // Notify conversation runtime
    this.eventEmitter.emit('telephony.call.answered', {
      callSid,
      timestamp: new Date(),
    });

    // Return TwiML to stream audio
    return this.generateStreamingTwiML();
  }
}

@Post('webhooks/twilio/audio-stream')
async handleAudioStream(@Body() body: any) {
  // Forward to STT service
  const transcript = await this.sttService.transcribe(body.media);
  
  // Get session
  const session = await this.conversationRuntime.getSessionByCallId(
    body.callSid,
  );

  if (session) {
    // Process with conversation runtime
    const response = await this.conversationRuntime.processMessage({
      sessionId: session.sessionId,
      message: transcript,
    });

    // Convert to audio and stream back
    const audio = await this.ttsService.synthesize(response.response);
    await this.telephonyManager.streamAudio(body.callSid, audio);
  }
}
```

### 3. Speech Services Integration (STT/TTS)

#### Speech-to-Text Integration

```typescript
// conversation-runtime listens for STT results

@OnEvent('stt.transcription.ready')
async handleTranscription(payload: {
  callId: string;
  transcript: string;
  confidence: number;
}) {
  const session = await this.sessionService.getSessionByCallId(payload.callId);
  
  if (!session) return;

  // Process the transcription
  await this.processor.processMessage({
    sessionId: session.sessionId,
    message: payload.transcript,
  });
}
```

#### Text-to-Speech Integration

```typescript
// conversation-runtime emits TTS requests

// After generating response
this.eventEmitter.emit('tts.synthesis.request', {
  sessionId: session.sessionId,
  callId: session.callId,
  text: response.response,
  voiceId: session.voiceId,
  language: session.customerLanguage,
});
```

### 4. Knowledge Base Integration

The Conversation Runtime searches the knowledge base for relevant information.

```typescript
// In conversation-runtime/services/conversation-processor.service.ts

import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';

export class ConversationProcessorService {
  constructor(
    private readonly knowledgeBase: KnowledgeBaseService,
  ) {}

  private async buildContext(
    sessionId: string,
    currentMessage?: string,
  ): Promise<ConversationContext> {
    const session = await this.sessionService.getSession(sessionId);

    // Search knowledge base if customer asks a question
    let knowledgeContext = [];
    
    if (this.isQuestion(currentMessage)) {
      const results = await this.knowledgeBase.search({
        query: currentMessage,
        companyId: session.companyId,
        campaignId: session.campaignId,
        limit: 3,
      });

      knowledgeContext = results.documents.map(doc => ({
        content: doc.content,
        source: doc.filename,
        relevance: doc.score,
      }));
    }

    return {
      session,
      knowledgeContext,
      // ... other context
    };
  }
}
```

### 5. Memory Engine Integration

Store and retrieve customer interaction history.

```typescript
// In conversation-runtime/services/conversation-session.service.ts

import { MemoryService } from '../../memory/memory.service';

export class ConversationSessionService {
  constructor(
    private readonly memoryService: MemoryService,
  ) {}

  async createSession(request: ConversationStartRequest): Promise<ConversationSession> {
    // Load previous interactions from memory
    const previousInteractions = await this.memoryService.getCustomerHistory({
      contactId: request.contactId,
      limit: 5,
    });

    const session: ConversationSession = {
      sessionId: generateId(),
      // ... other fields
      sessionMemory: {
        previousAnswers: [],
        currentStep: 0,
        scriptProgress: 0,
        extractedData: {},
        intentHistory: [],
        custom: {
          previousInteractions,
        },
      },
    };

    return session;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    // Store conversation summary in memory
    await this.memoryService.storeConversationSummary({
      contactId: session.contactId,
      sessionId: session.sessionId,
      summary: this.generateSummary(session),
      extractedData: session.sessionMemory.extractedData,
      intents: session.detectedIntents,
      outcome: session.endReason,
    });
  }
}
```

### 6. Analytics Integration

Track conversation metrics and performance.

```typescript
// In conversation-runtime/services/session-persistence.service.ts

import { AnalyticsService } from '../../analytics/analytics.service';

export class SessionPersistenceService {
  constructor(
    private readonly analytics: AnalyticsService,
  ) {}

  async persistSession(sessionId: string): Promise<PersistenceResult> {
    const session = await this.sessionService.getSession(sessionId);

    // ... persist to database

    // Track analytics
    await this.analytics.trackConversation({
      sessionId: session.sessionId,
      callId: session.callId,
      campaignId: session.campaignId,
      contactId: session.contactId,
      duration: session.duration,
      turnCount: session.turnCount,
      intents: session.detectedIntents,
      outcome: session.endReason,
      customerSentiment: this.analyzeSentiment(session),
      aiPerformance: {
        averageConfidence: this.calculateAverageConfidence(session),
        fallbackCount: this.countFallbacks(session),
        responseTime: this.calculateAverageResponseTime(session),
      },
    });

    return { success: true, sessionId };
  }
}
```

### 7. Campaign Engine Integration

Load campaign configuration and update metrics.

```typescript
// In conversation-runtime/services/conversation-processor.service.ts

private async loadCampaignData(campaignId: string) {
  const campaign = await this.prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      script: true,
      aiAgent: true,
      prompt: true,
    },
  });

  return {
    name: campaign.name,
    description: campaign.description,
    goal: campaign.settings?.goal,
    instructions: campaign.settings?.instructions,
    script: campaign.script?.content,
    agent: campaign.aiAgent,
    prompt: campaign.prompt?.content,
  };
}
```

## Complete Integration Example

Here's a complete flow showing all integrations:

```typescript
// 1. Call is answered (Telephony Engine → Calling Pipeline)
@OnEvent('telephony.call.answered')
async handleCallAnswered(payload: CallAnsweredEvent) {
  // 2. Start conversation (Calling Pipeline → Conversation Runtime)
  const result = await this.conversationRuntime.startConversation({
    callId: payload.callSid,
    campaignId: payload.campaignId,
    contactId: payload.contactId,
    companyId: payload.companyId,
    customerPhone: payload.phoneNumber,
  });

  // 3. Synthesize greeting (Conversation Runtime → TTS)
  const audio = await this.ttsService.synthesize({
    text: result.greeting.response,
    voiceId: payload.voiceId,
    language: payload.language,
  });

  // 4. Play greeting (TTS → Telephony)
  await this.telephonyManager.playAudio(payload.callSid, audio);
}

// 5. Customer speaks (Telephony → STT)
@OnEvent('telephony.audio.received')
async handleAudioReceived(payload: AudioReceivedEvent) {
  // 6. Transcribe (STT Service)
  const transcript = await this.sttService.transcribe(payload.audioBuffer);

  // 7. Process message (Conversation Runtime)
  const session = await this.conversationRuntime.getSessionByCallId(
    payload.callId,
  );

  // 8. Search knowledge base (Knowledge Base)
  const knowledge = await this.knowledgeBase.search({
    query: transcript.text,
    companyId: session.companyId,
  });

  // 9. Load memory (Memory Engine)
  const history = await this.memoryService.getCustomerHistory({
    contactId: session.contactId,
  });

  // 10. Generate response (LLM + Conversation Runtime)
  const response = await this.conversationRuntime.processMessage({
    sessionId: session.sessionId,
    message: transcript.text,
  });

  // 11. Synthesize response (TTS)
  const responseAudio = await this.ttsService.synthesize({
    text: response.response,
    voiceId: session.voiceId,
  });

  // 12. Play response (Telephony)
  await this.telephonyManager.playAudio(payload.callId, responseAudio);

  // 13. Check if should end
  if (response.shouldEndConversation) {
    await this.endCall(payload.callId, session.sessionId);
  }
}

// 14. Call ends (Telephony → Calling Pipeline → Conversation Runtime)
@OnEvent('telephony.call.completed')
async handleCallCompleted(payload: CallCompletedEvent) {
  const session = await this.conversationRuntime.getSessionByCallId(
    payload.callId,
  );

  // 15. End conversation and persist
  await this.conversationRuntime.endConversation({
    sessionId: session.sessionId,
    reason: ConversationEndReason.COMPLETED,
  });

  // 16. Update analytics (Analytics Engine)
  await this.analytics.trackCallCompletion({
    callId: payload.callId,
    duration: session.duration,
    outcome: session.endReason,
  });
}
```

## Event Bus Architecture

All modules communicate through a centralized event bus:

### Event Naming Convention
```
<module>.<entity>.<action>
```

### Key Events

**Telephony Events:**
- `telephony.call.answered`
- `telephony.call.completed`
- `telephony.audio.received`

**Conversation Events:**
- `conversation.started`
- `conversation.message.received`
- `conversation.response.generated`
- `conversation.ended`

**Speech Events:**
- `stt.transcription.ready`
- `tts.synthesis.complete`

**Pipeline Events:**
- `pipeline.call.initiated`
- `pipeline.call.answered`
- `pipeline.call.completed`

## Database Schema Integration

The Conversation Runtime adds these tables:

```prisma
model ConversationSession {
  id                    String          @id @default(uuid())
  sessionId             String          @unique
  callId                String
  campaignId            String
  contactId             String
  companyId             String
  
  state                 String
  isActive              Boolean         @default(true)
  
  conversationHistory   Json
  detectedIntents       String[]
  currentIntent         String?
  
  sessionMemory         Json
  
  startedAt             DateTime        @default(now())
  lastActivityAt        DateTime        @updatedAt
  endedAt               DateTime?
  duration              Int?
  
  turnCount             Int             @default(0)
  customerMessageCount  Int             @default(0)
  aiMessageCount        Int             @default(0)
  silenceCount          Int             @default(0)
  
  metadata              Json?
  endReason             String?
  
  // Relations
  call                  Call            @relation(fields: [callId], references: [id])
  campaign              Campaign        @relation(fields: [campaignId], references: [id])
  contact               Contact         @relation(fields: [contactId], references: [id])
  company               Company         @relation(fields: [companyId], references: [id])
  
  transcriptEntries     TranscriptEntry[]
  
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  
  @@index([callId])
  @@index([campaignId])
  @@index([contactId])
  @@index([state, isActive])
}

model TranscriptEntry {
  id                    String          @id @default(uuid())
  sessionId             String
  callId                String
  
  speaker               String
  content               String          @db.Text
  intent                String?
  confidence            Float?
  timestamp             DateTime        @default(now())
  state                 String
  
  metadata              Json?
  
  // Relations
  session               ConversationSession @relation(fields: [sessionId], references: [sessionId])
  
  createdAt             DateTime        @default(now())
  
  @@index([sessionId])
  @@index([callId])
  @@index([timestamp])
}
```

## Configuration

### Module Dependencies

Ensure these modules are imported:

```typescript
// app.module.ts
@Module({
  imports: [
    // ... other modules
    TelephonyEngineModule,
    ConversationRuntimeModule, // Add this
    SpeechModule,
    KnowledgeBaseModule,
    MemoryModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
```

### Environment Variables

All required environment variables are in `.env.example`:

```bash
# Conversation Runtime
CONVERSATION_RUNTIME_ENABLED=true
USE_AI_INTENT_DETECTION=true
CONVERSATION_SILENCE_TIMEOUT=30
CONVERSATION_MAX_SILENCE_COUNT=3

# OpenAI
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=150
```

## Testing Integration

```typescript
// integration.spec.ts
describe('Full Stack Integration', () => {
  it('should handle complete call flow', async () => {
    // 1. Initiate call
    const call = await telephony.makeCall({ to: '+1234567890' });
    
    // 2. Wait for answer
    await waitFor(() => call.status === 'answered');
    
    // 3. Verify conversation started
    const session = await conversation.getSessionByCallId(call.callId);
    expect(session).toBeDefined();
    
    // 4. Simulate customer speech
    await stt.simulateTranscription(call.callId, 'Hello, I am interested');
    
    // 5. Verify response generated
    await waitFor(() => session.turnCount > 0);
    
    // 6. End call
    await telephony.hangup(call.callId);
    
    // 7. Verify persistence
    const transcript = await conversation.getTranscript(session.sessionId);
    expect(transcript.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Issue: Conversations not starting
**Check:**
1. `ConversationRuntimeModule` is imported in `app.module.ts`
2. `CONVERSATION_RUNTIME_ENABLED=true`
3. Event emitter is configured properly
4. Database migrations are run

### Issue: No responses generated
**Check:**
1. OpenAI API key is valid
2. LLM service is accessible
3. Prompt builder is constructing prompts
4. Response validator is not rejecting all responses

### Issue: Knowledge base not searched
**Check:**
1. Knowledge base documents are uploaded
2. Documents are indexed
3. Search query is formatted correctly
4. Company/campaign IDs match

## Best Practices

1. **Event-Driven**: Use events for loose coupling
2. **Error Handling**: Always handle errors gracefully
3. **Async Operations**: Use async/await properly
4. **Logging**: Log all critical operations
5. **Testing**: Test integrations thoroughly
6. **Monitoring**: Monitor event flow and latency

## Next Steps

1. Test each integration point individually
2. Run end-to-end integration tests
3. Monitor production metrics
4. Optimize performance bottlenecks
5. Add custom integrations as needed
