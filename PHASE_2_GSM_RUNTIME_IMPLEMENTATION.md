# Phase 2: GSM Gateway + Runtime Monitor Implementation

**Status:** IN PROGRESS  
**Goal:** Complete backend GSM management + Frontend Runtime Monitor with live updates

---

## 🎯 Implementation Checklist

### ✅ **Completed (Phase 1)**
- [x] Asterisk Provider implementation
- [x] Provider Registry updated
- [x] Database schema for GSM Gateway models added
- [x] Telephony abstraction layer working

### 🔄 **In Progress (Phase 2)**

#### **Backend - GSM Gateway Module**
- [ ] GSM Gateway service (CRUD operations)
- [ ] SIM Manager service (selection algorithm)
- [ ] Channel Manager service (Asterisk integration)
- [ ] GSM Gateway controller (REST API)
- [ ] GSM Gateway DTOs
- [ ] Update Asterisk Provider to use SIM Manager

#### **Backend - Runtime Monitor Socket.IO**
- [ ] Runtime Monitor Gateway (Socket.IO)
- [ ] Real-time event emitters
- [ ] Event subscribers for call lifecycle
- [ ] Dashboard statistics service

#### **Frontend - Runtime Monitor Dashboard**
- [ ] Runtime Monitor page with live updates
- [ ] Call status cards (Queued, Dialing, Connected, etc.)
- [ ] Live transcript display
- [ ] SIM status indicators
- [ ] Queue statistics
- [ ] Campaign progress bars

#### **Frontend - Enhanced Dashboard**
- [ ] Today's calls statistics
- [ ] Active campaigns display
- [ ] Success/Failure rate charts
- [ ] Top performing campaigns
- [ ] Live call counter

---

## 📁 File Structure

```
apps/api/src/modules/
├── gsm-gateway/
│   ├── gsm-gateway.module.ts
│   ├── gsm-gateway.controller.ts
│   ├── services/
│   │   ├── gsm-manager.service.ts
│   │   ├── sim-manager.service.ts
│   │   └── channel-manager.service.ts
│   └── dto/
│       ├── create-gateway.dto.ts
│       ├── create-sim.dto.ts
│       └── sim-selection.dto.ts
│
└── runtime-monitor/
    ├── runtime-monitor.module.ts
    ├── runtime-monitor.gateway.ts
    └── services/
        ├── realtime-events.service.ts
        └── dashboard-stats.service.ts

apps/web/src/app/dashboard/
├── runtime-monitor/
│   ├── page.tsx
│   ├── components/
│   │   ├── call-status-card.tsx
│   │   ├── live-transcript.tsx
│   │   ├── sim-status-indicator.tsx
│   │   └── queue-stats.tsx
│   └── hooks/
│       └── use-socket.ts
│
└── components/
    ├── dashboard-stats.tsx
    └── live-call-counter.tsx
```

---

## 🚀 Implementation Priority

### **Priority 1: GSM Gateway Backend (Critical)**
1. SIM Manager Service - SIM selection algorithm
2. Update Asterisk Provider to query SIM Manager
3. GSM Gateway Controller for CRUD operations

### **Priority 2: Runtime Monitor Socket.IO (Critical)**
1. Socket.IO Gateway setup
2. Event emitters for call lifecycle
3. Real-time event broadcasting

### **Priority 3: Runtime Monitor Frontend (Critical)**
1. Runtime Monitor page with Socket.IO client
2. Live call status display
3. Real-time transcript updates
4. SIM status indicators

### **Priority 4: Enhanced Dashboard (Important)**
1. Statistics cards
2. Live counters
3. Charts and graphs

---

## 📊 Runtime Monitor UI Design

