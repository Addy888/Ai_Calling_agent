# AI Conversation Engine Module

## Overview

Enterprise-grade real-time AI conversation engine for phone calling with streaming audio, multilingual support, and sub-1.5 second latency.

## Architecture

```
Customer Speech → Audio Stream → VAD → STT (Whisper) → Transcript
                                                            ↓
                                                    Memory + Knowledge
                                                            ↓
                                                    Prompt Engine
                                                            ↓
                                                    LLM (Ollama)
                                                            ↓
                                                    Response Validator
                                                            ↓
                                                    Emotion Engine
                                                            ↓
                                                    TTS (Kokoro)
                                                            ↓
                                             Audio Stream → Customer
```

## Features

### Core Capabilities
- ✅ Real-time speech-to-text (Faster Whisper)
- ✅ LLM conversation (Ollama)
- ✅ Text-to-speech streaming (Kokoro XTTS)
- ✅ Memory management (short-term, session, customer)
- ✅ Dynamic prompt generation
- ✅ Knowledge base integration
- ✅ Intent detection
- ✅ Emotion analysis
- ✅ Interruption handling
- ✅ Function calling
- ✅ Call summarization
- ✅ Performance monitoring

### Multilingual Support
- English
- Hindi
- Marathi
- Mixed language conversations
- Automatic language detection

### Performance Targets
- STT: <300ms
- Knowledge: <100ms
- LLM First Token: <700ms
- Total Response: <1.5s

## API Endpoints

### REST API

```
POST   /api/v1/conversation-ai-engine/conversations/start
POST   /api/v1/conversation-ai-engine/conversations/:sessionId/audio
POST   /api/v1/conversation-ai-engine/conversations/:sessionId/end
GET    /api/v1/conversation-ai-engine/conversations/:sessionId/state
GET    /api/v1/conversation-ai-engine/conversations/:sessionId/transcript
GET    /api/v1/conversation-ai-engine/conversations/:sessionId/summary
GET    /api/v1/conversation-ai-engine/config
PUT    /api/v1/conversation-ai-engine/config
POST   /api/v1/conversation-ai-engine/test/whisper
POST   /api/v1/conversation-ai-engine/test/ollama
POST   /api/v1/conversation-ai-engine/test/tts
GET    /api/v1/conversation-ai-engine/health
GET    /api/v1/conversation-ai-engine/metrics
GET    /api/v1/conversation-ai-engine/analytics/conversations
GET    /api/v1/conversation-ai-engine/analytics/performance
```

### WebSocket

```
Namespace: /conversation-ai-engine

Client Events:
- start_conversation
- end_conversation
- audio_chunk

Server Events:
- connected
- conversation_started
- customer_speaking
- transcript_updated
- ai_thinking
- knowledge_retrieved
- llm_responding
- ai_speaking
- interruption_detected
- intent_detected
- emotion_detected
- function_call
- summary_generated
- metrics
- error
```

## Services

### Core Services
1. **ConversationAIEngineService** - Main facade
2. **ConversationOrchestratorService** - Pipeline orchestrator
3. **PerformanceMonitorService** - Metrics tracking
4. **AIEngineConfigService** - Configuration management
5. **ErrorHandlerService** - Error handling

### AI Services
6. **WhisperSTTService** - Speech-to-text
7. **OllamaLLMService** - Language model
8. **TTSEngineService** - Text-to-speech

### Context Services
9. **ConversationMemoryService** - Memory management
10. **PromptEngineService** - Prompt generation
11. **ResponseGenerationService** - Response validation
12. **CallSummaryService** - Call summarization

### Detection Services
13. **IntentDetectionService** - Intent classification
14. **EmotionEngineService** - Emotion analysis
15. **InterruptionHandlerService** - Interruption management

### Additional Services (Stubs)
16-34. Audio processing, streaming, analytics, etc.

## Configuration

### Environment Variables

```env
# Whisper STT
WHISPER_SERVICE_URL=http://localhost:8000
WHISPER_MODEL=base
WHISPER_TIMEOUT_MS=5000

# Ollama LLM
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TIMEOUT_MS=30000

# Kokoro TTS
KOKORO_TTS_URL=http://localhost:8001

# Performance
STT_MAX_LATENCY=300
LLM_FIRST_TOKEN_MAX=700
TOTAL_RESPONSE_MAX=1500
```

