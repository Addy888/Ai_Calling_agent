# Provider-Independent Enterprise AI Calling Platform Architecture

## 🎯 Executive Summary

Transform the current Twilio-dependent system into a **provider-independent Enterprise AI Calling Platform** optimized for India with:
- ✅ Local AI models (Ollama, Faster Whisper, Kokoro XTTS)
- ✅ Provider abstraction layer
- ✅ 80-90% cost reduction on AI/telephony
- ✅ Zero vendor lock-in
- ✅ Production-ready SaaS architecture

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  Dashboard | Campaigns | Contacts | Runtime Monitor | AI    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS API Layer                           │
│  Auth | Business Logic | Campaign Management | Analytics    │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Campaign   │ │     Call     │ │   Runtime    │
│  Management  │ │ Orchestrator │ │   Monitor    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
        ┌───────────────────────────────┐
        │   Telephony Abstraction Layer │
        │    ITelephonyProvider (IF)    │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ Exotel   │   │  Airtel  │   │   SIP    │
  │ Provider │   │ Provider │   │ Provider │
  └────┬─────┘   └────┬─────┘   └────┬─────┘
       │              │              │
       └──────────────┼──────────────┘
                      ▼
            ┌──────────────────┐
            │  Customer Phone  │
            └──────────────────┘
                      │
                      ▼ (Audio Stream)
            ┌──────────────────┐
            │   AI Pipeline    │
            └──────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Faster  │ │  Ollama  │ │  Kokoro  │
  │ Whisper  │ │   LLM    │ │   XTTS   │
  │  (STT)   │ │          │ │  (TTS)   │
  └──────────┘ └──────────┘ └──────────┘
```

---

## 📋 Core Principles

### 1. Provider Independence
```typescript
// ❌ BAD - Tight coupling
import { TwilioClient } from 'twilio';
const client = new TwilioClient();
await client.makeCall();

// ✅ GOOD - Provider abstraction
interface ITelephonyProvider {
  makeCall(params: CallParams): Promise<CallResult>;
}

class TelephonyService {
  constructor(private provider: ITelephonyProvider) {}
  
  async makeCall(params: CallParams) {
    return this.provider.makeCall(params);
  }
}
```

### 2. Dependency Injection
```typescript
// Business logic NEVER imports provider directly
@Injectable()
export class CampaignService {
  constructor(
    private readonly telephonyService: TelephonyService, // ✅ Abstraction
    // NOT: private readonly twilioClient: TwilioClient  // ❌ Coupling
  ) {}
}
```

### 3. Configuration-Driven
```typescript
// Provider selection via configuration
const providerType = process.env.TELEPHONY_PROVIDER; // 'exotel' | 'airtel' | 'sip'

const providerFactory = {
  exotel: () => new ExotelProvider(config),
  airtel: () => new AirtelProvider(config),
  sip: () => new SipProvider(config),
};

const provider = providerFactory[providerType]();
```

---

## 🔧 New Telephony Abstraction Layer

### ITelephonyProvider Interface

```typescript
/**
 * Provider-independent telephony interface
 * ANY telephony provider must implement this interface
 */
export interface ITelephonyProvider {
  // Identity
  getName(): string;
  getType(): ProviderType;
  
  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  disconnect(): Promise<void>;
  
  // Call Management
  makeCall(params: CallParams): Promise<CallResult>;
  hangupCall(callId: string): Promise<boolean>;
  getCallStatus(callId: string): Promise<CallStatus>;
  
  // Audio Control
  playAudio(callId: string, audioUrl: string): Promise<boolean>;
  streamAudio(callId: string, stream: AudioStream): Promise<boolean>;
  stopAudio(callId: string): Promise<boolean>;
  
  // Recording
  startRecording(callId: string, options?: RecordingOptions): Promise<string>;
  stopRecording(callId: string, recordingId: string): Promise<boolean>;
  getRecording(recordingId: string): Promise<RecordingInfo>;
  downloadRecording(recordingId: string): Promise<Buffer>;
  
  // DTMF
  sendDTMF(callId: string, digits: string): Promise<boolean>;
  
  // Call Control
  transferCall(callId: string, to: string): Promise<boolean>;
  muteCall(callId: string): Promise<boolean>;
  unmuteCall(callId: string): Promise<boolean>;
  
  // Webhooks
  parseWebhook(payload: any): WebhookEvent;
  validateWebhook(signature: string, payload: any, url: string): boolean;
  
  // Capabilities
  getCapabilities(): ProviderCapabilities;
  