```
┌─────────────────────────────────────────────────────────┐
│  Runtime Monitor                              🔴 LIVE   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  Queued  │  │ Dialing  │  │Connected │  │ Active ││
│  │    12    │  │    3     │  │    5     │  │   8    ││
│  └──────────┘  └──────────┘  └──────────┘  └────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Active Calls                                     │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ 📞 +919876543210 │ 🤖 AI Speaking │ SIM-1 │ 0:45│  │
│  │ Transcript: "Can I know your budget preference?"│  │
│  ├─────────────────────────────────────────────────┤  │
│  │ 📞 +919876543211 │ 👤 Customer   │ SIM-2 │ 1:20│  │
│  │ Transcript: "I am looking for a 2BHK apartment" │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ SIM Status   │  │ Queue Status │  │ Campaign    │ │
│  │ SIM-1: ●     │  │ Waiting: 45  │  │ Active: 3   │ │
│  │ SIM-2: ●     │  │ Active: 8    │  │ Paused: 1   │ │
│  │ SIM-3: ⚠     │  │ Failed: 2    │  │ Complete: 5 │ │
│  │ SIM-4: ○     │  └──────────────┘  └─────────────┘ │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 Socket.IO Events

### **Events from Server → Client**

```typescript
// Campaign events
'campaign:started'    { campaignId, name, contactCount }
'campaign:paused'     { campaignId, reason }
'campaign:completed'  { campaignId, stats }

// Call events
'call:queued'         { callId, contactId, position }
'call:dialing'        { callId, contactId, simId }
'call:connected'      { callId, duration }
'call:completed'      { callId, outcome, duration }
'call:failed'         { callId, reason }

// Transcript events
'call:transcript'     { callId, text, speaker, timestamp }
'call:ai_thinking'    { callId, isThinking }

// SIM events
'sim:status_change'   { simId, status, signal }
'sim:call_started'    { simId, callId }
'sim:call_ended'      { simId, callId }

// Queue events
'queue:stats'         { waiting, active, completed, failed }

// System events
'system:stats'        { activeCalls, queueSize, simStatus }
```

### **Events from Client → Server**

```typescript
// Subscribe to specific campaign
'subscribe:campaign'  { campaignId }

// Subscribe to all events
'subscribe:all'       { companyId }

// Request current stats
'get:stats'           { }
```

---

## 🧪 Testing Plan

### **GSM Gateway Tests**
```bash
# 1. Create GSM Gateway
POST /api/v1/gsm-gateway
{
  "name": "Gateway-1",
  "ipAddress": "192.168.1.100",
  "totalPorts": 4
}

# 2. Add SIM Cards
POST /api/v1/gsm-gateway/{gatewayId}/sims
{
  "simNumber": "9876543210",
  "operator": "Jio",
  "portNumber": 1
}

# 3. Get Available SIM
GET /api/v1/gsm-gateway/sims/available?operator=Jio

# 4. Get SIM Stats
GET /api/v1/gsm-gateway/sims/{simId}/stats
```

### **Runtime Monitor Tests**
```bash
# 1. Connect to Socket.IO
const socket = io('http://localhost:3001/runtime');

# 2. Subscribe to events
socket.on('call:dialing', (data) => {
  console.log('Call dialing:', data);
});

# 3. Emit subscription
socket.emit('subscribe:all', { companyId: 'xxx' });

# 4. Test real-time updates
# Start a campaign and watch events flow
```

---

## 💾 Database Migration

```bash
# Generate migration
npx prisma migrate dev --name add_gsm_gateway_models

# Apply migration
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

---

## 📝 Next Steps After Phase 2

1. **Local AI Pipeline Integration**
   - Faster Whisper STT service
   - Ollama LLM integration
   - Kokoro TTS service

2. **BullMQ Queue System**
   - Redis-based job queue
   - Retry logic
   - Concurrency control

3. **Call Recording & Transcription**
   - Store recordings
   - Generate transcripts
   - Store in database

4. **Analytics Dashboard**
   - Campaign analytics
   - Call analytics
   - SIM usage analytics
   - Charts and graphs

---

## 🎯 Success Criteria

- [ ] GSM Gateway CRUD operations working
- [ ] SIM cards can be added/managed
- [ ] SIM selection algorithm chooses optimal SIM
- [ ] Asterisk provider uses selected SIM
- [ ] Socket.IO server emits real-time events
- [ ] Frontend Runtime Monitor displays live updates
- [ ] Call status updates in real-time
- [ ] Transcripts appear live
- [ ] SIM status indicators update
- [ ] Queue statistics update
- [ ] Dashboard shows today's statistics
- [ ] All APIs working end-to-end
