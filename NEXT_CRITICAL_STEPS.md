# 🎯 NEXT CRITICAL IMPLEMENTATION STEPS

## ✅ COMPLETED RIGHT NOW
1. Database migration generated and applied ✅
2. Prisma Client regenerated ✅
3. SIM Manager Service created ✅
4. Comprehensive audit completed ✅

---

## 🚀 IMMEDIATE NEXT STEPS (In Order)

### **Step 1: Complete GSM Gateway Module** (2 hours)

Create these files in order:

#### **File 1: GSM Manager Service**
`apps/api/src/modules/gsm-gateway/services/gsm-manager.service.ts`
- CRUD operations for GSM Gateway
- Health check methods
- Gateway discovery

#### **File 2: Channel Manager Service**
`apps/api/src/modules/gsm-gateway/services/channel-manager.service.ts`
- Map SIM to Asterisk channel
- Get Asterisk channel name for SIM
- Channel availability checking

#### **File 3: DTOs**
```
apps/api/src/modules/gsm-gateway/dto/
├── create-gateway.dto.ts
├── update-gateway.dto.ts
├── create-sim.dto.ts
├── update-sim.dto.ts
└── sim-selection.dto.ts
```

#### **File 4: Controller**
`apps/api/src/modules/gsm-gateway/gsm-gateway.controller.ts`
- POST /gsm-gateway (create gateway)
- GET /gsm-gateway (list gateways)
- GET /gsm-gateway/:id (get gateway)
- PUT /gsm-gateway/:id (update gateway)
- DELETE /gsm-gateway/:id (delete gateway)
- POST /gsm-gateway/:id/sims (add SIM)
- GET /gsm-gateway/:id/sims (list SIMs)
- GET /gsm-gateway/sims/available (get available SIM)
- GET /gsm-gateway/sims/:id/stats (SIM statistics)

#### **File 5: Module**
`apps/api/src/modules/gsm-gateway/gsm-gateway.module.ts`
- Import PrismaModule
- Declare all services
- Declare controller
- Export services

#### **File 6: Register in App Module**
`apps/api/src/app.module.ts`
- Import GSMGatewayModule

#### **File 7: Update Asterisk Provider**
`apps/api/src/modules/telephony-engine/providers/asterisk.provider.ts`
- Inject SIMManagerService
- Use getOptimalSIM() before makeCall()
- Use markSIMInUse() when call starts
- Use markSIMAvailable() when call ends

---

### **Step 2: Implement BullMQ Queue System** (2 hours)

#### **Install Dependencies**
```bash
npm install bullmq ioredis
npm install -D @types/ioredis
```

#### **Create Files:**
```
apps/api/src/modules/queue/
├── queue.module.ts
├── services/
│   ├── call-queue.service.ts
│   └── retry-strategy.service.ts
└── processors/
    └── call.processor.ts
```

#### **Update queue-execution.service.ts**
- Replace in-memory queue with BullMQ
- Use CallQueueService

---

### **Step 3: Implement Socket.IO Runtime Monitor** (3 hours)

#### **Install Dependencies**
```bash
npm install @nestjs/platform-socket.io socket.io
```

#### **Create Backend Files:**
```
apps/api/src/modules/runtime-monitor/
├── runtime-monitor.module.ts
├── runtime-monitor.gateway.ts
└── services/
    ├── realtime-events.service.ts
    └── dashboard-stats.service.ts
```

#### **Create Frontend Files:**
```
apps/web/src/app/dashboard/runtime-monitor/
├── page.tsx
├── components/
│   ├── call-status-card.tsx
│   ├── live-transcript.tsx
│   ├── sim-status-indicator.tsx
│   └── queue-stats.tsx
└── hooks/
    └── use-socket.ts
```

#### **Integrate with Call Pipeline**
- Subscribe to events in calling-pipeline services
- Emit to Socket.IO gateway
- Broadcast to connected clients

---

### **Step 4: Create Local AI Services** (4 hours)

#### **Faster Whisper Service (Python)**
```bash
mkdir -p apps/ai-services/whisper-service
cd apps/ai-services/whisper-service

# Create files
touch main.py
touch requirements.txt
touch Dockerfile

# Install
pip install faster-whisper fastapi uvicorn python-multipart

# Run
python main.py
```

#### **Kokoro TTS Service (Python)**
```bash
mkdir -p apps/ai-services/kokoro-service
cd apps/ai-services/kokoro-service

# Create files
touch main.py
touch requirements.txt
touch Dockerfile

# Run
python main.py
```

