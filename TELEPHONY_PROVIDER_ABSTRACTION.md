# Telephony Provider Abstraction

## Overview

The AI Calling Platform now supports **multiple telephony providers** through a clean provider abstraction pattern. The system can seamlessly switch between providers without any code changes - just by changing an environment variable.

## Supported Providers

### 1. Mock Provider (Development/Demo)
- **Purpose**: Development, testing, and demos
- **Use Case**: No real phone calls needed
- **Features**:
  - Simulates complete call flow
  - Runs full AI conversation
  - Generates transcripts
  - Generates recordings metadata
  - Updates Runtime Monitor
  - Zero cost for testing

### 2. Twilio Provider (Production)
- **Purpose**: Production environment
- **Use Case**: Real outbound calls to customers
- **Features**:
  - Real phone calls via Twilio Voice API
  - Call recording
  - Status webhooks
  - Live transcription
  - Media streaming ready
  - Production-grade reliability

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                Provider Abstraction                   │
├──────────────────────────────────────────────────────┤
│                                                        │
│          ITelephonyProvider (Interface)               │
│                       │                               │
│         ┌─────────────┴─────────────┐                │
│         │                           │                │
│         ▼                           ▼                │
│  MockTelephonyProvider      TwilioTelephonyProvider  │
│                                                        │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │ TelephonyService │ ← Provider-agnostic
          └──────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │ CallOrchestrator │
          └──────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │Campaign Execution│
          └──────────────────┘
```

## Key Principle

**The TelephonyService never knows which provider is being used.**

All provider-specific logic is isolated in the provider implementations. The service only interacts through the `ITelephonyProvider` interface.

## Switching Providers

### Method 1: Environment Variable (Recommended)

Simply change the `.env` file:

```bash
# For development/demo
TELEPHONY_PROVIDER=mock

# For production
TELEPHONY_PROVIDER=twilio
```

No code changes required. Restart the application.

### Method 2: Dynamic Configuration

The provider is selected at runtime based on the environment variable:

```typescript
// In telephony.module.ts
const telephonyProviderFactory = {
  provide: 'TELEPHONY_PROVIDER',
  useFactory: (configService: ConfigService, eventEmitter: EventEmitter2) => {
    const provider = configService.get<string>('TELEPHONY_PROVIDER', 'mock');
    
    switch (provider.toLowerCase()) {
      case 'twilio':
        return new TwilioTelephonyProvider(configService, eventEmitter);
      case 'mock':
      default:
        return new MockTelephonyProvider(eventEmitter);
    }
  },
  inject: [ConfigService, EventEmitter2],
};
```

## Provider Interface

All providers must implement the `ITelephonyProvider` interface:

```typescript
interface ITelephonyProvider {
  readonly name: string;
  
  initialize(): Promise<void>;
  makeCall(options: CallOptions): Promise<CallResult>;
  getCallStatus(callSid: string): Promise<CallStatusResult>;
  hangupCall(callSid: string): Promise<boolean>;
  getRecording(callSid: string): Promise<RecordingResult | null>;
  getTranscript(callSid: string): Promise<TranscriptEntry[]>;
  sendMessage?(callSid: string, message: string): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}
```

## Mock Provider Details

### Purpose
Development, testing, and demonstrations without incurring call costs.

### Features

1. **Simulated Call Progression**
   ```
   QUEUED → RINGING → IN_PROGRESS → COMPLETED
   ```

2. **AI Conversation Simulation**
   - Receives AI messages
   - Generates customer responses
   - Maintains transcript
   - Updates Runtime Monitor

3. **Realistic Behaviors**
   - Configurable delays (ringing: 1s, answer: 3s)
   - Random customer responses
   - Call duration tracking
   - Recording metadata generation

4. **Test Scenarios**
   ```typescript
   provider.simulateCallFailure(callSid, 'Network error');
   provider.simulateBusy(callSid);
   provider.simulateNoAnswer(callSid);
   ```

5. **Zero Cost**
   - No real phone calls
   - No Twilio charges
   - Perfect for CI/CD pipelines

### Usage

```typescript
// Set environment
TELEPHONY_PROVIDER=mock