  // Cost Management
  estimateCost(params: CallParams): Promise<CostEstimate>;
}
```

### Core Types

```typescript
export enum ProviderType {
  EXOTEL = 'exotel',
  AIRTEL = 'airtel',
  KNOWLARITY = 'knowlarity',
  MYOPERATOR = 'myoperator',
  OZONETEL = 'ozonetel',
  SIP_GENERIC = 'sip',
  MOCK = 'mock', // For testing
}

export interface CallParams {
  to: string;
  from: string;
  callbackUrl: string;
  statusCallbackUrl?: string;
  timeout?: number;
  maxDuration?: number;
  record?: boolean;
  metadata?: Record<string, any>;
}

export interface CallResult {
  callId: string;
  providerCallId: string;
  status: CallStatus;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  timestamp: Date;
  estimatedCost?: number;
}

export enum CallStatus {
  QUEUED = 'queued',
  DIALING = 'dialing',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface HealthStatus {
  healthy: boolean;
  provider: string;
  latency?: number;
  error?: string;
  timestamp: Date;
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsRecording: boolean;
  supportsDTMF: boolean;
  supportsTransfer: boolean;
  supportsConference: boolean;
  maxConcurrentCalls: number;
  supportedCodecs: string[];
  supportedLanguages: string[];
}
```

---

## 🏢 Folder Structure

```
apps/api/src/
├── modules/
│   ├── telephony/                          ⭐ NEW - Core Telephony Module
│   │   ├── telephony.module.ts
│   │   ├── interfaces/
│   │   │   ├── telephony-provider.interface.ts
│   │   │   ├── call-params.interface.ts
│   │   │   └── webhook-event.interface.ts
│   │   ├── services/
│   │   │   ├── telephony.service.ts         (Uses ITelephonyProvider)
│   │   │   ├── provider-registry.service.ts
│   │   │   ├── provider-factory.service.ts
│   │   │   └── call-manager.service.ts
│   │   ├── providers/
│   │   │   ├── exotel.provider.ts           ✅ Already created
│   │   │   ├── airtel.provider.ts
│   │   │   ├── knowlarity.provider.ts
│   │   │   ├── sip-generic.provider.ts
│   │   │   └── mock.provider.ts
│   │   ├── dto/
│   │   │   ├── make-call.dto.ts
│   │   │   ├── call-status.dto.ts
│   │   │   └── webhook.dto.ts
│   │   └── controllers/
│   │       ├── telephony.controller.ts
│   │       └── webhook.controller.ts
│   │
│   ├── ai-pipeline/                        ⭐ NEW - Local AI Services
│   │   ├── ai-pipeline.module.ts
│   │   ├── services/
│   │   │   ├── ai-orchestrator.service.ts
│   │   │   ├── stt.service.ts              (Faster Whisper)
│   │   │   ├── llm.service.ts              (Ollama)
│   │   │   ├── tts.service.ts              (Kokoro XTTS)
│   │   │   └── audio-streaming.service.ts
│   │   ├── interfaces/
│   │   │   ├── stt-provider.interface.ts
│   │   │   ├── llm-provider.interface.ts
│   │   │   └── tts-provider.interface.ts
│   │   └── providers/
│   │       ├── whisper-stt.provider.ts
│   │       ├── ollama-llm.provider.ts
│   │       ├── openai-llm.provider.ts      (Fallback)
│   │       └── kokoro-tts.provider.ts
│   │
│   ├── queue/                              ⭐ NEW - BullMQ Queue
│   │   ├── queue.module.ts
│   │   ├── services/
│   │   │   ├── call-queue.service.ts
│   │   │   ├── queue-worker.service.ts
│   │   │   └── retry-strategy.service.ts
│   │   └── processors/
│   │       └── call.processor.ts
│   │
│   ├── calling-pipeline/                   ✏️ UPDATE - Remove Twilio
│   │   ├── services/
│   │   │   ├── campaign-execution.service.ts
│   │   │   ├── call-orchestrator.service.ts
│   │   │   └── conversation-state.service.ts
│   │
│   ├── campaigns/                          ✏️ UPDATE - Already good
│   │   └── (Keep existing - minimal changes)
│   │
│   ├── contacts/                           ✏️ UPDATE - Already good
│   │   └── (Keep existing - minimal changes)
│   │
│   ├── runtime-monitor/                    ⭐ NEW - Socket.IO
│   │   ├── runtime-monitor.module.ts
│   │   ├── runtime-monitor.gateway.ts
│   │   └── services/
│   │       └── realtime-updates.service.ts
│   │
│   └── ... (other modules remain unchanged)
│
└── common/
    ├── interfaces/
    │   └── provider.interface.ts
    └── decorators/
        └── telephony-provider.decorator.ts
```

---

## 🚀 Implementation Plan

### Phase 1: Telephony Abstraction Layer (Week 1)

#### Files to Create

1. **`apps/api/src/modules/telephony/interfaces/telephony-provider.interface.ts`**
   - Complete interface definition
   - All type definitions
   - Provider capabilities

2. **`apps/api/src/modules/telephony/services/telephony.service.ts`**
   - Core service using ITelephonyProvider
   - Provider-agnostic methods
   - Error handling

3. **`apps/api/src/modules/telephony/services/provider-factory.service.ts`**
   - Dynamic provider instantiation
   - Configuration-driven selection
   - Provider registration

4. **`apps/api/src/modules/telephony/providers/mock.provider.ts`**
   - Testing provider
   - No external dependencies
   - Simulates call flows

5. **`apps/api/src/modules/telephony/providers/sip-generic.provider.ts`**
   - Generic SIP implementation
   - Works with any SIP server
   - Low-level control

#### Files to Update

1. **`apps/api/src/modules/calling-pipeline/services/campaign-execution.service.ts`**
   ```typescript
   // BEFORE
   import { TwilioService } from '../twilio/twilio.service';
   
