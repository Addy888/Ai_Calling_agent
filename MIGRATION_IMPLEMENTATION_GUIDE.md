# Twilio to Indian SIP Migration - Implementation Guide

## ⚠️ IMPORTANT NOTICE

This is a **MASSIVE PRODUCTION MIGRATION** that involves:
- **50+ files** to modify/create/delete
- **Complete telephony stack replacement**
- **New Voice AI pipeline**
- **Queue system implementation**
- **Database schema changes**
- **API endpoint changes**
- **Environment configuration overhaul**

**Estimated Implementation Time:** 2-4 weeks full-time
**Team Size Required:** 2-3 senior engineers
**Risk Level:** HIGH (production system)

---

## 🎯 Migration Approach

Given the complexity, I recommend a **PHASED APPROACH**:

### **Phase 1: Parallel Implementation** (Recommended)
Build the new Indian SIP system **alongside** existing Twilio:
- ✅ Zero downtime
- ✅ Easy rollback
- ✅ Gradual migration
- ✅ A/B testing capability

### **Phase 2: Feature Flag Switch**
Use environment variables to toggle between providers:
```typescript
const TELEPHONY_PROVIDER = process.env.TELEPHONY_PROVIDER || 'twilio';
```

### **Phase 3: Gradual Cutover**
- Start with 1% of traffic
- Monitor metrics
- Increase to 10%, 50%, 100%
- Remove Twilio only after 100% success

---

## 📋 Complete File Checklist

### ✅ NEW FILES TO CREATE (35+ files)

#### 1. Indian SIP Provider
```
apps/api/src/modules/telephony-engine/providers/
├── exotel.provider.ts                    ⭐ HIGH PRIORITY
├── indian-sip-base.provider.ts
├── plivo-india.provider.ts
├── knowlarity.provider.ts
└── sip-direct.provider.ts
```

#### 2. SIP Client Services
```
apps/api/src/modules/sip-client/
├── sip-client.module.ts
├── sip-client.service.ts                 ⭐ HIGH PRIORITY
├── sip-session-manager.service.ts
├── sip-connection-pool.service.ts
├── sip-events.service.ts
└── dto/sip-call.dto.ts
```

#### 3. Voice AI Module
```
apps/api/src/modules/voice-ai/
├── voice-ai.module.ts
├── services/
│   ├── whisper-stt.service.ts            ⭐ HIGH PRIORITY
│   ├── kokoro-tts.service.ts             ⭐ HIGH PRIORITY
│   ├── llm-provider.service.ts           ⭐ HIGH PRIORITY
│   ├── openai-llm.service.ts
│   ├── ollama-llm.service.ts
│   └── voice-ai-pipeline.service.ts
├── dto/
│   ├── stt-request.dto.ts
│   ├── tts-request.dto.ts
│   └── llm-request.dto.ts
└── interfaces/
    ├── stt-provider.interface.ts
    ├── tts-provider.interface.ts
    └── llm-provider.interface.ts
```

#### 4. Queue System (BullMQ)
```
apps/api/src/modules/calling-pipeline/services/
├── bullmq-queue.service.ts               ⭐ HIGH PRIORITY
├── call-worker.service.ts                ⭐ HIGH PRIORITY
├── queue-manager.service.ts
├── rate-limiter.service.ts
└── retry-strategy.service.ts
```

#### 5. Recording Management
```
apps/api/src/modules/recording/
├── recording.module.ts
├── recording-storage.service.ts          ⭐ HIGH PRIORITY
├── s3-storage.service.ts
├── local-storage.service.ts
└── recording-manager.service.ts
```

#### 6. Webhook Handlers
```
apps/api/src/modules/webhooks/
├── exotel-webhook.controller.ts          ⭐ HIGH PRIORITY
├── exotel-webhook.service.ts
├── sip-webhook.controller.ts
└── webhook-validator.service.ts
```

#### 7. Configuration
```
apps/api/src/config/
├── exotel.config.ts                      ⭐ HIGH PRIORITY
├── sip.config.ts
├── voice-ai.config.ts
└── queue.config.ts
```

#### 8. Database Migrations
```
database/prisma/migrations/
├── add_sip_sessions_table.sql
├── add_voice_ai_sessions_table.sql
├── add_provider_column_to_calls.sql
└── add_sip_indexes.sql
```

#### 9. Python Services (Voice AI)
```
apps/voice-ai-engine/
├── main.py
├── requirements.txt
├── services/
│   ├── whisper_service.py
│   ├── kokoro_service.py
│   └── llm_service.py
├── models/
│   └── download_models.sh
└── api/
    ├── stt_endpoint.py
    ├── tts_endpoint.py
    └── llm_endpoint.py
```

#### 10. Testing
```
apps/api/src/modules/telephony-engine/__tests__/
├── exotel-provider.spec.ts
├── sip-client.spec.ts
├── voice-ai-pipeline.spec.ts
└── integration/
    ├── end-to-end-call.spec.ts
    └── queue-processing.spec.ts
```

### ❌ FILES TO DELETE (20+ files)

