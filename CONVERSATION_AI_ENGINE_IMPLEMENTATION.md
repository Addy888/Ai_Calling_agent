# AI Conversation Engine Implementation Plan

## Overview
Enterprise-grade real-time AI conversation engine for phone calling with streaming audio, multilingual support, and sub-1.5 second latency.

## Architecture

```
Customer Speech
     ↓
Realtime Audio Stream (WebSocket)
     ↓
Audio Buffer Service
     ↓
Voice Activity Detection
     ↓
Silence Detection
     ↓
Faster Whisper STT (<300ms)
     ↓
Transcript
     ↓
Conversation Context
     ↓
Memory Retrieval (<50ms)
     ↓
Knowledge Base Search (<100ms)
     ↓
Prompt Engine
     ↓
Ollama LLM Streaming (<700ms first token)
     ↓
Response Validator
     ↓
Emotion Engine
     ↓
Kokoro XTTS Streaming
     ↓
Real-time Audio Stream
     ↓
Customer
```

## Implementation Status

### Phase 1: Core Infrastructure ✅
- [x] Module setup
- [x] Controller with REST endpoints
- [x] WebSocket Gateway with Socket.IO
- [x] Event-driven architecture

### Phase 2: Speech-to-Text Pipeline (IN PROGRESS)
- [ ] WhisperSTTService - Faster Whisper integration
- [ ] VoiceActivityDetectionService - VAD with WebRTC VAD
- [ ] AudioBufferService - Circular buffer management
- [ ] SilenceDetectionService - Silence threshold detection
- [ ] LanguageDetectionService - Auto language detection (Hindi/English/Marathi)

### Phase 3: LLM Pipeline
- [ ] OllamaLLMService - Ollama API integration
- [ ] StreamingLLMService - Token streaming
- [ ] FunctionCallingService - Tool calling
- [ ] ContextWindowService - Context management

### Phase 4: Memory Management
- [ ] ConversationMemoryService - Short-term memory
- [ ] SessionMemoryService - Session context
- [ ] CustomerMemoryService - Long-term customer memory
- [ ] MemoryRetrievalService - Memory search

### Phase 5: Prompt Engineering
- [ ] PromptEngineService - Dynamic prompt generation
- [ ] DynamicPromptService - Context-aware prompts
- [ ] PromptTemplateService - Template management

### Phase 6: Conversation Flow
- [ ] ConversationFlowService - Flow orchestration
- [ ] IntentDetectionService - Intent classification
- [ ] InterruptionHandlerService - Interruption management
- [ ] ConversationBranchingService - Dynamic branching

### Phase 7: Response Generation
- [ ] ResponseGenerationService - Response orchestration
- [ ] ResponseValidatorService - Response validation
- [ ] EmotionEngineService - Emotion detection & generation

### Phase 8: Text-to-Speech Pipeline
- [ ] TTSEngineService - TTS orchestration
- [ ] StreamingTTSService - Streaming audio synthesis
- [ ] VoiceEmotionService - Emotional voice modulation
- [ ] AudioSynthesisService - Audio processing

### Phase 9: Orchestration
- [ ] ConversationOrchestratorService - Main orchestrator
- [ ] AudioStreamManagerService - Audio stream management
- [ ] ConversationAIEngineService - Service facade

### Phase 10: Analytics & Monitoring
- [ ] CallSummaryService - Call summarization
- [ ] LeadScoringService - Lead scoring
- [ ] ConversationAnalyticsService - Analytics
- [ ] PerformanceMonitorService - Performance tracking
- [ ] ErrorHandlerService - Error handling

### Phase 11: Configuration
- [ ] AIEngineConfigService - Configuration management
- [ ] DTOs and interfaces

## Technical Requirements

### Dependencies (to be added to package.json)
```json
{
  "@huggingface/transformers": "^3.0.0",
  "axios": "^1.6.0",
  "fluent-ffmpeg": "^2.1.2",
  "node-webrtc-vad": "^0.1.0",
  "prism-media": "^1.3.5",
  "sharp": "^0.33.0",
  "wav": "^1.0.2"
}
```

### External Services Configuration
```env
# Faster Whisper Service
WHISPER_SERVICE_URL=http://localhost:8000
WHISPER_MODEL=base
WHISPER_LANGUAGE=auto

# Ollama LLM
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TEMPERATURE=0.7
OLLAMA_MAX_TOKENS=2048

# Kokoro XTTS (already configured in AIAgentModule)
KOKORO_TTS_URL=http://localhost:8001

# Performance Targets
STT_TIMEOUT_MS=300
KNOWLEDGE_TIMEOUT_MS=100
LLM_FIRST_TOKEN_MS=700
TOTAL_RESPONSE_MS=1500
```

### Whisper Service Setup
Create a separate Python FastAPI service for Faster Whisper:

```python
# apps/whisper-service/main.py
from faster_whisper import WhisperModel
from fastapi import FastAPI, File, UploadFile
import uvicorn

app = FastAPI()
model = WhisperModel("base", device="cuda")

@app.post("/transcribe")
async def transcribe(audio: UploadFile):
    segments, info = model.transcribe(audio.file)
    return {
        "text": " ".join([s.text for s in segments]),
        "language": info.language,
        "segments": [{"text": s.text, "start": s.start, "end": s.end} for s in segments]
    }
```

