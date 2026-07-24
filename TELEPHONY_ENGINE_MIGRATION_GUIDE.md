# Telephony Engine Migration Guide

## Overview

This guide explains how to migrate from the old `telephony` module to the new **Enterprise Telephony Engine** with provider abstraction.

---

## What's New?

### Old Architecture (telephony module)
- Direct Twilio integration only
- Tightly coupled to Twilio SDK
- No provider abstraction
- Limited scalability
- Basic call management

### New Architecture (telephony-engine module)
- **Provider Abstraction Layer** - Switch between providers without code changes
- **Complete Twilio Implementation** - Production-ready
- **Architecture-Ready Providers** - Exotel, Plivo, SIP, Asterisk (stubs for future implementation)
- **Enterprise Features**:
  - Call session management
  - Recording management
  - Webhook abstraction
  - Retry logic
  - Cost estimation
  - Health monitoring
  - Statistics & analytics
- **Pipeline Integration** - Seamless integration with AI Calling Pipeline

---

## Migration Steps

### Step 1: Update Environment Variables

#### Add New Variables to `.env`

```bash
# =========================================================
# Telephony Engine Configuration (New)
# =========================================================

# Active Telephony Provider
TELEPHONY_ENGINE_PROVIDER=twilio

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_SECRET=your-twilio-webhook-secret

# Call Settings
TELEPHONY_ENGINE_RECORDING_ENABLED=true
TELEPHONY_ENGINE_MACHINE_DETECTION=true
TELEPHONY_ENGINE_CALL_TIMEOUT=60
TELEPHONY_ENGINE_MAX_CONCURRENT_CALLS=10

# Webhook Settings
TELEPHONY_ENGINE_WEBHOOK_BASE_URL=https://your-domain.com
TELEPHONY_ENGINE_WEBHOOK_VERIFY_SIGNATURE=true
```

### Step 2: Update Module Imports

#### Before (Old)
```typescript
import { TelephonyModule } from './modules/telephony/telephony.module';
import { TelephonyService } from './modules/telephony/telephony.service';
```

#### After (New)
```typescript
import { TelephonyEngineModule } from './modules/telephony-engine/telephony-engine.module';
import { TelephonyManagerService } from './modules/telephony-engine/services/telephony-manager.service';
import { PipelineIntegrationService } from './modules/telephony-engine/services/pipeline-integration.service';
```

### Step 3: Update API Calls

#### Making a Call

**Before (Old)**
```typescript
await this.telephony.makeCall({
  to: '+1234567890',
  from: '+0987654321',
  callbackUrl: 'https://api.example.com/webhook',
  record: true,
  metadata: { campaignId: 'camp_123' }
});
```

**After (New)**
```typescript
await this.telephonyManager.makeCall({
  to: '+1234567890',
  from: '+0987654321',
  callbackUrl: 'https://api.example.com/webhook',
  statusCallbackUrl: 'https://api.example.com/webhook/status',
  recordingCallbackUrl: 'https://api.example.com/webhook/recording',
  timeout: 60,
  record: true,
  machineDetection: true,
  metadata: { campaignId: 'camp_123' }
});
```

#### Ending a Call

**Before (Old)**
```typescript
await this.telephony.endCall(callSid);
```

**After (New)**
```typescript
await this.telephonyManager.hangupCall(callSid);
```

#### Getting Call Status

**Before (Old)**
```typescript
const status = await this.telephony.getCallStatus(callSid);
```

**After (New)**
```typescript
const status = await this.telephonyManager.getCallStatus(callSid);
// Returns: { callSid, status, duration, to, from, price, ... }
```

#### Downloading Recording

**Before (Old)**
```typescript
const buffer = await this.telephony.downloadRecording(recordingUrl);
```

**After (New)**
```typescript
const recording = await this.telephonyManager.getRecording(recordingSid);
const buffer = await this.telephonyManager.getRecordingBuffer(recordingSid);
```

### Step 4: Update Call Orchestrator

#### Before (Old)
```typescript
@Injectable()
export class CallOrchestratorService {
  constructor(
    private readonly telephony: TelephonyService,
  ) {}

  async initiateCall(params: any) {
    const result = await this.telephony.makeCall({
      to: params.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      callbackUrl: params.callbackUrl,
      record: true,
    });
    
    return result;
  }
}
```