// Make a "call"
const result = await telephonyService.makeCall({
  to: '+1234567890',
  from: '+0987654321',
  campaignId: 'camp-123',
  contactId: 'contact-456',
});

// Call SID: MOCK1234567890001
// Status: QUEUED
// → RINGING (1 second)
// → IN_PROGRESS (3 seconds)
// → Full AI conversation runs
// → Transcript generated
// → Runtime Monitor updated
```

### Mock Provider Configuration

```typescript
// In mock-telephony.provider.ts
private simulateCallProgression(callSid: string) {
  // Ringing after 1 second
  setTimeout(() => {
    this.updateStatus(callSid, CallStatus.RINGING);
  }, 1000);
  
  // Answered after 3 seconds
  setTimeout(() => {
    this.updateStatus(callSid, CallStatus.IN_PROGRESS);
  }, 3000);
}
```

## Twilio Provider Details

### Purpose
Production environment with real outbound calls.

### Features

1. **Real Phone Calls**
   - Uses Twilio Voice API
   - Outbound calling to any number
   - Call recording
   - Live transcription

2. **Webhook Integration**
   - Status callbacks (initiated, ringing, answered, completed)
   - Recording callbacks
   - Transcription callbacks
   - Media stream webhooks (future ready)

3. **Call Control**
   - Make calls
   - Hangup calls
   - Transfer calls (future)
   - Conference calls (future)

4. **Production Features**
   - Retry logic
   - Timeout handling
   - Error recovery
   - Health monitoring

5. **Security**
   - Webhook signature verification
   - Secure credential storage
   - TLS/HTTPS required

### Configuration

```bash
# Required environment variables
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890

# Optional
API_BASE_URL=https://your-domain.com
```

### Usage

```typescript
// Set environment
TELEPHONY_PROVIDER=twilio

// Make a real call
const result = await telephonyService.makeCall({
  to: '+1234567890',
  from: '+0987654321', // Or use default from TWILIO_PHONE_NUMBER
  campaignId: 'camp-123',
  contactId: 'contact-456',
  callbackUrl: 'https://your-domain.com/api/v1/telephony/webhooks/twilio/voice',
  statusCallbackUrl: 'https://your-domain.com/api/v1/telephony/webhooks/twilio/status',
});

// Call SID: CA1234567890abcdef
// Status: QUEUED
// → Twilio initiates real call
// → Status webhooks update progress
// → Recording captured
// → Transcript generated from Twilio
```

### Webhook Endpoints

```typescript
POST /api/v1/telephony/webhooks/twilio/voice
POST /api/v1/telephony/webhooks/twilio/status
POST /api/v1/telephony/webhooks/twilio/recording
POST /api/v1/telephony/webhooks/twilio/transcription
```

## TelephonyService (Provider-Agnostic)

The main service that applications interact with:

```typescript
@Injectable()
export class TelephonyService {
  constructor(
    @Inject('TELEPHONY_PROVIDER') private readonly provider: ITelephonyProvider,
  ) {}
  
  async makeCall(options: CallOptions): Promise<CallResult> {
    return await this.provider.makeCall(options);
  }
  
  // ... other methods
}
```

**Key Point**: The service never checks which provider is active. It just calls interface methods.

## Event System

Both providers emit the same events:

```typescript
// Events emitted by both providers
telephony.call_initiated
telephony.call_ringing
telephony.call_answered
telephony.call_completed
telephony.call_failed
telephony.recording_available
telephony.transcript_updated
```

### Event Payload

```typescript
{
  provider: 'MOCK' | 'TWILIO',
  callSid: 'string',
  timestamp: Date,
  ...additionalData
}
```

### Listening to Events

```typescript
@OnEvent('telephony.call_answered')
handleCallAnswered(payload: any) {
  const { provider, callSid, answeredBy } = payload;
  
  // Start AI conversation
  // Works identically for both providers
}
```

## Runtime Monitor Integration

Both providers update the Runtime Monitor identically:

```typescript
// Mock Provider
this.emitEvent(ProviderEventType.CALL_ANSWERED, callSid);

