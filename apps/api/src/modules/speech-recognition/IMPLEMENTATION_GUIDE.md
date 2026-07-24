# STT Engine Implementation Guide

This guide walks through implementing the Speech-to-Text engine in your AI Calling Agent.

## Quick Start

### 1. Start the Whisper Service

```bash
# Using Docker Compose
docker-compose -f docker-compose.stt.yml up -d

# Or manually
cd apps/whisper-service
pip install -r requirements.txt
python main.py
```

### 2. Verify Service Health

```bash
curl http://localhost:9000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_size": "base",
  "device": "cuda",
  "compute_type": "float16",
  "gpu_available": true
}
```

### 3. Test STT API

```bash
# Start a session
curl -X POST http://localhost:3001/api/v1/stt/start \
  -H "Content-Type: application/json" \
  -d '{
    "callSessionId": "test-call-123",
    "language": "en",
    "enablePartialResults": true
  }'

# Response: {"sessionId": "stt_1234567890_1", "message": "STT session started successfully"}
```

## Integration with Calling Pipeline

### Step 1: Import STT Module

In your calling pipeline module:

```typescript
// apps/api/src/modules/calling-pipeline/calling-pipeline.module.ts
import { SpeechRecognitionModule } from '../speech-recognition/speech-recognition.module';

@Module({
  imports: [
    // ... other imports
    SpeechRecognitionModule,
  ],
  // ...
})
export class CallingPipelineModule {}
```

### Step 2: Inject Pipeline Integration Service

```typescript
// apps/api/src/modules/calling-pipeline/services/call-lifecycle.service.ts
import { PipelineIntegrationService } from '../../speech-recognition/services/pipeline-integration.service';

@Injectable()
export class CallLifecycleService {
  constructor(
    // ... other services
    private readonly sttIntegration: PipelineIntegrationService,
  ) {}
}
```

### Step 3: Initialize STT on Call Start

```typescript
async initiateCall(params: InitiateCallParams): Promise<CallSession> {
  // 1. Create call session
  const callSession = await this.callSessionService.createSession({
    sessionId: this.generateSessionId(),
    contactId: params.contactId,
    campaignId: params.campaignId,
    agentId: params.agentId,
    phoneNumber: params.phoneNumber,
  });

  // 2. Initialize STT
  const sttSessionId = await this.sttIntegration.initializeForCall({
    callSessionId: callSession.id,
    language: params.language || 'auto',
    enablePartialResults: true,
  });

  this.logger.log(
    `STT initialized for call ${callSession.id} → ${sttSessionId}`
  );

  // 3. Connect telephony...
  // ... rest of implementation

  return callSession;
}
```

### Step 4: Stream Audio from Telephony

```typescript
// In your telephony provider (Twilio/Exotel)
class TwilioProvider {
  constructor(
    private readonly sttIntegration: PipelineIntegrationService,
  ) {}

  async handleMediaStream(message: any, callSessionId: string) {
    // Decode Twilio's media message
    const audioData = Buffer.from(message.media.payload, 'base64');

    // Stream to STT
    await this.sttIntegration.streamAudioFromCall(
      callSessionId,
      audioData,
      20 // chunk duration in ms
    );
  }
}
```

### Step 5: Handle Transcript Events

```typescript
// Subscribe to transcript events
@OnEvent('call.final.transcript')
async handleFinalTranscript(payload: any) {
  const { callSessionId, text, confidence, language } = payload;

  this.logger.log(
    `Customer said (${language}, ${(confidence * 100).toFixed(0)}% confidence): ${text}`
  );

  // 1. Update call session transcript
  await this.callSessionService.addTranscriptTurn(
    callSessionId,
    'customer',
    text
  );

  // 2. Send to conversation engine for AI response
  await this.conversationEngine.processCustomerInput({
    callSessionId,
    text,
    language,
    confidence,
  });
}

@OnEvent('call.silence.detected')
async handleSilence(payload: any) {
  const { callSessionId, silenceDurationMs } = payload;

  this.logger.log(`Long silence detected (${silenceDurationMs}ms) on call ${callSessionId}`);

  // Optionally prompt the customer
  await this.conversationEngine.handleSilence(callSessionId);
}
```

### Step 6: Finalize STT on Call End

```typescript
async endCall(callSessionId: string): Promise<void> {
  // 1. Stop STT and get final transcript
  const { fullText, turnsCount } = await this.sttIntegration.finalizeForCall(
    callSessionId
  );

  this.logger.log(
    `Call ${callSessionId} ended. Transcript: ${turnsCount} turns, ${fullText.length} characters`
  );

  // 2. Store transcript in database
  await this.transcriptService.saveTranscript({
    callSessionId,
    fullText,
    turnsCount,
  });

  // 3. Finalize call session
  await this.callSessionService.finalizeSession(callSessionId);

  // 4. Disconnect telephony
  await this.telephonyProvider.hangup(callSessionId);
}
```

## Event-Driven Architecture

### Available Events

The STT engine emits the following events that you can listen to:

```typescript
// Speech detection events
'call.speech.started'      // Customer started speaking
'call.speech.ended'        // Customer stopped speaking
'call.silence.detected'    // Long silence detected

// Transcript events
'call.partial.transcript'  // Real-time partial transcript (for UI updates)
'call.final.transcript'    // Final transcript (for conversation engine)
'call.language.detected'   // Language auto-detected

// Internal STT events (for monitoring)
'SpeechStarted'
'SpeechEnded'
'PartialTranscript'
'FinalTranscript'
'SilenceDetected'
'NoiseDetected'
'LanguageDetected'
'TranscriptCompleted'
```