   // AFTER
   import { TelephonyService } from '../telephony/services/telephony.service';
   
   constructor(
     private readonly telephony: TelephonyService, // ✅ Provider-independent
   ) {}
   ```

2. **`apps/api/src/modules/calling-pipeline/services/call-orchestrator.service.ts`**
   - Replace Twilio calls with TelephonyService
   - Use provider-agnostic interfaces

### Phase 2: AI Pipeline (Week 2)

#### Local AI Setup

1. **Faster Whisper Service**
   ```python
   # apps/ai-services/whisper-service/main.py
   from faster_whisper import WhisperModel
   
   model = WhisperModel("base", device="cuda")
   
   @app.post("/transcribe")
   async def transcribe(audio: UploadFile):
       segments, info = model.transcribe(audio.file)
       return {"text": " ".join([s.text for s in segments])}
   ```

2. **Ollama LLM Service**
   ```typescript
   // apps/api/src/modules/ai-pipeline/providers/ollama-llm.provider.ts
   @Injectable()
   export class OllamaLLMProvider implements ILLMProvider {
     async generate(prompt: string, context?: any): Promise<LLMResponse> {
       const response = await fetch('http://localhost:11434/api/generate', {
         method: 'POST',
         body: JSON.stringify({
           model: this.config.model, // llama3, qwen, etc.
           prompt,
           stream: false,
         }),
       });
       return response.json();
     }
   }
   ```

3. **Kokoro TTS Service**
   ```python
   # apps/ai-services/kokoro-service/main.py
   from kokoro import KokoroTTS
   
   tts = KokoroTTS()
   
   @app.post("/synthesize")
   async def synthesize(text: str, voice: str):
       audio = tts.synthesize(text, voice=voice)
       return StreamingResponse(audio, media_type="audio/wav")
   ```

### Phase 3: Queue System (Week 3)

#### BullMQ Implementation

```typescript
// apps/api/src/modules/queue/services/call-queue.service.ts
import { Queue, Worker } from 'bullmq';

@Injectable()
export class CallQueueService {
  private queue: Queue;
  private worker: Worker;

  async init() {
    this.queue = new Queue('calls', {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      },
    });

    this.worker = new Worker('calls', async (job) => {
      await this.processCall(job.data);
    }, {
      connection: this.queue.opts.connection,
      concurrency: parseInt(process.env.CONCURRENT_CALLS) || 5,
    });
  }

  async addCall(campaignId: string, contactId: string) {
    return this.queue.add('make-call', {
      campaignId,
      contactId,
      timestamp: new Date(),
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  private async processCall(data: CallJobData) {
    const { campaignId, contactId } = data;
    
    // Load campaign and contact
    const campaign = await this.campaignService.findOne(campaignId);
    const contact = await this.contactService.findOne(contactId);
    
    // Make call via telephony service (provider-independent)
    const result = await this.telephonyService.makeCall({
      to: contact.phone,
      from: campaign.callerId,
      callbackUrl: `${process.env.API_URL}/webhooks/telephony/voice`,
      statusCallbackUrl: `${process.env.API_URL}/webhooks/telephony/status`,
      metadata: {
        campaignId,
        contactId,
      },
    });
    
    // Update database
    await this.callService.create({
      campaignId,
      contactId,
      callId: result.callId,
      providerCallId: result.providerCallId,
      status: result.status,
    });
    
    return result;
  }
}
```

### Phase 4: Runtime Monitor (Week 3)

#### Socket.IO Real-time Updates

```typescript
// apps/api/src/modules/runtime-monitor/runtime-monitor.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'runtime',
})
export class RuntimeMonitorGateway {
  @WebSocketServer()
  server: Server;

