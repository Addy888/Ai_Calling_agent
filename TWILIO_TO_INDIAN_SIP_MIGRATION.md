# Twilio to Indian SIP Migration Plan

## Executive Summary
Complete migration from Twilio to Indian SIP-based telephony architecture for enterprise AI calling platform optimized for India.

**Goal:** Lower operational costs, increase scalability, remove US-based dependency.

## Migration Strategy

### Phase 1: Create New Architecture (Week 1)
1. ✅ Create Indian SIP Provider Interface
2. ✅ Implement Indian SIP Provider
3. ✅ Create SIP Client Integration
4. ✅ Setup BullMQ Queue System
5. ✅ Implement Voice AI Pipeline (Whisper + LLM + Kokoro)

### Phase 2: Update Core Services (Week 2)
1. ✅ Update Telephony Manager
2. ✅ Update Campaign Execution Service
3. ✅ Update Call Orchestrator
4. ✅ Update Runtime Monitor
5. ✅ Update Recording Manager

### Phase 3: Remove Twilio (Week 3)
1. ❌ Delete Twilio Provider
2. ❌ Delete Twilio Webhooks
3. ❌ Remove Twilio SDK
4. ❌ Remove Twilio Environment Variables
5. ❌ Update Documentation

### Phase 4: Testing & Deployment (Week 4)
1. Integration Testing
2. Load Testing
3. Production Deployment
4. Monitoring Setup

## Technical Architecture

```
┌─────────────┐
│  Frontend   │
│   (React)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  NestJS API │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Call Queue  │
│  (BullMQ)   │
└──────┬──────┘
       │
       ▼
┌───────────────────────┐
│Telephony Provider IF  │
└──────┬────────────────┘
       │
       ▼
┌─────────────────────┐
│ Indian SIP Provider │
│  (SIP.js/PJSIP)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Indian SIP Provider │
│  (Exotel/Plivo)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Customer Phone     │
└─────────────────────┘
       │
       ▼ (Webhooks)
┌─────────────────────┐
│ Runtime Monitor     │
└─────────────────────┘
```

## Voice AI Flow

```
Customer Voice
    ↓
Speech-to-Text (Faster Whisper)
    ↓
LLM (OpenAI/Ollama)
    ↓
Text-to-Speech (Kokoro XTTS)
    ↓
Indian SIP Provider
    ↓
Customer
```

## Indian SIP Providers

### Option 1: Exotel (Recommended)
- **Pros:** Indian company, excellent India coverage, good API
- **Pricing:** ₹0.50-1.00 per minute (vs Twilio ₹2-3)
- **Features:** Voice, SMS, IVR, Call Recording
- **Support:** 24/7 India support

### Option 2: Plivo
- **Pros:** Global reach, good API, competitive pricing
- **Pricing:** ₹0.60-1.20 per minute
- **Features:** Voice, SMS, SIP trunking
- **Support:** Good documentation

### Option 3: Knowlarity
- **Pros:** India-focused, enterprise features
- **Pricing:** ₹0.70-1.30 per minute
- **Features:** Cloud telephony, IVR, Analytics

### Option 4: Direct SIP (DIY)
- **Pros:** Maximum control, lowest cost (₹0.20-0.50)
- **Cons:** Complex setup, requires SIP expertise
- **Use:** For very high volume (>100K calls/month)

## Recommended: Exotel

### Why Exotel?
1. **Cost:** 50-60% cheaper than Twilio
2. **Indian Numbers:** Native Indian DID support
3. **Compliance:** TRAI compliant
4. **Quality:** Excellent voice quality on Indian networks
5. **Support:** Local support team
6. **Scale:** Handles millions of calls

## New Configuration

### Remove (Twilio)
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Add (Exotel)
```env
# Exotel Configuration
EXOTEL_API_KEY=xxxxx
EXOTEL_API_TOKEN=xxxxx
EXOTEL_SID=xxxxx
EXOTEL_SUBDOMAIN=xxxxx
EXOTEL_CALLER_ID=0xxxxxxxxxx
EXOTEL_BASE_URL=https://api.exotel.com/v1

# SIP Configuration (if using direct SIP)
SIP_SERVER=sip.exotel.com
SIP_PORT=5060
SIP_USERNAME=xxxxx
SIP_PASSWORD=xxxxx
SIP_TLS=true

# Webhook Configuration
WEBHOOK_BASE_URL=https://your-domain.com/api/v1
WEBHOOK_SECRET=xxxxx

# Voice AI Configuration
WHISPER_MODEL_PATH=./models/whisper
WHISPER_MODEL_SIZE=base
KOKORO_MODEL_PATH=./models/kokoro-xtts
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
```

## Database Changes

