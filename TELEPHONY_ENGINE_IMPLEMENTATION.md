# Telephony Engine - Production Implementation Plan

## Status: 🚧 IN PROGRESS

## Overview

Implement production-ready telephony engine for real AI outbound calling using:
- **Asterisk** (AMI + ARI)
- **FreeSWITCH** (ESL) - Optional
- **GSM Gateway** (Physical hardware)
- **Physical SIM cards**
- **Real-time audio streaming**

## Current State Analysis

### ✅ Already Implemented
1. **Provider Interface** - Complete abstraction (`ITelephonyProvider`)
2. **Asterisk Provider** - Basic AMI implementation (needs enhancement)
3. **Provider Manager** - Multi-provider support
4. **Call Manager** - Basic call operations
5. **Session Manager** - Call session tracking
6. **Recording Manager** - Recording retrieval
7. **Webhook Manager** - Event processing
8. **Database Models** - GSMGateway, SIMCard (already in schema)
9. **Telephony Profile** - GSM + SIM selection (just added)

### ⚠️ Needs Enhancement
1. **Asterisk Provider** - Add ARI support, real audio streaming
2. **GSM Gateway Integration** - Complete SIM management
3. **Audio Streaming Service** - Bidirectional RTP
4. **Call State Machine** - Production-ready state transitions
5. **Health Monitoring** - Gateway/SIM health checks
6. **Error Handling** - Comprehensive retry logic

### ❌ Missing Components
1. **FreeSWITCH Provider** - Complete implementation
2. **Audio Streaming Service** - WebRTC/RTP handling
3. **Gateway Manager Service** - Gateway registration & health
4. **SIM Manager Service** - SIM selection & rotation
5. **Channel Manager Service** - Asterisk channel management
6. **Connection Manager** - Persistent connections with reconnect
7. **Real-time Events** - Socket.IO integration

---

## Implementation Tasks

### Phase 1: Core Infrastructure (Priority 1)

#### Task 1.1: Fix Import Paths ✅ DONE
- [x] Fixed `CurrentUser` decorator imports
- [x] Fixed `JwtAuthGuard` imports
- [x] Cleared build cache

#### Task 1.2: Gateway Manager Service
**File:** `apps/api/src/modules/telephony-engine/services/gateway-manager.service.ts`

**Responsibilities:**
- Register GSM Gateways
- Health monitoring
- Gateway selection
- Failover handling

**Key Methods:**
```typescript
- registerGateway(gateway: GSMGateway): Promise<void>
- getAvailableGateways(): Promise<GSMGateway[]>
- getGatewayById(id: string): Promise<GSMGateway>
- checkGatewayHealth(id: string): Promise<HealthStatus>
- selectBestGateway(): Promise<GSMGateway>
- markGatewayOffline(id: string): Promise<void>
```

#### Task 1.3: SIM Manager Service
**File:** `apps/api/src/modules/telephony-engine/services/sim-manager.service.ts`

**Responsibilities:**
- SIM registration
- SIM selection based on availability
- Call limits enforcement
- Signal strength monitoring

**Key Methods:**
```typescript
- registerSIM(sim: SIMCard): Promise<void>
- getAvailableSIMs(gatewayId: string): Promise<SIMCard[]>
- selectBestSIM(gatewayId: string): Promise<SIMCard>
- incrementCallCount(simId: string): Promise<void>
- checkSIMHealth(simId: string): Promise<HealthStatus>
- enforceDailyLimit(simId: string): Promise<boolean>
```

#### Task 1.4: Connection Manager Service
**File:** `apps/api/src/modules/telephony-engine/services/connection-manager.service.ts`

**Responsibilities:**
- Maintain persistent AMI connections
- Auto-reconnect on disconnect
- Connection pooling
- Health checks

**Key Methods:**
```typescript
- connect(gateway: GSMGateway): Promise<Connection>
- disconnect(gatewayId: string): Promise<void>
- reconnect(gatewayId: string): Promise<void>
- getConnection(gatewayId: string): Connection
- healthCheck(gatewayId: string): Promise<boolean>
```

---

### Phase 2: Enhanced Asterisk Provider (Priority 1)

#### Task 2.1: Complete Asterisk AMI Integration
**File:** `apps/api/src/modules/telephony-engine/providers/asterisk.provider.ts`

**Enhancements:**
1. **Multi-Gateway Support**
   - Select gateway based on telephony profile
   - Use Connection Manager for connections

2. **SIM Selection**
   - Integrate with SIM Manager
   - Route calls through correct SIM
   - Channel format: `PJSIP/${sim.portNumber}/gsm-gateway`

3. **Real Event Handling**
   - Emit Socket.IO events for all call states
   - Update database in real-time
   - Handle all Asterisk events properly