  // Emit call status updates
  emitCallStatus(callId: string, status: CallStatus) {
    this.server.emit('call:status', {
      callId,
      status,
      timestamp: new Date(),
    });
  }

  // Emit transcript updates
  emitTranscript(callId: string, transcript: string, speaker: 'ai' | 'customer') {
    this.server.emit('call:transcript', {
      callId,
      transcript,
      speaker,
      timestamp: new Date(),
    });
  }

  // Emit AI thinking state
  emitAIThinking(callId: string, thinking: boolean) {
    this.server.emit('call:ai-thinking', {
      callId,
      thinking,
      timestamp: new Date(),
    });
  }

  // Emit metrics
  emitMetrics(callId: string, metrics: CallMetrics) {
    this.server.emit('call:metrics', {
      callId,
      ...metrics,
      timestamp: new Date(),
    });
  }
}
```

---

## 🔌 Provider Implementations

### Exotel Provider (Already Created ✅)

Location: `apps/api/src/modules/telephony-engine/providers/exotel.provider.ts`

### Airtel IQ Provider (To Create)

```typescript
// apps/api/src/modules/telephony/providers/airtel.provider.ts
@Injectable()
export class AirtelProvider implements ITelephonyProvider {
  getName() { return 'Airtel IQ'; }
  getType() { return ProviderType.AIRTEL; }

  async makeCall(params: CallParams): Promise<CallResult> {
    // Airtel IQ API implementation
    const response = await fetch('https://api.airteliq.com/v1/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.to,
        from: params.from,
        answer_url: params.callbackUrl,
        status_callback: params.statusCallbackUrl,
      }),
    });

    const data = await response.json();
    
    return {
      callId: this.generateInternalId(),
      providerCallId: data.call_uuid,
      status: this.mapStatus(data.status),
      direction: 'outbound',
      from: params.from,
      to: params.to,
      timestamp: new Date(),
    };
  }

  // Implement other interface methods...
}
```

### Generic SIP Provider

```typescript
// apps/api/src/modules/telephony/providers/sip-generic.provider.ts
import { Client } from 'sip.js';

@Injectable()
export class SipGenericProvider implements ITelephonyProvider {
  private client: Client;

  async initialize(config: ProviderConfig) {
    this.client = new Client({
      uri: config.sipServer,
      credentials: {
        username: config.sipUsername,
        password: config.sipPassword,
      },
    });

    await this.client.start();
  }

  async makeCall(params: CallParams): Promise<CallResult> {
    const session = await this.client.invite(params.to);
    
    // Handle session events
    session.on('accepted', () => {
      this.emitWebhook(params.callbackUrl, {
        event: 'call_answered',
        callId: session.id,
      });
    });

    return {
      callId: this.generateInternalId(),
      providerCallId: session.id,
      status: CallStatus.DIALING,
      direction: 'outbound',
      from: params.from,
      to: params.to,
      timestamp: new Date(),
    };
  }

  // Implement other interface methods...
}
```

---

## 📝 Configuration

### New Environment Variables

```bash
# ========================================
# TELEPHONY PROVIDER
# ========================================
TELEPHONY_PROVIDER=exotel
# Options: exotel | airtel | knowlarity | myoperator | ozonetel | sip | mock

# ========================================
# EXOTEL CONFIGURATION
# ========================================
EXOTEL_API_KEY=your_key
EXOTEL_API_TOKEN=your_token
EXOTEL_SID=your_sid
EXOTEL_SUBDOMAIN=your_subdomain
EXOTEL_CALLER_ID=0xxxxxxxxxx

# ========================================
# AIRTEL IQ CONFIGURATION
# ========================================
AIRTEL_API_KEY=your_key
AIRTEL_APP_ID=your_app_id
AIRTEL_CALLER_ID=xxxxxxxxxx

# ========================================
# GENERIC SIP CONFIGURATION
# ========================================
SIP_SERVER=sip.example.com
SIP_PORT=5060
SIP_USERNAME=your_username
SIP_PASSWORD=your_password
SIP_TLS=true

# ========================================
# AI SERVICES (LOCAL)
# ========================================
# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
# Options: llama3, qwen2, gemma, mistral