#### **Ollama Setup**
```bash
# Install Ollama
# Download models
ollama pull llama3
ollama pull qwen2
```

#### **NestJS AI Pipeline Module**
```
apps/api/src/modules/ai-pipeline/
├── ai-pipeline.module.ts
└── services/
    ├── stt.service.ts
    ├── llm.service.ts
    ├── tts.service.ts
    └── audio-streaming.service.ts
```

---

### **Step 5: Recording & Transcript** (2 hours)

#### **Create File Storage Service**
`apps/api/src/modules/file-storage/services/recording-storage.service.ts`
- Save to local filesystem
- Save to S3 (optional)
- Return public URL

#### **Create Transcript Service**
`apps/api/src/modules/transcripts/services/transcript-generator.service.ts`
- Call Whisper STT
- Generate transcript
- Save to database

#### **Update Calling Pipeline**
- Save recording after call ends
- Generate transcript asynchronously
- Store in database

---

## 📋 TESTING CHECKLIST

After each step, verify:

### **After GSM Gateway:**
```bash
# Test: Create gateway
curl -X POST http://localhost:3001/api/v1/gsm-gateway \
  -H "Content-Type: application/json" \
  -d '{"name":"Gateway-1","ipAddress":"192.168.1.100","totalPorts":4}'

# Test: Add SIM
curl -X POST http://localhost:3001/api/v1/gsm-gateway/{id}/sims \
  -H "Content-Type: application/json" \
  -d '{"simNumber":"9876543210","operator":"Jio","portNumber":1}'

# Test: Get available SIM
curl http://localhost:3001/api/v1/gsm-gateway/sims/available?companyId=xxx
```

### **After BullMQ:**
```bash
# Test: Queue a call
# Verify: Redis has job
# Verify: Worker picks up job
# Verify: Retry on failure
```

### **After Socket.IO:**
```bash
# Test: Connect to Socket.IO
const socket = io('http://localhost:3001/runtime');
socket.on('call:dialing', console.log);

# Test: Start campaign
# Verify: Events received in real-time
```

### **After AI Pipeline:**
```bash
# Test: STT service
curl -X POST http://localhost:9000/transcribe -F "audio=@test.wav"

# Test: TTS service
curl -X POST http://localhost:9001/synthesize -d '{"text":"Hello"}'

# Test: Ollama
curl http://localhost:11434/api/generate -d '{"model":"llama3","prompt":"Hello"}'
```

### **After Recording:**
```bash
# Test: Start call
# Verify: Recording saved
# Verify: Transcript generated
# Verify: Both accessible via API
```

---

## 🎯 SUCCESS MILESTONES

- [ ] **Milestone 1:** Campaign starts → BullMQ queues calls ✓
- [ ] **Milestone 2:** Worker picks call → Selects optimal SIM ✓
- [ ] **Milestone 3:** Asterisk originates call via GSM Gateway ✓
- [ ] **Milestone 4:** Customer answers → Socket.IO emits 'connected' ✓
- [ ] **Milestone 5:** Audio streams → Whisper transcribes ✓
- [ ] **Milestone 6:** Ollama generates response ✓
- [ ] **Milestone 7:** Kokoro synthesizes speech ✓
- [ ] **Milestone 8:** Audio plays to customer ✓
- [ ] **Milestone 9:** Call ends → Recording saved ✓
- [ ] **Milestone 10:** Transcript generated and stored ✓
- [ ] **Milestone 11:** Runtime Monitor shows all activity ✓
- [ ] **Milestone 12:** Analytics updated ✓

When all milestones pass → **PRODUCTION READY** ✅

---

## 💾 Configuration Checklist

Update `.env` with:

```bash
# Redis/BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CONCURRENT_CALLS=5

# Socket.IO
SOCKETIO_CORS_ORIGIN=http://localhost:3000

# Local AI
WHISPER_ENDPOINT=http://localhost:9000
OLLAMA_ENDPOINT=http://localhost:11434
KOKORO_ENDPOINT=http://localhost:9001

# Recording Storage
RECORDING_STORAGE=local
RECORDING_PATH=./storage/recordings
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

---

## 📞 Support Commands

```bash
# Check Redis
redis-cli ping

# Check Asterisk
asterisk -rx "core show channels"

# Check Ollama
ollama list

# Check API
curl http://localhost:3001/api/v1/health

# Check Prisma
npx prisma studio --schema=./database/prisma/schema.prisma

# View logs
tail -f apps/api/logs/app.log
```

---

**Ready to continue systematic implementation!**

**Next:** Create GSM Manager Service
