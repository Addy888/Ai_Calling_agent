# 📱 GSM Gateway + Asterisk Implementation Plan

**Project:** Enterprise AI Calling Platform for India  
**Goal:** Add GSM Gateway + Physical SIM + Asterisk/FreeSWITCH Support  
**Strategy:** **EXTEND** existing architecture, do NOT rebuild

---

## 🎯 Objectives

1. ✅ **Extend** existing telephony-engine module (NOT replace)
2. ✅ **Add** Asterisk/FreeSWITCH provider implementation
3. ✅ **Add** GSM Gateway support with multi-SIM management
4. ✅ **Integrate** with existing campaign execution pipeline
5. ✅ **Use** local AI models (Ollama, Faster Whisper, Kokoro XTTS)
6. ✅ **Implement** BullMQ queue system with Redis
7. ✅ **Add** Socket.IO real-time updates to Runtime Monitor
8. ✅ **Minimize** costs (60-80% reduction vs Twilio + OpenAI)

---

## 📊 Existing Architecture Analysis

### ✅ **What Already Exists (DO NOT RECREATE)**

#### **1. Telephony Engine Module** (`apps/api/src/modules/telephony-engine/`)
- ✅ `ITelephonyProvider` interface (provider abstraction)
- ✅ Provider registry and factory pattern
- ✅ Twilio, Exotel, Plivo providers
- ✅ Call manager service
- ✅ Recording manager service
- ✅ Webhook manager service
- ✅ Session manager service

#### **2. Calling Pipeline Module** (`apps/api/src/modules/calling-pipeline/`)
- ✅ Campaign execution service
- ✅ Call orchestrator service
- ✅ Call lifecycle service
- ✅ Queue execution service
- ✅ Agent execution service
- ✅ Conversation state service
- ✅ Call session service

#### **3. Campaign Module** (`apps/api/src/modules/campaigns/`)
- ✅ Campaign CRUD operations
- ✅ Campaign settings management
- ✅ Contact assignment workflow

#### **4. Contact Module** (`apps/api/src/modules/contacts/`)
- ✅ Contact management
- ✅ CSV/Excel import
- ✅ Search and filtering
- ✅ Campaign mapping

#### **5. AI Agent Module** (`apps/api/src/modules/ai-agent/`)
- ✅ AI Agent runtime
- ✅ Agent sessions
- ✅ Conversation intelligence

#### **6. Database Schema** (`database/prisma/schema.prisma`)
- ✅ Company, User, Role, Permission models
- ✅ Campaign, Contact, Call models
- ✅ Script, Prompt, KnowledgeBase models
- ✅ AIAgent, AgentSession models
- ✅ ConversationMemory models

---

## 🔧 What Needs to be **ADDED** (Extending Existing)

### **1. Asterisk/FreeSWITCH Provider** (NEW)

**File:** `apps/api/src/modules/telephony-engine/providers/asterisk.provider.ts`

**Implements:** `ITelephonyProvider`

**Features:**
- AMI (Asterisk Manager Interface) integration
- Originate calls via AMI
- Call control (hangup, transfer, DTMF)
- AGI (Asterisk Gateway Interface) for audio streaming
- Recording management
- Channel state tracking
- Event listening (DialBegin, DialEnd, Hangup, etc.)

**Configuration:**
```typescript
{
  host: process.env.ASTERISK_HOST,
  port: process.env.ASTERISK_AMI_PORT, // 5038
  username: process.env.ASTERISK_AMI_USERNAME,
  secret: process.env.ASTERISK_AMI_SECRET,
  context: process.env.ASTERISK_CONTEXT, // 'ai-calling'
  extension: process.env.ASTERISK_EXTENSION,
}
```

---

### **2. GSM Gateway Management** (NEW)

**Files:**
- `apps/api/src/modules/gsm-gateway/gsm-gateway.module.ts`
- `apps/api/src/modules/gsm-gateway/services/gsm-manager.service.ts`
- `apps/api/src/modules/gsm-gateway/services/sim-manager.service.ts`
- `apps/api/src/modules/gsm-gateway/services/channel-manager.service.ts`
- `apps/api/src/modules/gsm-gateway/dto/gsm.dto.ts`
- `apps/api/src/modules/gsm-gateway/gsm-gateway.controller.ts`

**Database Models** (ADD to schema.prisma):