### Event Listener Example

```typescript
@Injectable()
export class ConversationEngine {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('call.partial.transcript')
  handlePartialTranscript(payload: any) {
    // Update UI with real-time transcript
    this.websocketGateway.emit('transcript.partial', {
      callSessionId: payload.callSessionId,
      text: payload.text,
      confidence: payload.confidence,
    });
  }

  @OnEvent('call.final.transcript')
  async handleFinalTranscript(payload: any) {
    // Process customer input through AI
    const response = await this.generateAIResponse(payload.text);

    // Send response via TTS
    await this.ttsService.speak(payload.callSessionId, response);
  }

  @OnEvent('call.speech.started')
  handleSpeechStarted(payload: any) {
    // Interrupt agent if customer starts speaking
    await this.ttsService.interrupt(payload.callSessionId);
  }
}
```

## Advanced Configuration

### Custom VAD Thresholds

Fine-tune voice activity detection for your use case:

```typescript
// .env
STT_VAD_SPEECH_THRESHOLD=0.030  # Higher = less sensitive (fewer false positives)
STT_VAD_SILENCE_THRESHOLD=0.010  # Lower = more sensitive to silence
STT_VAD_SILENCE_MS=1500          # Longer silence before triggering event
STT_VAD_SHORT_PAUSE_MS=600       # Pause detection threshold
```

### Noise Reduction Settings

```typescript
// .env
STT_NOISE_REDUCTION_ENABLED=true
STT_NOISE_THRESHOLD=0.020  # Adjust for your audio quality
```

### Provider Selection

Switch between STT providers based on requirements:

```typescript
// For highest accuracy (but higher latency)
STT_PROVIDER=openai-whisper
WHISPER_MODEL_SIZE=large-v3

// For lowest latency (but lower accuracy)
STT_PROVIDER=faster-whisper
WHISPER_MODEL_SIZE=tiny

// For production balance
STT_PROVIDER=faster-whisper
WHISPER_MODEL_SIZE=base
```

## Performance Optimization

### 1. GPU Acceleration

Enable GPU for Faster Whisper:

```yaml
# docker-compose.stt.yml
services:
  whisper-stt:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### 2. Model Caching

Models are cached after first download:

```bash
# Set custom model directory
WHISPER_MODEL_DIR=/path/to/models
```

### 3. Connection Pooling

For high-throughput scenarios, deploy multiple Whisper instances:

```yaml
services:
  whisper-stt-1:
    # ... config
  whisper-stt-2:
    # ... config
  whisper-stt-3:
    # ... config
  
  nginx-lb:
    image: nginx:alpine
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

### 4. Monitor Performance

```typescript
// Inject performance monitor
constructor(
  private readonly perfMonitor: PerformanceMonitorService,
) {}

// Log performance summary periodically
setInterval(() => {
  this.perfMonitor.logPerformanceSummary();
}, 60000); // Every minute
```

## Testing

### Unit Tests

```bash
npm test -- speech-recognition
```

### Integration Tests

```bash
npm test -- speech-recognition-integration
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test-stt.yml
```

Example load test configuration:

```yaml
# load-test-stt.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "STT Session Lifecycle"
    flow:
      - post:
          url: "/api/v1/stt/start"
          json:
            callSessionId: "load-test-{{ $uuid }}"
            language: "en"
      - think: 1
      - post:
          url: "/api/v1/stt/stream"
          formData:
            audio: "@test-audio.pcm"
            sessionId: "{{ sessionId }}"
      - think: 2
      - post:
          url: "/api/v1/stt/stop"
          json:
            sessionId: "{{ sessionId }}"
```

## Troubleshooting

### Issue: High CPU Usage

**Solution:**
- Use GPU acceleration
- Reduce concurrent sessions
- Use smaller model (`tiny` or `base`)

### Issue: Transcript Accuracy Problems

**Solution:**
- Verify audio format (16-bit mono, 16kHz)
- Check for network packet loss
- Adjust VAD thresholds
- Use larger model
- Specify language instead of auto-detect

### Issue: Latency > 500ms

**Solution:**
- Check network latency to Whisper service
- Enable GPU
- Use smaller model
- Reduce beam_size
- Check server resources (CPU/RAM/GPU)

### Issue: Memory Leaks

**Solution:**
- Ensure all sessions are properly stopped
- Monitor active session count
- Check for event listener leaks
- Review buffer cleanup

## Production Checklist

- [ ] GPU acceleration enabled
- [ ] Proper model size selected (base or small for production)
- [ ] VAD thresholds tuned for your audio quality
- [ ] Error handling and retries implemented
- [ ] Monitoring and alerting configured
- [ ] Transcript storage implemented (database)
- [ ] Load balancing for high throughput
- [ ] Health checks configured
- [ ] Log rotation enabled
- [ ] Backup Whisper instances for failover
- [ ] Rate limiting configured
- [ ] Security: API authentication enabled
- [ ] Compliance: Transcript retention policy defined

## Next Steps

1. **Implement TTS Integration**: Connect STT transcripts to Text-to-Speech for agent responses
2. **Analytics Dashboard**: Visualize transcript quality, latency, and language distribution
3. **Training Data Pipeline**: Export transcripts for model fine-tuning
4. **Real-time Dashboard**: Build WebSocket-based live transcript viewer

## Support

For issues or questions:
- Check logs: `docker logs ai-calling-whisper-stt`
- Review README.md for detailed documentation
- Check GitHub issues for known problems
