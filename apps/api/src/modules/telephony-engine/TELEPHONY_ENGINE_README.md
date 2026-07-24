# Enterprise Telephony Engine

## Overview

The Enterprise Telephony Engine is a production-ready, provider-agnostic telephony system that enables AI-powered voice calling capabilities. It provides a clean abstraction layer over multiple telephony providers (Twilio, Exotel, Plivo, SIP, Asterisk) allowing seamless provider switching without code changes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Calling Pipeline                       │
│                  (Campaign & Contact Management)             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              Pipeline Integration Service                    │
│           (Connects Pipeline to Telephony Engine)           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                Telephony Manager Service                     │
│              (Main Facade & Orchestrator)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬─────────────────┐
        │               │               │                 │
        ↓               ↓               ↓                 ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    Call      │ │   Session    │ │  Recording   │ │   Webhook    │
│   Manager    │ │   Manager    │ │   Manager    │ │   Manager    │
└──────┬───────┘ └──────────────┘ └──────────────┘ └──────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────┐
│               Provider Manager Service                       │
│             (Provider Registry & Switching)                  │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬─────────────────┐
        │               │               │                 │
        ↓               ↓               ↓                 ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Twilio     │ │   Exotel     │ │    Plivo     │ │  SIP/Other   │
│   Provider   │ │   Provider   │ │   Provider   │ │   Provider   │
│  (Complete)  │ │   (Ready)    │ │   (Ready)    │ │   (Ready)    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Core Components

### 1. TelephonyManagerService
Main facade service coordinating all telephony operations.

**Responsibilities:**
- Call lifecycle management
- Provider coordination
- Statistics & monitoring
- Health checks

### 2. PipelineIntegrationService
Bridges the Telephony Engine with the AI Calling Pipeline.

**Responsibilities:**
- Pipeline call initiation
- Event translation (telephony → pipeline)
- Metadata management
- Status synchronization

### 3. CallManagerService
Handles core call operations.

**Responsibilities:**
- Making calls
- Ending calls
- Call status tracking
- DTMF & transfer

### 4. CallSessionManagerService
Tracks active call sessions.

**Responsibilities:**
- Session creation & tracking
- State management
- Session cleanup
- Statistics

### 5. OutgoingCallService
Manages outbound calls.

**Responsibilities:**
- Call initiation
- Retry logic
- Cancellation
- Busy/No-answer detection

### 6. IncomingCallService
Handles inbound calls.

**Responsibilities:**
- Call routing
- Call forwarding
- Voicemail handling

### 7. RecordingManagerService
Manages call recordings.

**Responsibilities:**
- Recording retrieval
- Download management
- Storage cleanup
- Format conversion

### 8. WebhookManagerService
Processes provider webhooks.

**Responsibilities:**
- Webhook validation
- Payload parsing
- Event routing
- Security verification

### 9. ProviderManagerService
Manages telephony providers.

**Responsibilities:**
- Provider registration
- Provider switching
- Capability checks
- Configuration

## Provider Interface

All providers implement `ITelephonyProvider`:

```typescript
interface ITelephonyProvider {
  // Metadata
  getName(): string;
  getType(): string;
  getCapabilities(): ProviderCapabilities;
  
  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  isReady(): boolean;
  healthCheck(): Promise<boolean>;
  
  // Call Operations
  makeCall(params: CallInitiationParams): Promise<CallResult>;
  hangupCall(callSid: string): Promise<boolean>;
  getCallStatus(callSid: string): Promise<CallResult>;
  updateCall(callSid: string, updates: Partial<CallInitiationParams>): Promise<CallResult>;
  
  // Call Control
  sendDTMF(callSid: string, digits: string): Promise<boolean>;
  transferCall(callSid: string, to: string): Promise<boolean>;
  
  // Recordings
  getRecording(recordingSid: string): Promise<RecordingInfo>;
  downloadRecording(recordingUrl: string): Promise<Buffer>;
  
  // Webhooks
  parseWebhook(payload: any): WebhookPayload;
  validateWebhookSignature(signature: string, url: string, params: any): boolean;
  generateCallControl(instructions: CallControlInstructions): CallControlResponse;
  
  // Utilities
  estimateCallCost(from: string, to: string, duration: number): Promise<number>;
}
```

## Call States

```typescript
enum CallState {
  QUEUED = 'queued',
  DIALING = 'dialing',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  TALKING = 'talking',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RETRY = 'retry',
}
```

## Event System

### Telephony Engine Events
```typescript
'telephony.call.initiated'    // Call started
'telephony.call.ringing'      // Phone ringing
'telephony.call.answered'     // Call answered
'telephony.call.completed'    // Call ended
'telephony.call.failed'       // Call failed
'telephony.call.busy'         // Line busy
'telephony.call.no_answer'    // No answer
'telephony.recording.ready'   // Recording available
'telephony.dtmf.sent'         // DTMF tones sent
'telephony.call.transferred'  // Call transferred
```