### New Tables
```sql
-- SIP Sessions
CREATE TABLE sip_sessions (
  id UUID PRIMARY KEY,
  call_id UUID REFERENCES calls(id),
  sip_call_id VARCHAR(255),
  sip_from VARCHAR(255),
  sip_to VARCHAR(255),
  sip_status VARCHAR(50),
  sip_direction VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Voice AI Sessions
CREATE TABLE voice_ai_sessions (
  id UUID PRIMARY KEY,
  call_id UUID REFERENCES calls(id),
  stt_provider VARCHAR(50),
  llm_provider VARCHAR(50),
  tts_provider VARCHAR(50),
  total_tokens INTEGER,
  stt_latency_ms INTEGER,
  llm_latency_ms INTEGER,
  tts_latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Update Existing Tables
```sql
-- Add provider field to calls table
ALTER TABLE calls ADD COLUMN provider VARCHAR(50) DEFAULT 'exotel';

-- Add SIP-specific fields
ALTER TABLE calls ADD COLUMN sip_call_id VARCHAR(255);
ALTER TABLE calls ADD COLUMN sip_status VARCHAR(50);

-- Update indexes
CREATE INDEX idx_calls_sip_call_id ON calls(sip_call_id);
CREATE INDEX idx_calls_provider ON calls(provider);
```

## API Changes

### Webhooks
**Old:** POST `/webhooks/twilio/:type`
**New:** POST `/webhooks/exotel/:type`

### Call Initiation
**Old:** Uses Twilio SDK
**New:** Uses Exotel REST API

### Call Control
**Old:** TwiML
**New:** Exotel Applet / PassThru

## Code Files to Create

### 1. Indian SIP Provider
- `apps/api/src/modules/telephony-engine/providers/exotel.provider.ts`
- `apps/api/src/modules/telephony-engine/providers/indian-sip.provider.ts`

### 2. SIP Client Integration
- `apps/api/src/modules/telephony-engine/services/sip-client.service.ts`
- `apps/api/src/modules/telephony-engine/services/sip-session-manager.service.ts`

### 3. Voice AI Services
- `apps/api/src/modules/voice-ai/services/whisper-stt.service.ts`
- `apps/api/src/modules/voice-ai/services/kokoro-tts.service.ts`
- `apps/api/src/modules/voice-ai/services/llm-provider.service.ts`

### 4. Queue System
- `apps/api/src/modules/calling-pipeline/services/bullmq-queue.service.ts`
- `apps/api/src/modules/calling-pipeline/services/call-worker.service.ts`

## Code Files to Delete

### Twilio Provider
- ❌ `apps/api/src/modules/telephony/providers/twilio-telephony.provider.ts`
- ❌ `apps/api/src/modules/telephony-engine/providers/twilio.provider.ts`

### Twilio Services
- ❌ All Twilio-specific service methods
- ❌ Twilio webhook handlers
- ❌ TwiML generation code

### Twilio Tests
- ❌ `apps/api/src/modules/telephony-engine/__tests__/twilio-provider.spec.ts`

## Code Files to Modify

### 1. Provider Registry
**File:** `apps/api/src/modules/telephony-engine/services/provider-registry.service.ts`
- Remove Twilio registration
- Add Exotel registration
- Add Indian SIP registration

### 2. Telephony Manager
**File:** `apps/api/src/modules/telephony-engine/services/telephony-manager.service.ts`
- Update makeCall() to use new provider
- Update webhook processing
- Remove Twilio-specific logic

### 3. Campaign Execution
**File:** `apps/api/src/modules/calling-pipeline/services/campaign-execution.service.ts`
- Update contact loading
- Update call queuing
- Update status tracking

### 4. Call Orchestrator
**File:** `apps/api/src/modules/call-orchestrator/call-orchestrator.service.ts`
- Update call initiation
- Update event handling
- Update recording management

### 5. Webhooks Controller
**File:** `apps/api/src/modules/webhooks/webhooks.controller.ts`
- Remove Twilio webhook endpoints
- Add Exotel webhook endpoints
- Update webhook validation

### 6. Environment Config
**File:** `apps/api/src/config/configuration.ts`
- Remove Twilio config
- Add Exotel config
- Add SIP config
- Add Voice AI config

### 7. Module Registration
**File:** `apps/api/src/modules/telephony/telephony.module.ts`
- Remove TwilioTelephonyProvider
- Add ExotelProvider
- Add IndianSipProvider

### 8. Package.json
- Remove `twilio` package
- Add `exotel-node-sdk` package (or build custom)
- Add `sip.js` for SIP support
- Add voice AI dependencies

## Voice AI Stack

### Speech-to-Text: Faster Whisper
```bash
# Install
pip install faster-whisper

# Usage
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cuda")
segments, info = model.transcribe("audio.wav")
```

### LLM: OpenAI / Ollama
```typescript
// OpenAI
import OpenAI from 'openai';
const client = new OpenAI();
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: transcript }]
});

// Ollama (Local)
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'llama2',
    prompt: transcript
  })
});
```

### Text-to-Speech: Kokoro XTTS
```python
# Install
pip install kokoro-xtts