```prisma
model GSMGateway {
  id            String   @id @default(uuid())
  companyId     String
  name          String
  ipAddress     String
  port          Int      @default(5060)
  username      String?
  password      String?
  model         String   // "Dinstar", "Yeastar", "OpenVox", "Generic"
  totalPorts    Int      // 4, 8, 16, 32
  status        String   @default("ACTIVE")
  isActive      Boolean  @default(true)
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  sims          SIMCard[]
  
  @@index([companyId])
  @@index([status])
  @@map("gsm_gateways")
}

model SIMCard {
  id            String   @id @default(uuid())
  gatewayId     String
  companyId     String
  simNumber     String   // Phone number
  operator      String   // "Jio", "Airtel", "Vi", "BSNL"
  portNumber    Int      // 1, 2, 3, 4...
  status        String   @default("ACTIVE") // ACTIVE, INACTIVE, BUSY, ERROR
  signal        Int?     // Signal strength 0-100
  balance       Float?
  lastUsed      DateTime?
  callsToday    Int      @default(0)
  callsMonth    Int      @default(0)
  dailyLimit    Int      @default(100)
  monthlyLimit  Int      @default(3000)
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  gateway       GSMGateway @relation(fields: [gatewayId], references: [id], onDelete: Cascade)
  calls         Call[]     @relation("SIMCardCalls")
  
  @@unique([gatewayId, portNumber])
  @@index([companyId])
  @@index([gatewayId])
  @@index([status])
  @@index([simNumber])
  @@map("sim_cards")
}

// Update existing Call model
model Call {
  // ... existing fields ...
  simCardId     String?  // NEW: Link to SIM used
  asteriskChannel String? // NEW: Asterisk channel name
  
  simCard       SIMCard? @relation("SIMCardCalls", fields: [simCardId], references: [id])
}
```

---

### **3. Local AI Pipeline** (NEW)

**Files:**
- `apps/api/src/modules/ai-pipeline/ai-pipeline.module.ts`
- `apps/api/src/modules/ai-pipeline/services/stt.service.ts` (Faster Whisper)
- `apps/api/src/modules/ai-pipeline/services/llm.service.ts` (Ollama)
- `apps/api/src/modules/ai-pipeline/services/tts.service.ts` (Kokoro XTTS)
- `apps/api/src/modules/ai-pipeline/services/audio-streaming.service.ts`

**External Services** (Python/FastAPI):
- `apps/ai-services/whisper-service/` - Faster Whisper STT
- `apps/ai-services/kokoro-service/` - Kokoro TTS