4. **Recording Management**
   - MixMonitor for stereo recording
   - Store recordings in configured path
   - Generate download URLs

#### Task 2.2: Add ARI Support
**File:** `apps/api/src/modules/telephony-engine/providers/asterisk-ari.service.ts`

**Why ARI?**
- RESTful control over calls
- WebSocket real-time events
- Better for audio streaming
- More modern than AMI

**Key Features:**
```typescript
- originateCall(params): Promise<Channel>
- answerChannel(channelId): Promise<void>
- playAudio(channelId, url): Promise<void>
- streamAudio(channelId): Promise<AudioStream>
- hangupChannel(channelId): Promise<void>
- subscribeToEvents(): WebSocket
```

#### Task 2.3: Channel Manager Service
**File:** `apps/api/src/modules/telephony-engine/services/channel-manager.service.ts`

**Responsibilities:**
- Track Asterisk channels
- Map channels to calls
- Handle bridge creation
- Audio routing

---

### Phase 3: Audio Streaming (Priority 2)

#### Task 3.1: Audio Streaming Service
**File:** `apps/api/src/modules/telephony-engine/services/audio-streaming.service.ts`

**Features:**
- Bidirectional RTP streaming
- WebSocket audio bridge
- Buffer management
- Silence detection

**Integration Points:**
```
Asterisk Channel
  ↓
RTP Stream
  ↓
Audio Streaming Service
  ↓
Whisper STT → Ollama → Kokoro TTS
  ↓
RTP Stream
  ↓
Asterisk Channel
  ↓
Customer
```

#### Task 3.2: RTP Handler
**File:** `apps/api/src/modules/telephony-engine/services/rtp-handler.service.ts`

**Responsibilities:**
- Parse RTP packets
- Extract audio data
- Queue for STT
- Send TTS audio back

---

### Phase 4: FreeSWITCH Provider (Priority 3)

#### Task 4.1: FreeSWITCH Provider Implementation
**File:** `apps/api/src/modules/telephony-engine/providers/freeswitch.provider.ts`

**Features:**
- ESL (Event Socket Layer) connection
- Originate calls via `bgapi originate`
- Event handling
- Recording management

**Why FreeSWITCH?**
- Better performance for high-volume
- More flexible dialplan
- Better codec support
- Advanced routing

---

### Phase 5: Call State Management (Priority 1)

#### Task 5.1: Enhanced Call State Machine
**File:** `apps/api/src/modules/telephony-engine/services/call-state-machine.service.ts`

**States:**
```
QUEUED
  ↓
VALIDATING
  ↓
SELECTING_GATEWAY
  ↓
SELECTING_SIM
  ↓
DIALING
  ↓
RINGING
  ↓
CONNECTED
  ↓
AI_INITIALIZING
  ↓
LISTENING
  ↓
THINKING
  ↓
SPEAKING
  ↓
WAITING
  ↓
COMPLETED / FAILED
```

**Features:**
- State validation
- Transition logging
- Event emission
- Database updates

---

### Phase 6: Integration with Campaign Execution (Priority 1)

#### Task 6.1: Update Queue Worker
**File:** `apps/api/src/modules/calling-pipeline/services/queue-execution.service.ts`

**Changes:**
1. Load telephony profile from campaign
2. Select gateway + SIM
3. Pass to Asterisk provider
4. Handle call states
5. Update campaign contact status

#### Task 6.2: Update Call Orchestrator
**File:** `apps/api/src/modules/call-orchestrator/call-orchestrator.service.ts`

**Changes:**
1. Use telephony profile instead of Twilio
2. Route through Asterisk provider
3. Handle GSM-specific states
4. Manage recordings

---

### Phase 7: Socket.IO Real-time Updates (Priority 2)

#### Task 7.1: Telephony Events Gateway
**File:** `apps/api/src/modules/telephony-engine/services/telephony-events.gateway.ts`

**Events to Emit:**
```typescript
// Gateway Events
'gateway.connected'
'gateway.disconnected'
'gateway.health_check'

// SIM Events
'sim.registered'
'sim.offline'
'sim.limit_reached'

// Call Events
'call.dialing'
'call.ringing'
'call.connected'
'call.ai_speaking'
'call.customer_speaking'
'call.completed'
'call.failed'

// Recording Events
'recording.started'
'recording.stopped'
'recording.ready'
```

---

### Phase 8: Health Monitoring (Priority 2)

#### Task 8.1: Health Monitor Service
**File:** `apps/api/src/modules/telephony-engine/services/health-monitor.service.ts`

**Features:**
- Periodic health checks (every 30s)
- Gateway connectivity
- SIM registration status
- Signal strength monitoring
- Alert on failures

#### Task 8.2: Health Dashboard Endpoint
**Route:** `GET /api/v1/telephony/health/dashboard`