### Pipeline Events
```typescript
'pipeline.call.initiated'     // Pipeline call started
'pipeline.call.dialing'       // Dialing in progress
'pipeline.call.ringing'       // Ringing
'pipeline.call.answered'      // Call answered
'pipeline.call.completed'     // Call completed
'pipeline.call.failed'        // Call failed
'pipeline.call.busy'          // Line busy
'pipeline.call.no_answer'     // No answer
'pipeline.recording.ready'    // Recording ready
```

## REST API Endpoints

### Calls
```
POST   /api/v1/telephony/call              # Make call
POST   /api/v1/telephony/hangup            # Hang up
POST   /api/v1/telephony/retry             # Retry call
POST   /api/v1/telephony/cancel            # Cancel call
GET    /api/v1/telephony/status/:callSid   # Get status
GET    /api/v1/telephony/session/:callSid  # Get session
GET    /api/v1/telephony/active-calls      # Active calls
```

### Call Control
```
POST   /api/v1/telephony/transfer          # Transfer call
POST   /api/v1/telephony/dtmf              # Send DTMF
```

### Recordings
```
GET    /api/v1/telephony/recording/:recordingSid               # Get metadata
GET    /api/v1/telephony/recording/:recordingSid/download      # Download
GET    /api/v1/telephony/call/:callSid/recordings             # Call recordings
```

### Providers
```
GET    /api/v1/telephony/providers                  # List providers
POST   /api/v1/telephony/provider/switch           # Switch provider
GET    /api/v1/telephony/provider/capabilities     # Get capabilities
```

### Monitoring
```
GET    /api/v1/telephony/statistics        # Get statistics
GET    /api/v1/telephony/health            # Health check
POST   /api/v1/telephony/estimate-cost     # Estimate cost
```

### Webhooks
```
POST   /api/v1/webhooks/telephony/twilio/:type    # Twilio webhooks
POST   /api/v1/webhooks/telephony/exotel/:type    # Exotel webhooks
POST   /api/v1/webhooks/telephony/plivo/:type     # Plivo webhooks
```

## Usage Examples

### Making a Call (via Pipeline Integration)

```typescript
import { PipelineIntegrationService } from './services/pipeline-integration.service';

// Inject service
constructor(
  private readonly pipelineIntegration: PipelineIntegrationService,
) {}

// Make call
const result = await this.pipelineIntegration.initiateCallFromPipeline({
  contactId: 'contact_123',
  campaignId: 'campaign_456',
  phoneNumber: '+1234567890',
  fromNumber: '+0987654321',
  callbackUrl: 'https://api.example.com/webhooks/call',
  statusCallbackUrl: 'https://api.example.com/webhooks/status',
  recordingCallbackUrl: 'https://api.example.com/webhooks/recording',
  metadata: {
    executionId: 'exec_789',
    customField: 'value',
  },
});

console.log(`Call initiated: ${result.callSid}`);
console.log(`Status: ${result.status}`);
```

### Making a Call (Direct)

```typescript
import { TelephonyManagerService } from './services/telephony-manager.service';

// Inject service
constructor(
  private readonly telephonyManager: TelephonyManagerService,
) {}

// Make call
const result = await this.telephonyManager.makeCall({
  to: '+1234567890',
  from: '+0987654321',
  callbackUrl: 'https://api.example.com/webhook',
  statusCallbackUrl: 'https://api.example.com/status',
  timeout: 60,
  record: true,
  machineDetection: true,
  metadata: {
    campaignId: 'camp_123',
  },
});

console.log(`Call SID: ${result.callSid}`);
console.log(`Status: ${result.status}`);
```

### Listening to Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class CallEventListener {
  @OnEvent('pipeline.call.answered')
  handleCallAnswered(payload: any) {
    console.log(`Call answered: ${payload.callSid}`);
    console.log(`Contact: ${payload.contactId}`);
    console.log(`Answered by: ${payload.answeredBy}`);
    
    // Start AI conversation
    this.startConversation(payload.callSid);
  }

  @OnEvent('pipeline.call.completed')
  handleCallCompleted(payload: any) {
    console.log(`Call completed: ${payload.callSid}`);
    console.log(`Duration: ${payload.duration} seconds`);
    
    // Save analytics
    this.saveCallMetrics(payload);
  }

  @OnEvent('pipeline.recording.ready')
  async handleRecordingReady(payload: any) {
    console.log(`Recording ready: ${payload.recordingSid}`);
    
    // Download and process recording
    const buffer = await this.pipelineIntegration.downloadRecordingForPipeline(
      payload.recordingSid,
    );
    
    // Save to storage
    await this.saveRecording(buffer, payload.callSid);
    
    // Transcribe if needed
    await this.transcribeRecording(buffer);
  }
}
```

### Switching Providers

```typescript
// Switch to Exotel
await this.telephonyManager.switchProvider('exotel');