#### Twilio Providers
```
❌ apps/api/src/modules/telephony/providers/twilio-telephony.provider.ts
❌ apps/api/src/modules/telephony-engine/providers/twilio.provider.ts
```

#### Twilio Tests
```
❌ apps/api/src/modules/telephony-engine/__tests__/twilio-provider.spec.ts
❌ apps/api/src/modules/telephony-engine/__tests__/integration/twilio-integration.spec.ts
```

#### Twilio Documentation
```
❌ All Twilio-related documentation
❌ TwiML examples
❌ Twilio webhook documentation
```

### 🔧 FILES TO MODIFY (40+ files)

#### Core Services
```
✏️ apps/api/src/modules/telephony-engine/services/telephony-manager.service.ts
✏️ apps/api/src/modules/telephony-engine/services/provider-registry.service.ts
✏️ apps/api/src/modules/telephony-engine/services/provider-manager.service.ts
✏️ apps/api/src/modules/telephony-engine/services/call-manager.service.ts
✏️ apps/api/src/modules/telephony-engine/services/recording-manager.service.ts
✏️ apps/api/src/modules/telephony-engine/services/webhook-manager.service.ts
```

#### Campaign Services
```
✏️ apps/api/src/modules/calling-pipeline/services/campaign-execution.service.ts
✏️ apps/api/src/modules/calling-pipeline/services/call-lifecycle.service.ts
✏️ apps/api/src/modules/calling-pipeline/services/queue-execution.service.ts
✏️ apps/api/src/modules/calling-pipeline/services/agent-execution.service.ts
```

#### Call Orchestrator
```
✏️ apps/api/src/modules/call-orchestrator/call-orchestrator.service.ts
✏️ apps/api/src/modules/call-orchestrator/call-orchestrator.module.ts
```

#### Webhooks
```
✏️ apps/api/src/modules/webhooks/webhooks.controller.ts
✏️ apps/api/src/modules/webhooks/webhooks.service.ts
✏️ apps/api/src/modules/webhooks/webhooks.module.ts
```

#### Controllers
```
✏️ apps/api/src/modules/telephony-engine/telephony-engine.controller.ts
✏️ apps/api/src/modules/telephony/telephony.controller.ts
```

#### Modules
```
✏️ apps/api/src/modules/telephony-engine/telephony-engine.module.ts
✏️ apps/api/src/modules/telephony/telephony.module.ts
✏️ apps/api/src/app.module.ts
```

#### Configuration
```
✏️ apps/api/src/config/configuration.ts
✏️ apps/api/.env.example
✏️ .env.example
✏️ docker-compose.yml
```

#### Package Files
```
✏️ apps/api/package.json
✏️ package.json
✏️ apps/voice-ai-engine/requirements.txt (new)
```

#### Database
```
✏️ database/prisma/schema.prisma
✏️ database/seed.ts
```

#### Documentation
```
✏️ README.md
✏️ ARCHITECTURE.md
✏️ API_DOCUMENTATION.md
✏️ DEPLOYMENT.md
```

---

## 🚀 Implementation Steps

### **STEP 1: Setup Foundation** (Priority: P0)

#### 1.1 Update Package Dependencies
```bash
cd apps/api
npm uninstall twilio
npm install @exotel/node-sdk sip.js bullmq ioredis
```

#### 1.2 Setup Python Environment (Voice AI)
```bash
cd apps
mkdir voice-ai-engine
cd voice-ai-engine
python -m venv venv
source venv/bin/activate
pip install faster-whisper kokoro-xtts openai ollama-python flask
```

#### 1.3 Update Environment Variables
Create `.env` with new configuration (remove Twilio vars).

### **STEP 2: Create Indian SIP Provider** (Priority: P0)

This is the **MOST CRITICAL** file. I'll create it now:
- `apps/api/src/modules/telephony-engine/providers/exotel.provider.ts`

### **STEP 3: Create Voice AI Pipeline** (Priority: P0)

Create Python microservice for:
- Whisper STT
- Kokoro TTS
- LLM integration

### **STEP 4: Implement BullMQ Queue** (Priority: P0)

Replace in-memory queue with BullMQ for:
- Better reliability
- Horizontal scaling
- Retry logic
- Rate limiting

### **STEP 5: Update Core Services** (Priority: P1)

Modify existing services to:
- Remove Twilio dependencies
- Use new provider interface
- Handle SIP events
- Process Voice AI results

### **STEP 6: Update Webhooks** (Priority: P1)

Create Exotel webhook handlers:
- Call status updates
- Recording callbacks
- DTMF events
- Error handling

### **STEP 7: Database Migration** (Priority: P1)

Add new tables and columns for SIP and Voice AI tracking.

### **STEP 8: Testing** (Priority: P1)

- Unit tests for new services
- Integration tests with Exotel sandbox
- Load testing
- End-to-end testing

### **STEP 9: Remove Twilio** (Priority: P2)

Only after everything works:
- Delete Twilio provider files
- Remove Twilio SDK
- Clean up Twilio references
- Update documentation

### **STEP 10: Production Deployment** (Priority: P0)

- Canary deployment
- Monitor metrics
- Gradual rollout
- Emergency rollback plan

---

## 📊 Detailed Implementation Breakdown