#### After (New)
```typescript
@Injectable()
export class CallOrchestratorService {
  constructor(
    private readonly pipelineIntegration: PipelineIntegrationService,
  ) {}

  async initiateCall(params: any) {
    const result = await this.pipelineIntegration.initiateCallFromPipeline({
      contactId: params.contactId,
      campaignId: params.campaignId,
      phoneNumber: params.phoneNumber,
      fromNumber: process.env.TWILIO_PHONE_NUMBER,
      callbackUrl: params.callbackUrl,
      statusCallbackUrl: params.statusCallbackUrl,
      recordingCallbackUrl: params.recordingCallbackUrl,
      metadata: params.metadata,
    });
    
    return result;
  }
}
```

### Step 5: Update Webhook Handling

#### Before (Old)
```typescript
@Post('/webhooks/twilio/call')
async handleTwilioWebhook(@Body() payload: any) {
  // Manual webhook parsing
  const callSid = payload.CallSid;
  const status = payload.CallStatus;
  // ... process manually
}
```

#### After (New)
```typescript
@Post('/webhooks/telephony/twilio/voice')
async handleTwilioWebhook(
  @Headers('x-twilio-signature') signature: string,
  @Body() payload: any,
) {
  const url = `${process.env.API_BASE_URL}/webhooks/telephony/twilio/voice`;
  
  const result = await this.telephonyManager.processWebhook(
    'twilio',
    signature,
    url,
    payload,
  );
  
  // Webhook automatically parsed and validated
  return result;
}
```

### Step 6: Event Handling

The new Telephony Engine emits normalized events that your application can listen to:

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class CallEventHandler {
  @OnEvent('telephony.call.initiated')
  handleCallInitiated(payload: any) {
    console.log(`Call initiated: ${payload.callSid}`);
  }

  @OnEvent('telephony.call.answered')
  handleCallAnswered(payload: any) {
    console.log(`Call answered: ${payload.callSid}`);
  }

  @OnEvent('telephony.call.completed')
  handleCallCompleted(payload: any) {
    console.log(`Call completed: ${payload.callSid}, duration: ${payload.duration}`);
  }

  @OnEvent('telephony.call.failed')
  handleCallFailed(payload: any) {
    console.log(`Call failed: ${payload.callSid}, error: ${payload.error}`);
  }

  @OnEvent('telephony.recording.ready')
  handleRecordingReady(payload: any) {
    console.log(`Recording ready: ${payload.recordingSid}`);
  }
}
```

### Step 7: Pipeline Integration Events

For AI Calling Pipeline, use these events:

```typescript
@Injectable()
export class PipelineEventHandler {
  @OnEvent('pipeline.call.initiated')
  handlePipelineCallInitiated(payload: any) {
    console.log(`Pipeline call initiated for contact: ${payload.contactId}`);
  }

  @OnEvent('pipeline.call.answered')
  handlePipelineCallAnswered(payload: any) {
    console.log(`Pipeline call answered for contact: ${payload.contactId}`);
  }

  @OnEvent('pipeline.call.completed')
  handlePipelineCallCompleted(payload: any) {
    console.log(`Pipeline call completed for contact: ${payload.contactId}`);
    // Trigger analytics, save transcript, etc.
  }

  @OnEvent('pipeline.recording.ready')
  handlePipelineRecordingReady(payload: any) {
    console.log(`Recording ready for contact: ${payload.contactId}`);
    // Download and process recording
  }
}
```

---

## New Features

### 1. Provider Switching

Switch telephony providers at runtime:

```typescript
// Switch to Twilio
await this.telephonyManager.switchProvider('twilio');

// Switch to Exotel (when implemented)
await this.telephonyManager.switchProvider('exotel');

// Get current provider
const provider = this.telephonyManager.getActiveProvider();
console.log(`Active provider: ${provider.name}`);
```

### 2. Call Session Management

Track all active calls:

```typescript
// Get all active calls
const activeCalls = await this.telephonyManager.getActiveCalls();

// Get specific session
const session = await this.telephonyManager.getCallSession(callSid);