**Response:**
```json
{
  "gateways": [
    {
      "id": "gateway-1",
      "name": "Dinstar UC2000",
      "status": "online",
      "uptime": 86400,
      "activeCalls": 5,
      "sims": [
        {
          "id": "sim-1",
          "number": "7220XXXXXX",
          "operator": "Airtel",
          "signal": 85,
          "callsToday": 45,
          "status": "active"
        }
      ]
    }
  ],
  "totalCalls": 120,
  "activeCalls": 5,
  "failedCalls": 3,
  "averageDuration": 180
}
```

---

### Phase 9: Configuration & Environment (Priority 1)

#### Task 9.1: Environment Variables
**File:** `.env`

```bash
# Asterisk Configuration
ASTERISK_HOST=192.168.1.100
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your_secret
ASTERISK_ARI_PORT=8088
ASTERISK_ARI_USERNAME=ari_user
ASTERISK_ARI_PASSWORD=ari_pass
ASTERISK_CONTEXT=ai-calling
ASTERISK_EXTENSION=s

# FreeSWITCH Configuration (Optional)
FREESWITCH_HOST=192.168.1.101
FREESWITCH_ESL_PORT=8021
FREESWITCH_ESL_PASSWORD=ClueCon

# Recording Configuration
RECORDING_ENABLED=true
RECORDING_PATH=/var/spool/asterisk/monitor
RECORDING_FORMAT=wav
RECORDING_STEREO=true

# Call Configuration
TELEPHONY_ENGINE_PROVIDER=asterisk
TELEPHONY_ENGINE_MAX_CONCURRENT_CALLS=100
TELEPHONY_ENGINE_CALL_TIMEOUT=60
TELEPHONY_ENGINE_RETRY_ATTEMPTS=3
TELEPHONY_ENGINE_RETRY_DELAY=300

# Health Monitoring
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_ENABLED=true
```

---

## Database Changes

### No New Tables Needed ✅
All required tables already exist:
- `gsm_gateways`
- `sim_cards`
- `telephony_profiles`
- `campaigns`
- `campaign_contacts`
- `calls`
- `call_transcripts`
- `call_recordings`

### Potential Indexes to Add
```sql
CREATE INDEX idx_sim_cards_gateway_active 
ON sim_cards(gatewayId, isActive, status);

CREATE INDEX idx_gsm_gateways_company_online 
ON gsm_gateways(companyId, isOnline, status);
```

---

## Testing Strategy

### Unit Tests
- [ ] Gateway Manager Service
- [ ] SIM Manager Service
- [ ] Connection Manager Service
- [ ] Asterisk Provider (enhanced)
- [ ] Call State Machine

### Integration Tests
- [ ] End-to-end call flow
- [ ] Gateway failover
- [ ] SIM rotation
- [ ] Recording retrieval
- [ ] Error handling

### Manual Testing
- [ ] Physical GSM Gateway test
- [ ] Multiple SIMs test
- [ ] Concurrent calls test
- [ ] Long duration test
- [ ] Network failure test

---

## Deployment Checklist

### Prerequisites
- [ ] Asterisk installed and configured
- [ ] GSM Gateway registered
- [ ] SIMs inserted and registered
- [ ] Network connectivity verified
- [ ] Recording path created
- [ ] Redis running
- [ ] BullMQ configured

### Configuration
- [ ] Environment variables set
- [ ] Asterisk AMI credentials configured
- [ ] Gateway IP/ports configured
- [ ] SIM cards registered in database
- [ ] Telephony profiles created

### Verification
- [ ] AMI connection successful
- [ ] Gateway health check passes
- [ ] SIM registration verified
- [ ] Test call successful
- [ ] Recording saved correctly
- [ ] Real-time events working

---

## Priority Order

### Immediate (This Session)
1. ✅ Fix TypeScript errors
2. ✅ Document implementation plan
3. 🚧 Gateway Manager Service
4. 🚧 SIM Manager Service
5. 🚧 Connection Manager Service
6. 🚧 Enhanced Asterisk Provider
7. 🚧 Integration with Queue Worker

### Next Session
1. Audio Streaming Service
2. FreeSWITCH Provider
3. Socket.IO Events
4. Health Monitoring
5. Complete testing

---

## Success Criteria

✅ **Complete** when:
1. Campaign can be started
2. Contacts loaded from uploaded file
3. Telephony profile selected
4. Gateway + SIM automatically chosen
5. Call placed through Asterisk
6. Physical SIM used as caller ID
7. Audio streams to/from AI
8. Recording saved
9. Call status updated in real-time
10. Dashboard shows live stats

---

## Next Steps

1. Implement Gateway Manager Service
2. Implement SIM Manager Service
3. Implement Connection Manager Service
4. Enhance Asterisk Provider
5. Test end-to-end flow

Let's begin implementation! 🚀