# Usage
from kokoro import KokoroTTS
tts = KokoroTTS()
audio = tts.synthesize(text="Hello", voice="indian_female")
```

## Queue System: BullMQ

```typescript
import { Queue, Worker } from 'bullmq';

// Create Queue
const callQueue = new Queue('calls', {
  connection: { host: 'localhost', port: 6379 }
});

// Add Job
await callQueue.add('make-call', {
  contactId: 'xxx',
  campaignId: 'yyy',
  phoneNumber: '+91xxxxxxxxxx'
});

// Create Worker
const worker = new Worker('calls', async (job) => {
  const { phoneNumber } = job.data;
  await indianSipProvider.makeCall({ to: phoneNumber });
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 5 // 5 concurrent calls
});
```

## Recording Management

### Old (Twilio)
- Recordings stored on Twilio servers
- Access via Twilio API
- Paid storage

### New (Local/S3)
- Recordings stored locally or S3
- Access via file system / presigned URLs
- Lower cost
- Full control

```typescript
// Recording Manager
class RecordingManager {
  async saveRecording(callId: string, audioBuffer: Buffer) {
    const filename = `${callId}_${Date.now()}.wav`;
    const localPath = path.join(RECORDINGS_DIR, filename);
    
    // Save locally
    await fs.writeFile(localPath, audioBuffer);
    
    // Upload to S3 (optional)
    if (process.env.USE_S3 === 'true') {
      await s3.upload({
        Bucket: 'call-recordings',
        Key: filename,
        Body: audioBuffer
      });
    }
    
    // Save metadata to database
    await prisma.callRecording.create({
      data: {
        callId,
        filename,
        localPath,
        s3Key: filename,
        duration: getDuration(audioBuffer),
        size: audioBuffer.length
      }
    });
  }
}
```

## Runtime Monitor Updates

### Old Display
- Call SID (Twilio format)
- Twilio status codes
- Twilio events

### New Display
- SIP Call ID
- Exotel status codes
- SIP events
- Voice AI metrics (STT/LLM/TTS latency)
- Queue position
- Worker assignment

## Cost Comparison

### Twilio (Current)
- Outbound calls: ₹2.00-3.00/min
- Indian numbers: Not available
- Recording: ₹0.01/min storage
- **Monthly (10K mins):** ₹20,000-30,000

### Exotel (Proposed)
- Outbound calls: ₹0.50-1.00/min
- Indian numbers: Included
- Recording: Free (self-hosted)
- **Monthly (10K mins):** ₹5,000-10,000

### **Savings: 60-70%** 🎉

## Risk Mitigation

### Dual Provider Strategy (Phase 1-2)
Keep both providers active during migration:
```typescript
const provider = process.env.TELEPHONY_PROVIDER === 'exotel' 
  ? exotelProvider 
  : twilioProvider;
```

### Rollback Plan
1. Keep Twilio credentials in vault
2. Feature flag for provider switching
3. Monitor error rates
4. Automatic fallback if errors > 5%

### Testing Strategy
1. Unit tests for all new services
2. Integration tests with Exotel sandbox
3. Load testing (simulate 100 concurrent calls)
4. Canary deployment (1% → 10% → 50% → 100%)

## Timeline

### Week 1: Foundation
- Day 1-2: Create Exotel provider
- Day 3-4: Implement Voice AI pipeline
- Day 5-7: Setup BullMQ queue system

### Week 2: Integration
- Day 8-10: Update core services
- Day 11-12: Update webhooks
- Day 13-14: Testing & bug fixes

### Week 3: Cleanup
- Day 15-16: Remove Twilio code
- Day 17-18: Update documentation
- Day 19-21: Final testing

### Week 4: Deployment
- Day 22-23: Staging deployment
- Day 24-25: Production canary
- Day 26-28: Full production rollout

## Success Metrics

### Technical
- ✅ 0 Twilio dependencies
- ✅ <100ms Voice AI latency
- ✅ >99% call success rate
- ✅ <2% error rate
- ✅ 5+ concurrent calls per worker

### Business
- ✅ 60%+ cost reduction
- ✅ Indian DID numbers
- ✅ <500ms end-to-end latency
- ✅ Scalable to 100K calls/month

### Operational
- ✅ Automated deployment
- ✅ Real-time monitoring
- ✅ Automated alerts
- ✅ Disaster recovery plan

## Post-Migration Tasks

1. Monitor call quality for 2 weeks
2. Gather user feedback
3. Optimize Voice AI parameters
4. Scale infrastructure
5. Add advanced features (IVR, sentiment analysis)

## Support Contacts

### Exotel
- Email: support@exotel.com
- Phone: 080-48018000
- Dashboard: https://my.exotel.com

### Voice AI
- Whisper: OpenAI Discord
- Kokoro: GitHub Issues
- LLM: OpenAI/Ollama communities

---

**Status:** Ready for Implementation
**Owner:** Platform Team
**Priority:** P0 (Critical)
**Start Date:** TBD
**Target Completion:** 4 weeks from start