// Get active call count
const count = await this.telephonyManager.getActiveCallCount();
```

### 3. Recording Management

```typescript
// Get recording metadata
const recording = await this.telephonyManager.getRecording(recordingSid);

// Download recording
const buffer = await this.telephonyManager.getRecordingBuffer(recordingSid);

// Get all recordings for a call
const recordings = await this.telephonyManager.getRecordingsForCall(callSid);

// Delete recording
await this.telephonyManager.deleteRecording(recordingSid);
```

### 4. Statistics & Monitoring

```typescript
// Get comprehensive statistics
const stats = await this.telephonyManager.getStatistics();

// Returns:
{
  sessions: {
    total: 100,
    active: 5,
    completed: 90,
    failed: 5,
    averageDuration: 120
  },
  recordings: {
    total: 85,
    totalSize: 1024000000,
    averageSize: 12047059
  },
  outbound: {
    total: 80,
    successful: 70,
    failed: 10,
    cancelled: 5,
    retried: 3
  },
  inbound: {
    total: 20,
    answered: 18,
    forwarded: 2,
    voicemail: 0
  },
  provider: {
    name: 'Twilio',
    type: 'twilio',
    ready: true,
    capabilities: { ... }
  }
}
```

### 5. Health Checks

```typescript
const health = await this.telephonyManager.healthCheck();

// Returns:
{
  healthy: true,
  provider: { name: 'Twilio', type: 'twilio', ready: true },
  activeCalls: 5,
  timestamp: '2025-01-15T10:30:00Z'
}
```

### 6. Cost Estimation

```typescript
const cost = await this.telephonyManager.estimateCallCost(
  '+1234567890', // from
  '+0987654321', // to
  300 // duration in seconds
);

// Returns estimated cost in USD
```

### 7. Retry Logic

```typescript
// Retry a failed call
const result = await this.telephonyManager.retryCall(
  originalCallSid,
  {
    to: '+1234567890',
    from: '+0987654321',
    callbackUrl: 'https://api.example.com/webhook',
    // ... other params
  }
);
```

### 8. Call Control

```typescript
// Transfer call
await this.telephonyManager.transferCall(callSid, '+1111111111');

// Send DTMF tones
await this.telephonyManager.sendDTMF(callSid, '1234#');

// Generate TwiML response
const response = this.telephonyManager.generateCallControl({
  say: {
    text: 'Hello, welcome to our service.',
    voice: 'alice',
    language: 'en-US',
  },
  gather: {
    input: 'dtmf',
    numDigits: 1,
    action: 'https://api.example.com/gather',
  },
});
```

---

## REST API Endpoints

### Old Endpoints (Deprecated)
```
POST   /api/v1/telephony/call
POST   /api/v1/telephony/end
GET    /api/v1/telephony/status/:callSid
```

### New Endpoints
```
# Calls
POST   /api/v1/telephony/call              # Make call
POST   /api/v1/telephony/hangup            # Hang up call
POST   /api/v1/telephony/retry             # Retry call
POST   /api/v1/telephony/cancel            # Cancel call
POST   /api/v1/telephony/transfer          # Transfer call
POST   /api/v1/telephony/dtmf              # Send DTMF

# Status & Sessions
GET    /api/v1/telephony/status/:callSid   # Get call status
GET    /api/v1/telephony/session/:callSid  # Get call session
GET    /api/v1/telephony/active-calls      # Get active calls

# Recordings
GET    /api/v1/telephony/recording/:recordingSid               # Get recording metadata
GET    /api/v1/telephony/recording/:recordingSid/download      # Download recording
GET    /api/v1/telephony/call/:callSid/recordings             # Get call recordings

# Providers
GET    /api/v1/telephony/providers                            # Get all providers
POST   /api/v1/telephony/provider/switch                      # Switch provider
GET    /api/v1/telephony/provider/capabilities                # Get capabilities

# Statistics & Health
GET    /api/v1/telephony/statistics        # Get statistics
GET    /api/v1/telephony/health            # Health check
POST   /api/v1/telephony/estimate-cost     # Estimate cost