// Twilio Provider  
this.emitEvent(ProviderEventType.CALL_ANSWERED, callSid);

// Runtime Monitor receives:
{
  provider: 'MOCK' | 'TWILIO',
  callSid: 'xxx',
  timestamp: Date
}
```

The Runtime Monitor doesn't care about the provider - it just displays the data.

## REST API Endpoints

All endpoints work with both providers:

```bash
# Make call (works with both)
POST /api/v1/telephony/call
{
  "to": "+1234567890",
  "from": "+0987654321",
  "campaignId": "camp-123",
  "contactId": "contact-456"
}

# Get status (works with both)
GET /api/v1/telephony/call/:callSid/status

# Hangup (works with both)
POST /api/v1/telephony/call/:callSid/hangup

# Get recording (works with both)
GET /api/v1/telephony/call/:callSid/recording

# Get transcript (works with both)
GET /api/v1/telephony/call/:callSid/transcript

# Send message (works with both)
POST /api/v1/telephony/call/:callSid/message
{
  "message": "Hello, how are you today?"
}

# Health check
GET /api/v1/telephony/health

# Get provider info
GET /api/v1/telephony/provider
```

## Comparison

| Feature | Mock Provider | Twilio Provider |
|---------|--------------|-----------------|
| Real Phone Calls | ❌ No | ✅ Yes |
| Cost | 💰 Free | 💰 Per minute |
| AI Conversation | ✅ Yes | ✅ Yes |
| Transcript | ✅ Yes | ✅ Yes |
| Recording | ✅ Metadata | ✅ Real audio |
| Runtime Monitor | ✅ Yes | ✅ Yes |
| Call States | ✅ Simulated | ✅ Real |
| Customer Response | ✅ Random | ✅ Real speech |
| Development | ✅ Perfect | ⚠️ Costs money |
| Production | ❌ No | ✅ Yes |
| CI/CD Tests | ✅ Ideal | ❌ Expensive |
| Demo | ✅ Perfect | ⚠️ Requires setup |

## Use Cases

### Development
```bash
TELEPHONY_PROVIDER=mock
```
- Build features without Twilio costs
- Test AI conversation logic
- Debug issues quickly
- Run automated tests

### Staging
```bash
TELEPHONY_PROVIDER=mock  # or twilio
```
- Test with mock first
- Switch to twilio for final validation
- Cost-effective pre-production testing

### Production
```bash
TELEPHONY_PROVIDER=twilio
```
- Real customer calls
- Production reliability
- Full Twilio features

### Demo/Sales
```bash
TELEPHONY_PROVIDER=mock
```
- Show AI capabilities
- No real phone setup needed
- Zero cost for demos
- Quick demonstrations

## Adding New Providers

To add a new provider (e.g., Vonage, Bandwidth):

1. **Create Provider Class**
```typescript
export class VonageTelephonyProvider implements ITelephonyProvider {
  readonly name = 'VONAGE';
  