## Database Schema Extensions

Add to Prisma schema:

```prisma
model ConversationSession {
  id            String   @id @default(uuid())
  callId        String
  campaignId    String
  contactId     String
  sessionId     String   @unique
  status        ConversationStatus @default(ACTIVE)
  language      String   @default("en")
  
  // Metadata
  startedAt     DateTime @default(now())
  endedAt       DateTime?
  duration      Int?
  turnCount     Int      @default(0)
  
  // Performance metrics
  avgSttLatency Float?
  avgLlmLatency Float?
  avgTtsLatency Float?
  avgTotalLatency Float?
  
  // Results
  intent        String?
  leadScore     Float?
  emotion       String?
  summary       String?  @db.Text
  
  messages      ConversationMessage[]
  memories      ConversationMemory[]
  
  @@index([callId])
  @@index([sessionId])
  @@index([status])
  @@map("conversation_sessions")
}

enum ConversationStatus {
  ACTIVE
  PAUSED
  COMPLETED
  FAILED
  INTERRUPTED
}

model ConversationMessage {
  id              String   @id @default(uuid())
  sessionId       String
  role            MessageRole
  content         String   @db.Text
  language        String?
  confidence      Float?
  emotion         String?
  intent          String?
  
  // Performance
  sttLatency      Int?
  llmLatency      Int?
  ttsLatency      Int?
  totalLatency    Int?
  
  // Audio
  audioUrl        String?
  audioDuration   Float?
  
  metadata        Json?
  createdAt       DateTime @default(now())
  
  session         ConversationSession @relation(fields: [sessionId], references: [id])
  
  @@index([sessionId])
  @@index([role])
  @@map("conversation_messages")
}

enum MessageRole {
  CUSTOMER
  AI
  SYSTEM
}

model ConversationMemory {
  id          String   @id @default(uuid())
  sessionId   String
  type        MemoryType
  key         String
  value       String   @db.Text
  ttl         Int?     // Time to live in seconds
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  session     ConversationSession @relation(fields: [sessionId], references: [id])
  
  @@index([sessionId])
  @@index([type])
  @@index([key])
  @@map("conversation_memories")
}

enum MemoryType {
  SHORT_TERM
  SESSION
  CUSTOMER
  CONTEXT
}
```

## Service Implementation Order

1. **Configuration & Error Handling** (Foundation)
   - AIEngineConfigService
   - ErrorHandlerService
   - PerformanceMonitorService

2. **Audio Pipeline** (Input)
   - AudioBufferService
   - VoiceActivityDetectionService
   - SilenceDetectionService

3. **STT** (Transcription)
   - WhisperSTTService
   - LanguageDetectionService

4. **Memory & Knowledge** (Context)
   - MemoryRetrievalService
   - Knowledge integration (use existing KnowledgeModule)

5. **Prompt Engineering** (Preparation)
   - PromptTemplateService
   - DynamicPromptService
   - PromptEngineService

6. **LLM** (Intelligence)
   - OllamaLLMService
   - StreamingLLMService
   - ContextWindowService
   - FunctionCallingService

7. **Response Management** (Processing)
   - IntentDetectionService
   - EmotionEngineService
   - ResponseValidatorService
   - ResponseGenerationService

8. **TTS** (Output)
   - VoiceEmotionService
   - AudioSynthesisService
   - StreamingTTSService
   - TTSEngineService

9. **Conversation Management** (Flow)
   - InterruptionHandlerService
   - ConversationBranchingService
   - ConversationFlowService

10. **Analytics** (Insights)
    - CallSummaryService
    - LeadScoringService
    - ConversationAnalyticsService

11. **Orchestration** (Integration)
    - AudioStreamManagerService
    - ConversationOrchestratorService
    - ConversationAIEngineService

## Key Features

### Real-time Streaming
- WebSocket-based bidirectional audio streaming
- Chunked audio processing (100-200ms chunks)
- Low-latency event emission

### Multilingual Support
- Auto language detection
- Support for Hindi, English, Marathi, mixed language
- Language-specific prompt templates

### Interruption Handling
- Real-time VAD for interruption detection
- TTS cancellation on interruption
- Conversation state preservation

### Memory Management
- Short-term: Current conversation context
- Session: Full call context
- Customer: Historical customer data
- Context window management for LLM

### Function Calling
- CRM integration functions
- Appointment booking
- Callback scheduling
- Lead qualification

### Emotion Intelligence
- Customer emotion detection
- AI emotion generation
- Emotional voice modulation

### Performance Optimization
- Parallel processing where possible
- Streaming responses
- Caching strategies
- Connection pooling

## Testing Strategy

1. Unit tests for each service
2. Integration tests for pipelines
3. End-to-end conversation tests
4. Load testing for concurrent conversations
5. Latency benchmarking

## Deployment Considerations

1. Separate containers for CPU-intensive services (Whisper, TTS)
2. GPU acceleration for Whisper and TTS
3. Redis for distributed state management
4. Load balancing for scalability
5. Health checks and auto-recovery

## Next Steps

1. Implement foundation services (Config, Error, Performance)
2. Set up Whisper service
3. Implement STT pipeline
4. Implement LLM integration
5. Implement TTS pipeline
6. Build orchestration layer
7. Comprehensive testing
8. Performance optimization
9. Documentation
10. Deployment guides