# Webhooks
POST   /api/v1/webhooks/telephony/twilio/:type    # Twilio webhooks
POST   /api/v1/webhooks/telephony/exotel/:type    # Exotel webhooks (ready)
POST   /api/v1/webhooks/telephony/plivo/:type     # Plivo webhooks (ready)
```

---

## Testing Migration

### 1. Unit Tests

```typescript
describe('TelephonyEngineService', () => {
  let service: TelephonyManagerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TelephonyEngineModule],
    }).compile();

    service = module.get<TelephonyManagerService>(TelephonyManagerService);
  });

  it('should make a call', async () => {
    const result = await service.makeCall({
      to: '+1234567890',
      from: '+0987654321',
      callbackUrl: 'https://api.example.com/webhook',
      record: true,
    });

    expect(result).toHaveProperty('callSid');
    expect(result.status).toBeDefined();
  });
});
```

### 2. Integration Tests

Use the provided test scripts:

```bash
# Windows
.\test-telephony-engine.ps1

# Linux/Mac
./test-telephony-engine.sh

# Or use curl directly
curl -X POST http://localhost:3001/api/v1/telephony/call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "from": "+0987654321",
    "callbackUrl": "https://api.example.com/webhook",
    "record": true
  }'
```

---

## Rollback Plan

If you need to rollback to the old telephony module:

1. **Revert Environment Variables** - Remove new variables, restore old ones
2. **Revert Module Imports** - Change back to `TelephonyModule` and `TelephonyService`
3. **Revert API Calls** - Use old method signatures
4. **Update app.module.ts** - Remove `TelephonyEngineModule`, restore `TelephonyModule`
5. **Restart Application**

---

## Future Provider Implementation

When implementing new providers (Exotel, Plivo, etc.):

1. **Implement `ITelephonyProvider` Interface**
   ```typescript
   export class ExotelProvider implements ITelephonyProvider {
     // Implement all methods
   }
   ```

2. **Register Provider**
   ```typescript
   // In telephony-engine.module.ts
   providers: [
     TwilioProvider,
     ExotelProvider, // Add here
     PlivoProvider,
   ]
   ```

3. **Configure Environment**
   ```bash
   TELEPHONY_ENGINE_PROVIDER=exotel
   EXOTEL_API_KEY=...
   EXOTEL_API_TOKEN=...
   ```

4. **Switch Provider**
   ```typescript
   await this.telephonyManager.switchProvider('exotel');
   ```

---

## Troubleshooting

### Issue: "No active telephony provider"
**Solution**: Ensure `TELEPHONY_ENGINE_PROVIDER` is set in `.env` and the provider is properly initialized.

### Issue: "Webhook signature validation failed"
**Solution**: Check that `TWILIO_WEBHOOK_SECRET` matches your Twilio configuration and `TELEPHONY_ENGINE_WEBHOOK_VERIFY_SIGNATURE` is set correctly.

### Issue: "Call sessions not tracked"
**Solution**: Ensure `TelephonyEngineModule` is imported in `app.module.ts` and EventEmitterModule is configured.

### Issue: "Old endpoints still being used"
**Solution**: Update all references to use new endpoints and services. Search codebase for `TelephonyService` and replace with `TelephonyManagerService`.

---

## Support

For issues or questions:

1. Check the [API Documentation](API_DOCUMENTATION.md)
2. Review [MVP Complete Guide](MVP_COMPLETE.md)
3. Check server logs for detailed error messages
4. Review Telephony Engine source code in `apps/api/src/modules/telephony-engine/`

---

## Checklist

- [ ] Updated `.env` with new Telephony Engine variables
- [ ] Imported `TelephonyEngineModule` in `app.module.ts`
- [ ] Updated service injections from `TelephonyService` to `TelephonyManagerService`
- [ ] Updated API calls to use new method signatures
- [ ] Updated webhook handlers to use new webhook system
- [ ] Implemented event listeners for telephony events
- [ ] Updated Call Orchestrator to use `PipelineIntegrationService`
- [ ] Tested making calls with new engine
- [ ] Tested recording download
- [ ] Tested webhook processing
- [ ] Verified call sessions are tracked
- [ ] Tested health check endpoint
- [ ] Tested statistics endpoint
- [ ] Updated documentation
- [ ] Informed team of changes

---

**Migration Complete!** 🎉

Your application now uses the Enterprise Telephony Engine with provider abstraction, better scalability, and enhanced features.