  async initialize() { /* ... */ }
  async makeCall() { /* ... */ }
  // ... implement all interface methods
}
```

2. **Register in Module**
```typescript
const telephonyProviderFactory = {
  provide: 'TELEPHONY_PROVIDER',
  useFactory: (configService, eventEmitter) => {
    const provider = configService.get('TELEPHONY_PROVIDER');
    
    switch (provider) {
      case 'twilio': return new TwilioTelephonyProvider(...);
      case 'vonage': return new VonageTelephonyProvider(...);
      case 'mock':
      default: return new MockTelephonyProvider(...);
    }
  },
};
```

3. **Update Environment**
```bash
TELEPHONY_PROVIDER=vonage
VONAGE_API_KEY=xxx
VONAGE_API_SECRET=yyy
```

4. **Done!** No changes to business logic needed.

## Testing

### Unit Tests

```typescript
describe('TelephonyService', () => {
  it('should work with Mock provider', () => {
    const provider = new MockTelephonyProvider(eventEmitter);
    const service = new TelephonyService(provider, eventEmitter);
    // Test...
  });
  
  it('should work with Twilio provider', () => {
    const provider = new TwilioTelephonyProvider(config, eventEmitter);
    const service = new TelephonyService(provider, eventEmitter);
    // Test...
  });
});
```

### Integration Tests

```typescript
describe('Call Flow', () => {
  beforeEach(() => {
    process.env.TELEPHONY_PROVIDER = 'mock';
  });
  
  it('should complete full call flow', async () => {
    const result = await telephonyService.makeCall(options);
    expect(result.callSid).toMatch(/^MOCK/);
    
    // Wait for call to progress
    await wait(5000);
    
    const status = await telephonyService.getCallStatus(result.callSid);
    expect(status.status).toBe(CallStatus.IN_PROGRESS);
  });
});
```

## Best Practices

### 1. Always Use the Interface
```typescript
// ✅ Good
constructor(@Inject('TELEPHONY_PROVIDER') private provider: ITelephonyProvider) {}

// ❌ Bad
constructor(private provider: TwilioTelephonyProvider) {}
```

### 2. Never Check Provider Type in Business Logic
```typescript
// ❌ Bad
if (provider.name === 'TWILIO') {
  // Do something specific
}

// ✅ Good
// Let the provider handle it
await provider.makeCall(options);
```

### 3. Use Events for Cross-Module Communication
```typescript
// ✅ Good
@OnEvent('telephony.call_answered')
handleCallAnswered(payload) {
  // Works with any provider
}
```

### 4. Provider-Specific Code Only in Provider Class
```typescript
// ✅ Good - in twilio-telephony.provider.ts
private buildTwiMLUrl() {
  return `${this.baseUrl}/webhooks/twilio/voice`;
}

// ❌ Bad - in telephony.service.ts
if (this.provider.name === 'TWILIO') {
  // Build Twilio-specific URL
}
```

## Troubleshooting

### Issue: Calls not working

**Check Provider Selection**
```bash
echo $TELEPHONY_PROVIDER
# Should be 'mock' or 'twilio'
```

**Check Logs**
```
🔧 Configuring telephony provider: MOCK
✅ Twilio Telephony Provider initialized
```

### Issue: Twilio credentials not working

**Verify Environment Variables**
```bash
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER
```

**Test Health Check**
```bash
curl http://localhost:3001/api/v1/telephony/health
```

### Issue: Webhooks not receiving events

**Check Public URL**
```bash
echo $API_BASE_URL
# Must be publicly accessible for Twilio webhooks
```

**Use ngrok for Local Development**
```bash
ngrok http 3001
# Set API_BASE_URL to ngrok URL
```

## Migration Guide

### From Old Telephony Engine to Provider Abstraction

**Before:**
```typescript
import { TelephonyEngineService } from './telephony-engine/...';

constructor(private telephony: TelephonyEngineService) {}

await this.telephony.makeCall(...);
```

**After:**
```typescript
import { TelephonyService } from './telephony/telephony.service';

constructor(private telephony: TelephonyService) {}

await this.telephony.makeCall(...); // Same API!
```

**Changes Required:**
1. Update imports
2. Set `TELEPHONY_PROVIDER` environment variable
3. That's it! API is compatible.

## Summary

The telephony provider abstraction provides:

✅ **Flexibility** - Switch providers without code changes
✅ **Cost Savings** - Use mock for development/testing
✅ **Clean Architecture** - Provider-agnostic business logic
✅ **Extensibility** - Easy to add new providers
✅ **Testability** - Mock provider perfect for tests
✅ **Production Ready** - Twilio provider fully featured

**Key Takeaway**: The entire AI Calling Platform behaves identically whether using Mock or Twilio. The only difference is virtual vs. real phone calls. All other components (AI Brain, Runtime Monitor, Transcript, Analytics, Conversation Engine) work the same way.

---

**Status**: ✅ Complete and Production Ready
**Version**: 1.0.0
**Last Updated**: July 24, 2026
