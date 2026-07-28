# Immediate Next Steps - Telephony Engine

## Current Status ✅

### Completed:
1. ✅ Campaign Workflow Redesign (telephony profiles + contact upload)
2. ✅ Database schema updated (telephony_profiles, campaign_contacts, campaign_uploads)
3. ✅ TypeScript import errors fixed
4. ✅ Implementation plan documented
5. ✅ Existing architecture analyzed

### What's Ready:
- Database tables: `gsm_gateways`, `sim_cards`, `telephony_profiles`
- Provider interface: `ITelephonyProvider`
- Basic Asterisk provider (needs enhancement)
- Provider manager with multi-provider support
- Campaign execution pipeline (already exists)

---

## What Needs to Be Done Now

### Phase 1: Core Services (START HERE)

The telephony engine needs these 3 critical services before it can work with real GSM Gateways:

#### 1. **Gateway Manager Service** (2-3 hours)
**Purpose:** Manage GSM Gateway connections and health

**File to create:** `apps/api/src/modules/telephony-engine/services/gateway-manager.service.ts`

**Key features:**
- Load gateways from database
- Check gateway health (ping, connectivity)
- Select best available gateway
- Handle gateway failover

#### 2. **SIM Manager Service** (2-3 hours)
**Purpose:** Manage SIM card selection and limits

**File to create:** `apps/api/src/modules/telephony-engine/services/sim-manager.service.ts`

**Key features:**
- Load SIMs for a gateway
- Select best SIM (signal, availability, limits)
- Track daily call limits
- Release SIM after call

#### 3. **Connection Manager Service** (2-3 hours)
**Purpose:** Maintain persistent Asterisk AMI connections

**File to create:** `apps/api/src/modules/telephony-engine/services/connection-manager.service.ts`

**Key features:**
- Maintain connection pool
- Auto-reconnect on disconnect
- Connection health checks
- Connection pooling per gateway

---

### Phase 2: Enhanced Asterisk Provider (3-4 hours)

**File to modify:** `apps/api/src/modules/telephony-engine/providers/asterisk.provider.ts`

**Changes needed:**
1. Integrate with Gateway Manager
2. Integrate with SIM Manager
3. Use Connection Manager for AMI
4. Proper channel selection (PJSIP/SIM)
5. Real-time event emission
6. Database updates

---

### Phase 3: Integration (2-3 hours)

**Files to modify:**
1. `apps/api/src/modules/calling-pipeline/services/queue-execution.service.ts`
   - Load telephony profile
   - Pass to Asterisk provider

2. `apps/api/src/modules/call-orchestrator/call-orchestrator.service.ts`
   - Use Asterisk instead of Twilio
   - Handle GSM-specific states

---

## Quick Start Commands

### 1. Stop Dev Server
```powershell
# Press Ctrl+C in the terminal running npm run dev:api
```

### 2. Clean Build
```powershell
.\restart-api-dev.ps1
```

### 3. Apply Migration (if not done)
```powershell
npm run db:generate
npm run db:migrate
```

### 4. Verify Schema
```powershell
cd database/prisma
npx prisma studio
```

Check these tables exist:
- `gsm_gateways`
- `sim_cards`
- `telephony_profiles`
- `campaign_contacts`
- `campaign_uploads`

### 5. Rebuild and Start
```powershell
cd apps/api
npm run build
npm run dev
```

---

## Implementation Order

### Today (Session 1): Core Infrastructure
1. ✅ Fix TypeScript errors (DONE)
2. ✅ Create implementation plan (DONE)
3. ⏭️ Implement Gateway Manager Service
4. ⏭️ Implement SIM Manager Service
5. ⏭️ Implement Connection Manager Service

### Tomorrow (Session 2): Asterisk Enhancement
1. Enhance Asterisk Provider
2. Add ARI support
3. Implement audio streaming basics

### Day 3 (Session 3): Integration
1. Integrate with Queue Worker
2. Update Call Orchestrator
3. Add Socket.IO events

### Day 4 (Session 4): Testing
1. End-to-end test
2. Load testing
3. Failover testing

---

## Quick Reference