### File 1: Exotel Provider (CRITICAL)

**Location:** `apps/api/src/modules/telephony-engine/providers/exotel.provider.ts`

**Implements:**
- `ITelephonyProvider` interface
- `makeCall()` - Initiate outbound calls
- `hangupCall()` - Terminate calls
- `getCallStatus()` - Query call status
- `startRecording()` - Begin recording
- `stopRecording()` - End recording
- `playAudio()` - Play audio during call
- Webhook signature validation
- Error handling and retries

**Dependencies:**
- `@exotel/node-sdk` or custom HTTP client
- ConfigService for credentials
- EventEmitter for events
- PrismaService for data persistence

**Size:** ~500-700 lines

---

### File 2: Voice AI Pipeline

**Location:** `apps/voice-ai-engine/main.py`

**Implements:**
- Flask API endpoints
- Whisper STT integration
- Kokoro TTS integration
- LLM integration (OpenAI/Ollama)
- Audio format conversion
- Streaming support
- GPU acceleration

**Size:** ~300-400 lines

---

### File 3: BullMQ Queue Service

**Location:** `apps/api/src/modules/calling-pipeline/services/bullmq-queue.service.ts`

**Implements:**
- Queue initialization
- Job creation
- Job processing
- Retry logic
- Rate limiting
- Concurrency control
- Dead letter queue
- Job monitoring

**Size:** ~400-500 lines

---

## ⚡ Quick Start Commands

```bash
# 1. Install dependencies
cd apps/api
npm install @exotel/node-sdk sip.js bullmq ioredis

# 2. Setup Python Voice AI
cd apps/voice-ai-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Start Redis (for BullMQ)
docker run -d -p 6379:6379 redis:alpine

# 4. Download Voice AI models
python scripts/download_models.py

# 5. Run migrations
cd database
npx prisma migrate dev

# 6. Start services
# Terminal 1: Voice AI Engine
cd apps/voice-ai-engine
python main.py

# Terminal 2: NestJS API
cd apps/api
npm run start:dev

# 7. Test
curl -X POST http://localhost:3001/api/v1/telephony/call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919876543210",
    "campaignId": "xxx"
  }'
```

---

## 🔍 Validation Checklist

Before considering migration complete:

### Functional Tests
- [ ] Can initiate outbound calls to Indian numbers
- [ ] Call status updates received via webhooks
- [ ] Voice AI pipeline processes audio correctly
- [ ] Recordings saved and retrievable
- [ ] Queue processes jobs correctly
- [ ] Retry logic works
- [ ] Error handling graceful
- [ ] DTMF detection works

### Performance Tests
- [ ] <500ms end-to-end latency
- [ ] <100ms Voice AI latency
- [ ] 5+ concurrent calls per worker
- [ ] 100+ calls queued without issues
- [ ] No memory leaks

### Business Tests
- [ ] Cost per call matches expectations
- [ ] Call quality acceptable
- [ ] Indian numbers work
- [ ] Campaign execution successful
- [ ] Runtime monitor updates correctly

### Operational Tests
- [ ] Health checks pass
- [ ] Monitoring alerts work
- [ ] Logs captured correctly
- [ ] Rollback plan tested
- [ ] Documentation updated

---

## 🚨 Risks & Mitigation

### Risk 1: Exotel API Differences
**Impact:** High
**Mitigation:** Thorough API documentation review, sandbox testing

### Risk 2: Voice AI Latency
**Impact:** Medium
**Mitigation:** GPU acceleration, model optimization, caching

### Risk 3: Queue System Failure
**Impact:** High
**Mitigation:** Redis persistence, dead letter queue, monitoring

### Risk 4: Data Loss During Migration
**Impact:** Critical
**Mitigation:** Dual-write pattern, rollback capability, backups

### Risk 5: Call Quality Issues
**Impact:** High
**Mitigation:** Extensive testing, gradual rollout, quality monitoring

---

## 📞 Support & Resources

### Exotel
- Dashboard: https://my.exotel.com
- API Docs: https://developer.exotel.com
- Support: support@exotel.com

### Voice AI
- Whisper: https://github.com/openai/whisper
- Kokoro: https://github.com/kokoro-xtts
- Ollama: https://ollama.ai

### Infrastructure
- BullMQ: https://docs.bullmq.io
- Redis: https://redis.io/docs
- SIP.js: https://sipjs.com

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- ✅ Exotel provider created
- ✅ Voice AI pipeline working
- ✅ Queue system operational
- ✅ Can make test calls end-to-end

### Phase 2 Complete When:
- ✅ All services updated
- ✅ Webhooks working
- ✅ Database migrated
- ✅ Integration tests passing

### Phase 3 Complete When:
- ✅ Twilio code removed
- ✅ No Twilio dependencies
- ✅ Documentation updated
- ✅ Team trained

### Migration Complete When:
- ✅ 100% traffic on new system
- ✅ Cost savings achieved
- ✅ Performance targets met
- ✅ Zero production incidents
- ✅ Twilio account closed

---

**Next Step:** Shall I proceed with creating the Exotel Provider implementation?

This is the most critical file that will serve as the foundation for the entire migration.