### Runtime Configuration

```typescript
const config: AIEngineConfig = {
  whisper: {
    model: 'base',
    language: 'auto',
    timeout: 300,
  },
  llm: {
    model: 'llama3',
    temperature: 0.7,
    maxTokens: 2048,
    streaming: true,
  },
  tts: {
    voice: 'default',
    streaming: true,
    emotion: true,
  },
  conversation: {
    language: 'auto',
    silenceTimeout: 2000,
    interruptTimeout: 500,
    enableInterruptions: true,
  },
};
```

## Usage

### Starting a Conversation

**REST:**
```typescript
POST /api/v1/conversation-ai-engine/conversations/start
{
  "campaignId": "campaign_123",
  "contactId": "contact_456",
  "callId": "call_789"
}
```

**WebSocket:**
```typescript
socket.emit('start_conversation', {
  campaignId: 'campaign_123',
  contactId: 'contact_456',
  callId: 'call_789',
});

socket.on('conversation_started', (data) => {
  console.log('Session ID:', data.sessionId);
});
```

### Streaming Audio

```typescript
socket.emit('audio_chunk', {
  sessionId: 'session_123',
  audioData: base64AudioData,
  sampleRate: 16000,
  channels: 1,
});
```

### Listening to Events

```typescript
socket.on('transcript_updated', (data) => {
  console.log(`${data.speaker}: ${data.text}`);
});

socket.on('ai_speaking', (data) => {
  console.log('AI:', data.text);
  // Play audio: data.audioData (base64)
});

socket.on('metrics', (data) => {
  console.log('Latency:', data.totalLatency, 'ms');
});
```

## Testing

### Unit Tests
```bash
npm test conversation-ai-engine
```

### Integration Tests
```bash
npm run test:e2e conversation-ai-engine
```

### Manual Testing

1. **Test Health:**
```bash
curl http://localhost:3001/api/v1/conversation-ai-engine/health
```

2. **Test Whisper:**
```bash
curl -X POST http://localhost:3001/api/v1/conversation-ai-engine/test/whisper \
  -H "Content-Type: application/json" \
  -d '{"audioData": "BASE64_AUDIO"}'
```

3. **Test Ollama:**
```bash
curl -X POST http://localhost:3001/api/v1/conversation-ai-engine/test/ollama \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'
```

## Database Models

### ConversationSession
- Session management
- Performance metrics
- Call results

### ConversationMessage
- Message history
- Transcripts
- Latency tracking

### ConversationMemory
- Context storage
- Customer history
- Session state

## Performance Monitoring

### Metrics Tracked
- STT latency
- LLM first token latency
- LLM total latency
- TTS latency
- Total response latency
- Conversation turn count
- Intent accuracy
- Emotion detection

### Analytics
- Conversation success rate
- Average lead score
- Intent distribution
- Emotion trends
- Performance trends

## Error Handling

- Automatic retry with exponential backoff
- Error classification (STT, LLM, TTS, etc.)
- Graceful degradation
- Error history tracking
- Alert generation for critical errors

## Dependencies

### External Services
- **Faster Whisper** - Speech-to-text (port 8000)
- **Ollama** - Language model (port 11434)
- **Kokoro XTTS** - Text-to-speech (port 8001)

### NestJS Modules
- MemoryModule
- KnowledgeModule
- PromptsModule
- AIAgentModule

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Docker
```bash
docker-compose up conversation-ai-engine
```

## Troubleshooting

### Common Issues

1. **Whisper Connection Failed**
   - Ensure Whisper service is running on port 8000
   - Check `WHISPER_SERVICE_URL` environment variable

2. **Ollama Timeout**
   - Verify Ollama is running: `ollama serve`
   - Check model is pulled: `ollama pull llama3`

3. **TTS Not Working**
   - Ensure Kokoro TTS service is running
   - Check `KOKORO_TTS_URL` configuration

4. **High Latency**
   - Check service health: `/health` endpoint
   - Review metrics: `/metrics` endpoint
   - Consider model optimization or hardware upgrade

## Contributing

1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

## License

Enterprise - Internal Use Only

## Support

For issues and questions:
- Slack: #ai-conversation-engine
- Email: ai-team@company.com
- Docs: https://docs.company.com/ai-conversation-engine