**Ollama:** Use existing HTTP API (http://localhost:11434)

---

### **4. BullMQ Queue System** (NEW)

**Files:**
- `apps/api/src/modules/queue/queue.module.ts`
- `apps/api/src/modules/queue/services/call-queue.service.ts`
- `apps/api/src/modules/queue/processors/call.processor.ts`
- `apps/api/src/modules/queue/services/retry-strategy.service.ts`

**Features:**
- Job queuing with priority
- Retry logic with exponential backoff
- Concurrency control per campaign
- Dead letter queue for failed calls
- Rate limiting per SIM
- Queue monitoring and statistics

---

### **5. Socket.IO Runtime Monitor** (NEW)

**Files:**
- `apps/api/src/modules/runtime-monitor/runtime-monitor.module.ts`
- `apps/api/src/modules/runtime-monitor/runtime-monitor.gateway.ts`
- `apps/api/src/modules/runtime-monitor/services/realtime-updates.service.ts`

**Events to Emit:**
- `campaign:started`
- `call:queued`
- `call:dialing`
- `call:connected`
- `call:ai_speaking`
- `call:customer_speaking`
- `call:transcript` (real-time)
- `call:completed`
- `call:failed`
- `sim:status_change`
- `gateway:status_change`

---

## 🚀 Implementation Phases

### **Phase 1: Asterisk Provider + GSM Gateway (Day 1-2)**

#### **Step 1.1: Add Asterisk Provider**
```bash
# Create provider file
apps/api/src/modules/telephony-engine/providers/asterisk.provider.ts
```

**Implementation:**
- Connect to Asterisk via AMI (asterisk-manager package)
- Implement `ITelephonyProvider` interface
- Call origination via AMI Originate action
- Event handling (DialBegin, DialEnd, Hangup)
- Audio streaming setup (AGI)
- Recording management

#### **Step 1.2: Update Provider Registry**
```typescript
// apps/api/src/modules/telephony-engine/enums/call-state.enum.ts
export enum ProviderType {
  TWILIO = 'twilio',
  EXOTEL = 'exotel',
  PLIVO = 'plivo',
  ASTERISK = 'asterisk',  // ADD THIS
  FREESWITCH = 'freeswitch',  // ADD THIS
}
```

```typescript
// apps/api/src/modules/telephony-engine/services/provider-manager.service.ts
import { AsteriskProvider } from '../providers/asterisk.provider';

// In constructor, inject AsteriskProvider
// In registerAllProviders(), register Asterisk
```

#### **Step 1.3: Create GSM Gateway Module**
```bash
# Create module structure
apps/api/src/modules/gsm-gateway/
├── gsm-gateway.module.ts
├── gsm-gateway.controller.ts
├── services/
│   ├── gsm-manager.service.ts
│   ├── sim-manager.service.ts
│   └── channel-manager.service.ts
└── dto/
    ├── create-gateway.dto.ts
    ├── create-sim.dto.ts
    └── gsm-status.dto.ts
```

#### **Step 1.4: Update Database Schema**
```bash
# Add GSMGateway and SIMCard models to schema.prisma
# Run migration
npx prisma migrate dev --name add_gsm_gateway_models
```

#### **Step 1.5: Environment Variables**
```bash
# .env
# Asterisk Configuration
ASTERISK_HOST=localhost
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your_secret
ASTERISK_CONTEXT=ai-calling
ASTERISK_AGI_PORT=4573

# GSM Gateway
GSM_GATEWAY_ENABLED=true
GSM_GATEWAY_HOST=192.168.1.100
GSM_GATEWAY_USERNAME=admin
GSM_GATEWAY_PASSWORD=admin
```

---

### **Phase 2: Local AI Integration (Day 2-3)**

#### **Step 2.1: Setup Faster Whisper Service**

**File:** `apps/ai-services/whisper-service/main.py`

```python
from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import uvicorn

app = FastAPI()

# Load model (GPU if available)
model = WhisperModel("base", device="cuda", compute_type="float16")

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = "auto"):
    # Save temp audio file
    audio_path = f"/tmp/{audio.filename}"
    with open(audio_path, "wb") as f:
        f.write(await audio.read())
    
    # Transcribe
    segments, info = model.transcribe(
        audio_path,
        language=language if language != "auto" else None,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=500,
            speech_pad_ms=400
        )
    )
    
    # Collect text
    text = " ".join([segment.text for segment in segments])
    
    return {
        "text": text,
        "language": info.language,
        "language_probability": info.language_probability
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
```

**Run:**
```bash
cd apps/ai-services/whisper-service
pip install faster-whisper fastapi uvicorn
python main.py
```

#### **Step 2.2: Setup Kokoro TTS Service**

**File:** `apps/ai-services/kokoro-service/main.py`

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from kokoro import KokoroTTS
import io
import uvicorn

app = FastAPI()

# Initialize Kokoro TTS
tts = KokoroTTS()

@app.post("/synthesize")
async def synthesize(text: str, voice: str = "indian_female", speed: float = 1.0):
    # Generate audio
    audio_data = tts.synthesize(text, voice=voice, speed=speed)
    
    # Return as streaming response
    return StreamingResponse(
        io.BytesIO(audio_data),
        media_type="audio/wav"
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9001)
```

**Run:**
```bash
cd apps/ai-services/kokoro-service
pip install kokoro-tts fastapi uvicorn
python main.py
```

#### **Step 2.3: Create AI Pipeline Module**

```typescript
// apps/api/src/modules/ai-pipeline/ai-pipeline.module.ts
import { Module } from '@nestjs/common';
import { STTService } from './services/stt.service';
import { LLMService } from './services/llm.service';
import { TTSService } from './services/tts.service';
import { AudioStreamingService } from './services/audio-streaming.service';

@Module({
  providers: [STTService, LLMService, TTSService, AudioStreamingService],
  exports: [STTService, LLMService, TTSService, AudioStreamingService],
})
export class AIPipelineModule {}
```

```typescript
// apps/api/src/modules/ai-pipeline/services/stt.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';

@Injectable()
export class STTService {
  private readonly whisperEndpoint: string;

  constructor(private configService: ConfigService) {
    this.whisperEndpoint = this.configService.get('WHISPER_ENDPOINT', 'http://localhost:9000');
  }

  async transcribe(audioBuffer: Buffer, language: string = 'auto'): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBuffer, 'audio.wav');
    formData.append('language', language);

    const response = await fetch(`${this.whisperEndpoint}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return result.text;
  }
}
```

```typescript
// apps/api/src/modules/ai-pipeline/services/llm.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LLMService {
  private readonly ollamaEndpoint: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.ollamaEndpoint = this.configService.get('OLLAMA_ENDPOINT', 'http://localhost:11434');
    this.model = this.configService.get('OLLAMA_MODEL', 'llama3');
  }

  async generate(prompt: string, context?: any): Promise<string> {
    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        context: context?.conversationHistory || [],
      }),
    });

    const result = await response.json();
    return result.response;
  }
}
```

```typescript
// apps/api/src/modules/ai-pipeline/services/tts.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TTSService {
  private readonly kokoroEndpoint: string;

  constructor(private configService: ConfigService) {
    this.kokoroEndpoint = this.configService.get('KOKORO_ENDPOINT', 'http://localhost:9001');
  }

  async synthesize(text: string, voice: string = 'indian_female'): Promise<Buffer> {
    const response = await fetch(`${this.kokoroEndpoint}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  }
}
```

---

### **Phase 3: BullMQ Queue System (Day 3-4)**

#### **Step 3.1: Install Dependencies**
```bash
npm install bullmq ioredis
```

#### **Step 3.2: Create Queue Module**

```typescript
// apps/api/src/modules/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CallQueueService } from './services/call-queue.service';
import { CallProcessor } from './processors/call.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'calls',
    }),
  ],
  providers: [CallQueueService, CallProcessor],
  exports: [CallQueueService],
})
export class QueueModule {}
```

```typescript
// apps/api/src/modules/queue/services/call-queue.service.ts
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class CallQueueService {
  constructor(@InjectQueue('calls') private callQueue: Queue) {}

  async addCall(data: CallJobData, options?: JobOptions) {
    return this.callQueue.add('make-call', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      priority: data.priority || 0,
      ...options,
    });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.callQueue.getWaitingCount(),
      this.callQueue.getActiveCount(),
      this.callQueue.getCompletedCount(),
      this.callQueue.getFailedCount(),
      this.callQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
```

---

### **Phase 4: Socket.IO Runtime Monitor (Day 4)**

```typescript
// apps/api/src/modules/runtime-monitor/runtime-monitor.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'runtime',
})
export class RuntimeMonitorGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log(`Client connected: ${client.id}`);
  }

  emitCallStatus(callId: string, status: string, data: any) {
    this.server.emit('call:status', {
      callId,
      status,
      ...data,
      timestamp: new Date(),
    });
  }

  emitTranscript(callId: string, text: string, speaker: 'ai' | 'customer') {
    this.server.emit('call:transcript', {
      callId,
      text,
      speaker,
      timestamp: new Date(),
    });
  }

  emitSIMStatus(simId: string, status: string) {
    this.server.emit('sim:status', {
      simId,
      status,
      timestamp: new Date(),
    });
  }
}
```

---

## 📝 Environment Variables (Complete)

```bash
# =========================================================
# TELEPHONY PROVIDER SELECTION
# =========================================================
TELEPHONY_ENGINE_PROVIDER=asterisk  # twilio | exotel | asterisk | freeswitch