### File Locations
```
apps/api/src/modules/
├── telephony-engine/
│   ├── services/
│   │   ├── gateway-manager.service.ts        ⏭️ TO CREATE
│   │   ├── sim-manager.service.ts            ⏭️ TO CREATE
│   │   ├── connection-manager.service.ts     ⏭️ TO CREATE
│   │   ├── telephony-manager.service.ts      ✅ EXISTS
│   │   ├── call-manager.service.ts           ✅ EXISTS
│   │   └── ...
│   ├── providers/
│   │   ├── asterisk.provider.ts              ⚠️ NEEDS ENHANCEMENT
│   │   ├── freeswitch.provider.ts            ⏭️ TO CREATE
│   │   └── ...
│   └── telephony-engine.module.ts            ⚠️ REGISTER NEW SERVICES
│
├── calling-pipeline/
│   ├── services/
│   │   ├── queue-execution.service.ts        ⚠️ NEEDS UPDATE
│   │   └── campaign-execution.service.ts     ✅ EXISTS
│   └── ...
│
├── call-orchestrator/
│   └── call-orchestrator.service.ts          ⚠️ NEEDS UPDATE
│
└── telephony-profile/                        ✅ NEW MODULE (DONE)
    └── ...
```

### Environment Variables to Add
```bash
# .env
ASTERISK_HOST=192.168.1.100
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your_secret
ASTERISK_CONTEXT=ai-calling
```

---

## Testing Approach

### Phase 1: Unit Tests
Each service should have:
- Happy path tests
- Error handling tests
- Edge case tests

### Phase 2: Integration Tests
- Gateway → SIM selection
- Connection → AMI call
- Complete call flow

### Phase 3: Manual Testing
- Test with physical GSM Gateway
- Multiple concurrent calls
- SIM failover
- Network disconnect recovery

---

## Expected Behavior After Implementation

### When User Clicks "Start Campaign":

1. **Validation**
   ```
   ✓ Campaign exists
   ✓ Telephony profile selected
   ✓ Gateway online
   ✓ SIM available
   ✓ Contacts uploaded
   ```

2. **Queue Creation**
   ```
   ✓ BullMQ jobs created
   ✓ Each job has contact + telephony profile
   ✓ Workers start processing
   ```

3. **Call Execution (Per Contact)**
   ```
   ✓ Load telephony profile
   ✓ Select gateway (Gateway Manager)
   ✓ Select SIM (SIM Manager)
   ✓ Get AMI connection (Connection Manager)
   ✓ Originate call via Asterisk
   ✓ Channel: PJSIP/{simPort}/gsm-gateway
   ✓ Caller ID: Physical SIM number
   ✓ Customer receives call from real SIM
   ```

4. **Real-time Updates**
   ```
   ✓ Socket.IO emits call states
   ✓ Dashboard shows live progress
   ✓ Recording starts automatically
   ✓ Transcript generated
   ```

---

## Troubleshooting

### Issue: "Asterisk AMI connection failed"
**Solution:**
1. Check `ASTERISK_HOST` and `ASTERISK_AMI_PORT`
2. Verify AMI credentials in `/etc/asterisk/manager.conf`
3. Ensure Asterisk is running: `asterisk -r`
4. Test AMI: `telnet localhost 5038`

### Issue: "No available SIM"
**Solution:**
1. Check SIMs registered: `SELECT * FROM sim_cards WHERE isActive = 1`
2. Verify gateway online: `SELECT * FROM gsm_gateways WHERE isOnline = 1`
3. Check daily limits: `callsToday < dailyLimit`

### Issue: "Call fails immediately"
**Solution:**
1. Check Asterisk dialplan: `/etc/asterisk/extensions.conf`
2. Verify SIP trunk configuration
3. Check GSM Gateway registration: `sip show peers` in Asterisk
4. Review Asterisk logs: `/var/log/asterisk/full`

---

## Documentation Created

1. ✅ **CAMPAIGN_WORKFLOW_REDESIGN.md** - Complete workflow redesign
2. ✅ **FRONTEND_INTEGRATION_GUIDE.md** - React integration guide
3. ✅ **FIX_TYPESCRIPT_ERRORS.md** - TypeScript troubleshooting
4. ✅ **QUICK_START.md** - Getting started guide
5. ✅ **TELEPHONY_ENGINE_IMPLEMENTATION.md** - Complete implementation plan
6. ✅ **IMMEDIATE_NEXT_STEPS.md** - This file

---

## Ready to Proceed?

The foundation is complete. Now we need to:

1. **Compile successfully** (fix any remaining TS errors)
2. **Implement 3 core services** (Gateway, SIM, Connection managers)
3. **Enhance Asterisk provider**
4. **Integrate with campaign execution**

**Estimated Time:** 8-12 hours of implementation + 4-6 hours testing

**Next command to run:**
```powershell
# Clean and rebuild
.\restart-api-dev.ps1
cd apps/api
npm run build
```

If build is successful, we're ready to implement the core services! 🚀