// Verify switch
const provider = this.telephonyManager.getActiveProvider();
console.log(`Active provider: ${provider.name}`);
console.log(`Provider type: ${provider.type}`);
console.log(`Ready: ${provider.ready}`);
```

### Getting Statistics

```typescript
const stats = await this.telephonyManager.getStatistics();

console.log(`Total sessions: ${stats.sessions.total}`);
console.log(`Active calls: ${stats.sessions.active}`);
console.log(`Completed: ${stats.sessions.completed}`);
console.log(`Failed: ${stats.sessions.failed}`);
console.log(`Total recordings: ${stats.recordings.total}`);
console.log(`Provider: ${stats.provider.name}`);
```

## Configuration

### Environment Variables

```bash
# Active Provider
TELEPHONY_ENGINE_PROVIDER=twilio

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx

# Call Settings
TELEPHONY_ENGINE_RECORDING_ENABLED=true
TELEPHONY_ENGINE_MACHINE_DETECTION=true
TELEPHONY_ENGINE_CALL_TIMEOUT=60
TELEPHONY_ENGINE_MAX_CONCURRENT_CALLS=10

# Webhook Settings
TELEPHONY_ENGINE_WEBHOOK_BASE_URL=https://your-domain.com
TELEPHONY_ENGINE_WEBHOOK_VERIFY_SIGNATURE=true
```

## Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Run telephony engine tests
npm run test telephony-engine

# Run specific test file
npm run test twilio-provider.spec

# Run with coverage
npm run test:cov
```

### Integration Tests

```bash
# Run integration tests (requires credentials)
npm run test:integration telephony-engine

# Run specific integration test
npm run test:integration call-flow.integration
```

### Manual Testing

```bash
# Windows
.\test-telephony-engine.ps1

# Linux/Mac
./test-telephony-engine.sh
```

## Provider Implementation Status

### ✅ Twilio (Complete)
- ✅ Call initiation
- ✅ Call control (hangup, transfer)
- ✅ DTMF support
- ✅ Recording management
- ✅ Webhook processing
- ✅ TwiML generation
- ✅ Machine detection
- ✅ Cost estimation

### 🏗️ Exotel (Architecture Ready)
- 🏗️ Provider stub created
- 🏗️ Interface implemented
- ⏳ API integration pending
- ⏳ Webhook handlers pending

### 🏗️ Plivo (Architecture Ready)
- 🏗️ Provider stub created
- 🏗️ Interface implemented
- ⏳ API integration pending
- ⏳ Webhook handlers pending

### 🏗️ SIP (Architecture Ready)
- 🏗️ Provider interface defined
- ⏳ SIP stack integration pending

### 🏗️ Asterisk (Architecture Ready)
- 🏗️ Provider interface defined
- ⏳ AMI integration pending

## Performance Considerations

### Concurrency
- Supports thousands of concurrent calls (provider-dependent)
- Twilio: 10,000+ concurrent calls
- Session tracking optimized for high throughput

### Scalability
- Stateless design allows horizontal scaling
- Event-driven architecture for loose coupling
- Provider abstraction enables multi-provider load distribution

### Reliability
- Automatic retry logic for failed calls
- Health checks for provider monitoring
- Webhook signature verification for security
- Graceful error handling and recovery

## Security

### Webhook Security
- Signature verification for all providers
- HTTPS-only webhooks
- Request origin validation

### Data Protection
- No sensitive data in logs
- Encrypted credential storage
- Minimal data retention

### Access Control
- JWT authentication on all endpoints
- Role-based access control ready
- Rate limiting support

## Troubleshooting

### Common Issues

**Issue: "No active telephony provider"**
- **Cause**: Provider not initialized
- **Solution**: Check `TELEPHONY_ENGINE_PROVIDER` in `.env`

**Issue: "Webhook signature validation failed"**
- **Cause**: Incorrect webhook secret or URL
- **Solution**: Verify `TWILIO_WEBHOOK_SECRET` and webhook URL configuration

**Issue: "Call failed immediately"**
- **Cause**: Invalid phone number or insufficient credits
- **Solution**: Verify phone number format (E.164) and Twilio account balance

**Issue: "Recording not found"**
- **Cause**: Recording not ready or deleted
- **Solution**: Wait for `recording.ready` event before downloading

## Migration Guide

See [TELEPHONY_ENGINE_MIGRATION_GUIDE.md](../../../../TELEPHONY_ENGINE_MIGRATION_GUIDE.md) for complete migration instructions from the old telephony module.

## Contributing

### Adding a New Provider

1. Create provider class implementing `ITelephonyProvider`
2. Add provider to `ProviderRegistryService`
3. Update environment configuration
4. Add provider tests
5. Update documentation

### Code Style

- Follow NestJS conventions
- Use TypeScript strict mode
- Write comprehensive tests
- Document public APIs
- Use dependency injection

## Support

For issues, questions, or contributions:

1. Check existing documentation
2. Review test files for usage examples
3. Check server logs for detailed errors
4. Consult Twilio documentation for provider-specific issues

## License

Proprietary - All Rights Reserved