# =========================================================
# ASTERISK CONFIGURATION
# =========================================================
ASTERISK_HOST=localhost
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your_ami_secret
ASTERISK_CONTEXT=ai-calling
ASTERISK_EXTENSION=s
ASTERISK_AGI_PORT=4573

# =========================================================
# GSM GATEWAY CONFIGURATION
# =========================================================
GSM_GATEWAY_ENABLED=true
GSM_GATEWAY_HOST=192.168.1.100
GSM_GATEWAY_PORT=5060
GSM_GATEWAY_USERNAME=admin
GSM_GATEWAY_PASSWORD=admin

# =========================================================
# LOCAL AI SERVICES
# =========================================================
# Faster Whisper (STT)
WHISPER_ENDPOINT=http://localhost:9000
WHISPER_MODEL=base
WHISPER_LANGUAGE=auto

# Ollama (LLM)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TEMPERATURE=0.7
OLLAMA_MAX_TOKENS=500

# Kokoro TTS
KOKORO_ENDPOINT=http://localhost:9001
KOKORO_VOICE=indian_female
KOKORO_SPEED=1.0

# =========================================================
# QUEUE (REDIS/BULLMQ)
# =========================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CONCURRENT_CALLS=5
MAX_RETRIES=3
RETRY_DELAY=5000

# =========================================================
# SOCKET.IO
# =========================================================
SOCKETIO_CORS_ORIGIN=http://localhost:3000
```

---

## 🎯 Success Criteria

- [ ] Asterisk provider implements all `ITelephonyProvider` methods
- [ ] GSM Gateway module manages multiple SIMs
- [ ] Calls are made through Asterisk + GSM Gateway
- [ ] Audio streaming works (Asterisk AGI → Whisper → Ollama → Kokoro → Asterisk)
- [ ] BullMQ queue handles call queueing with retry logic
- [ ] Socket.IO emits real-time updates to Runtime Monitor
- [ ] Campaign execution works end-to-end
- [ ] Local AI reduces costs by 60-80%
- [ ] System is production-ready

---

## 📊 Cost Comparison

| Component | Cloud (Current) | Local (Target) | Savings |
|-----------|----------------|----------------|---------|
| Telephony | Twilio: ₹2-3/min | GSM SIM: ₹0.30-0.50/min | 75-85% |
| STT | OpenAI Whisper: ₹0.006/min | Faster Whisper: ₹0 | 100% |
| LLM | OpenAI GPT-4: ₹0.50/call | Ollama: ₹0 | 100% |
| TTS | ElevenLabs: ₹0.15/min | Kokoro: ₹0 | 100% |
| **Total** | **₹2.50-4.00/call** | **₹0.30-0.50/call** | **80-90%** |

---

**Ready to implement! Let's start with Phase 1: Asterisk Provider + GSM Gateway.**