# Faster Whisper
WHISPER_HOST=http://localhost:8001
WHISPER_MODEL=base
# Options: tiny, base, small, medium, large

# Kokoro TTS
KOKORO_HOST=http://localhost:8002
KOKORO_VOICE=indian_female
KOKORO_SPEED=1.0

# OpenAI (Fallback)
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4

# ========================================
# QUEUE (REDIS/BULLMQ)
# ========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CONCURRENT_CALLS=5
MAX_RETRIES=3
RETRY_DELAY=5000

# ========================================
# WEBHOOKS
# ========================================
API_URL=https://your-domain.com/api/v1
WEBHOOK_SECRET=your_secret

# ========================================
# REMOVE ALL TWILIO VARIABLES
# ========================================
# ❌ TWILIO_ACCOUNT_SID=ACxxxxx
# ❌ TWILIO_AUTH_TOKEN=xxxxx
# ❌ TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🗄️ Database Schema Updates

```prisma
// Add provider field
model Call {
  id                String    @id @default(uuid())
  callId            String    @unique
  providerCallId    String
  provider          String    // 'exotel' | 'airtel' | 'sip'
  campaignId        String
  contactId         String
  status            String
  direction         String
  from              String
  to                String
  duration          Int?
  cost              Float?
  
  // AI Metrics
  sttLatency        Int?
  llmLatency        Int?
  ttsLatency        Int?
  totalTokens       Int?
  
  // Recording
  recordingUrl      String?
  recordingId       String?
  
  // Timestamps
  queuedAt          DateTime?
  dialingAt         DateTime?
  answeredAt        DateTime?
  completedAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  campaign          Campaign  @relation(fields: [campaignId], references: [id])
  contact           Contact   @relation(fields: [contactId], references: [id])
  transcript        Transcript[]
  
  @@index([campaignId])
  @@index([contactId])
  @@index([provider])
  @@index([status])
}

model Transcript {
  id          String    @id @default(uuid())
  callId      String
  speaker     String    // 'ai' | 'customer'
  message     String    @db.Text
  confidence  Float?
  timestamp   DateTime  @default(now())
  
  call        Call      @relation(fields: [callId], references: [id])
  
  @@index([callId])
}

model AIMetrics {
  id              String    @id @default(uuid())
  callId          String    @unique
  model           String    // 'llama3', 'qwen2', etc.
  totalTokens     Int
  promptTokens    Int
  completionTokens Int
  sttProvider     String    // 'whisper'
  ttsProvider     String    // 'kokoro'
  avgLatency      Int
  createdAt       DateTime  @default(now())
  
  @@index([callId])
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('TelephonyService', () => {
  let service: TelephonyService;
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = new MockProvider();
    service = new TelephonyService(mockProvider);
  });

  it('should make a call using the provider', async () => {
    const result = await service.makeCall({
      to: '+919876543210',
      from: '0xxxxxxxxxx',
      callbackUrl: 'https://example.com/callback',
    });

    expect(result.status).toBe(CallStatus.QUEUED);
    expect(mockProvider.makeCall).toHaveBeenCalled();
  });

  it('should work with any provider', async () => {
    // Test with Exotel
    const exotelService = new TelephonyService(new ExotelProvider());
    
    // Test with Airtel
    const airtelService = new TelephonyService(new AirtelProvider());
    
    // Both should work the same way
    expect(exotelService.makeCall).toBeDefined();
    expect(airtelService.makeCall).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Campaign Execution (Provider Independent)', () => {
  it('should execute campaign regardless of provider', async () => {
    const providers = ['exotel', 'airtel', 'mock'];

    for (const providerType of providers) {
      process.env.TELEPHONY_PROVIDER = providerType;
      
      const result = await campaignService.startCampaign(campaignId);
      
      expect(result.success).toBe(true);
      expect(result.callsQueued).toBeGreaterThan(0);
    }
  });
});
```

---

## 📊 Cost Comparison

### Twilio (Current)
- Outbound calls: ₹2.00-3.00/min
- AI (OpenAI): ₹0.50-1.00/call
- **Total: ₹2.50-4.00/call**

### New Architecture
- Exotel calls: ₹0.50-1.00/min
- Ollama (local): ₹0.00/call
- Whisper (local): ₹0.00/call
- Kokoro (local): ₹0.00/call
- **Total: ₹0.50-1.00/call**

### **Savings: 75-80%** 🎉

---

## 🚀 Next Steps

1. **Review this architecture document**
2. **Shall I implement the core Telephony Abstraction Layer?**
3. **Or would you like me to start with AI Pipeline integration?**

Choose your priority and I'll create the implementation files!
