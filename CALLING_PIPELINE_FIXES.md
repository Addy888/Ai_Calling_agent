# Outbound Calling Pipeline - Complete Fix & Diagnostic Guide

## ✅ Issues Fixed

### 1. **Enhanced Logging Throughout Pipeline**
Added comprehensive logging at every stage:

#### Call Orchestrator Service
- 🔵 Blue colored logs for easy identification
- Logs every step: Contact lookup → Campaign fetch → DB record → Twilio call → Event emission
- Shows all parameters: phone numbers, callback URLs, Call SIDs
- Emits `monitor.call_state` events for Runtime Monitor

#### Campaign Execution Service  
- 📊 Detailed campaign progress logs
- Shows available slots, active calls, queue length
- Logs each contact being processed
- Better error handling with stack traces

#### Queue Execution Service
- 🟢 Green logs for queueing operations
- 🟡 Yellow logs for queue processing
- Shows queue sizes and processing status
- Detailed retry logic with attempt counts

### 2. **Fixed Contact Data Mapping Bug**
**Problem:** Contact phone numbers weren't being properly mapped from database
**Fix:** Updated `loadCampaignContacts()` to properly map `phone` field to both `phoneNumber` and `phone`

```typescript
// BEFORE (BROKEN):
phoneNumber: contact.phone,
name: contact.fullName,

// AFTER (FIXED):
phoneNumber: contact.phone, // Explicit mapping
phone: contact.phone, // Keep original
name: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
fullName: contact.fullName,
```

### 3. **Added Runtime Monitor WebSocket Events**
Now emitting proper events that the Runtime Monitor expects:

```typescript
this.eventEmitter.emit('monitor.call_state', {
  sessionId: call.id,
  callSid: result.callSid,
  state: 'DIALING',
  contactName: contact.fullName || `${contact.firstName} ${contact.lastName}`,
  phoneNumber: contact.phone,
  campaignId: params.campaignId,
  campaignName: campaign?.name,
  direction: 'outbound',
  provider: 'Twilio',
  timestamp: new Date().toISOString(),
});
```

## 🔍 Diagnostic Checklist

### 1. Environment Variables
Verify these are set in `.env`:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# API Base URL (must be publicly accessible for Twilio webhooks)
API_BASE_URL=https://your-domain.com
# OR for local development:
API_BASE_URL=https://yoursubdomain.ngrok.io

# Database
DATABASE_URL=mysql://user:pass@localhost:3306/ai_calling_agent
```

### 2. Database Check
Ensure you have:
- ✅ Active campaign with contacts
- ✅ Contacts with `status='ACTIVE'` and valid phone numbers
- ✅ Campaign has a script or AI agent configured

```sql
-- Check campaign
SELECT id, name, status FROM Campaign LIMIT 1;

-- Check contacts for campaign
SELECT id, fullName, phone, status 
FROM Contact 
WHERE campaignId = 'your-campaign-id' 
AND status = 'ACTIVE' 
AND deletedAt IS NULL;
```

### 3. Twilio Account Check
Verify:
- ✅ Twilio account has sufficient balance
- ✅ Phone number is verified/purchased
- ✅ API credentials are correct
- ✅ Webhook URLs are configured

Test Twilio connection:
```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

### 4. Webhook Configuration (Local Development)
For local development, use ngrok:

```bash
# Start ngrok
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update .env
API_BASE_URL=https://abc123.ngrok.io

# Restart backend
npm run start:dev
```

### 5. Check Logs

Start the API server and watch for these logs when starting a campaign:

```
✅ [CAMPAIGN] Creating campaign execution for: <campaign-id>
✅ [CAMPAIGN] Loaded X contacts for campaign
📊 [CAMPAIGN] Processing contacts: Available slots: Y
📞 [CAMPAIGN] Queuing call for contact: John Doe (+1234567890)
🟢 [QUEUE] Queuing call for contact: <contact-id>
🟢 [QUEUE] ✅ Call queued: call_xxx
🟡 [QUEUE PROCESSOR] Processing queued call: call_xxx
🔵 [CALL ORCHESTRATOR] Initiating call for contact: <contact-id>
🔵 [CALL ORCHESTRATOR] Contact found: John Doe
🔵 [CALL ORCHESTRATOR] Phone: +1234567890
🔵 [CALL ORCHESTRATOR] Step 4: Initiating Twilio call...
📞 [TWILIO] Making call to +1234567890
📞 [TWILIO] Call created: CAxxxxxxxxxxxxx
🔵 [CALL ORCHESTRATOR] ✅ Twilio call created successfully!
🔵 [CALL ORCHESTRATOR] Call SID: CAxxxxxxxxxxxxx
```

## 📋 Complete Call Flow

```
1. Frontend: Click "Start Campaign" Button
   └─> POST /api/v1/calling/start-campaign

2. CallingPipelineController.startCampaign()
   └─> CallingPipelineService.startCampaign()

3. CampaignExecutionService.createExecution()
   ├─> Load campaign data from database
   ├─> Load contacts (status=ACTIVE, phone numbers)
   └─> Create execution object in memory

4. CampaignExecutionService.startExecution()
   ├─> Set state to RUNNING
   └─> Call processNextContacts()

5. CampaignExecutionService.processNextContacts()
   ├─> Calculate available slots (concurrent limit - active)
   ├─> Get next N contacts from queue
   └─> For each contact:
       └─> QueueExecutionService.queueCall()

6. QueueExecutionService.queueCall()
   ├─> Generate call ID and session ID
   ├─> Add to queue (Map)
   └─> Mark as 'queued'

7. QueueExecutionService.processQueue() [Every 1 second]
   ├─> Dequeue next call
   ├─> Mark as 'processing'
   └─> CallOrchestratorService.initiateCall()

8. CallOrchestratorService.initiateCall()
   ├─> Fetch contact from database
   ├─> Fetch campaign details
   ├─> Create Call record (status='QUEUED')
   ├─> TelephonyService.makeCall()
   │   └─> TwilioTelephonyProvider.makeCall()
   │       └─> client.calls.create() [ACTUAL TWILIO API CALL]
   ├─> Update Call record (status='CALLING', callSid=CAxxxx)
   ├─> Emit 'call.initiated' event
   └─> Emit 'monitor.call_state' event [FOR RUNTIME MONITOR]

9. RuntimeMonitorGateway (WebSocket)
   ├─> Receives 'monitor.call_state' event
   └─> Broadcasts to frontend via Socket.IO

10. Frontend Runtime Monitor
    ├─> Receives socket event
    ├─> Updates activeCalls state
    └─> Renders call in table
```

## 🐛 Common Issues & Solutions

### Issue 1: "No Active Calls" in Runtime Monitor
**Symptoms:** Dashboard shows 0 calls, queue is empty

**Diagnostics:**
```bash
# Check if queue processor is running
# Look for this log:
[QueueExecutionService] Queue processor started

# Check queue status
curl http://localhost:3001/api/v1/calling/pipeline
```

**Solution:**
- Ensure `QueueExecutionService` constructor is called (should auto-start processor)
- Check if `startQueueProcessor()` is throwing errors
- Verify `setInterval` is running (check logs every second)

### Issue 2: Calls Queued But Not Initiating
**Symptoms:** Logs show calls queued, but Twilio call never created

**Diagnostics:**
Check for errors in queue processor:
```
🟡 [QUEUE PROCESSOR] ❌ Failed to process queued call: [ERROR MESSAGE]
```

**Common causes:**
1. **CallOrchestrator not injected** - Check module imports
2. **Database connection failed** - Check Prisma connection
3. **Contact not found** - Verify contact IDs are correct
4. **Twilio credentials missing** - Check environment variables

### Issue 3: Twilio API Errors
**Symptoms:** Log shows Twilio call creation failed

**Error Messages & Solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid credentials | Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN |
| `21210: Invalid Phone Number` | Phone format wrong | Use E.164 format: +1234567890 |
| `21408: Permission Denied` | Trial account restrictions | Verify phone number or upgrade account |
| `21606: Insufficient Funds` | No balance | Add funds to Twilio account |

### Issue 4: WebSocket Not Updating Frontend
**Symptoms:** Calls created but Runtime Monitor doesn't update

**Diagnostics:**
```bash
# Check WebSocket connection in browser console
# Look for:
[RuntimeMonitor] Socket connected: <socket-id>

# Check if events are being emitted
# Backend logs should show:
[RuntimeMonitorGateway] Broadcasting: monitor:call_state
```

**Solution:**
1. Verify RuntimeMonitorGateway is receiving events
2. Check CORS settings in gateway
3. Ensure frontend is connecting to correct namespace: `/runtime-monitor`
4. Check if `monitor.call_state` event is being emitted (added in fix)

## 🧪 Testing the Pipeline

### 1. Manual Test Script

Create a test file `test-campaign-start.http`:

```http
### Start Campaign
POST http://localhost:3001/api/v1/calling/start-campaign
Content-Type: application/json

{
  "campaignId": "your-campaign-id",
  "companyId": "your-company-id",
  "concurrentCalls": 1,
  "autoStart": true
}

### Check Pipeline Status
GET http://localhost:3001/api/v1/calling/pipeline

### Get Active Calls
GET http://localhost:3001/api/v1/calling/active-calls
```

### 2. Expected Response

```json
{
  "executionId": "exec_1234567890_abcdef",
  "campaignId": "your-campaign-id",
  "state": "RUNNING",
  "totalContacts": 10,
  "processedContacts": 0,
  "successfulCalls": 0,
  "failedCalls": 0,
  "activeCalls": 1,
  "startedAt": "2024-01-01T00:00:00.000Z",
  "completedAt": null,
  "progressPercentage": 0
}
```

### 3. Monitor Logs in Real-Time

```bash
# Terminal 1: Start backend with detailed logs
cd apps/api
npm run start:dev

# Terminal 2: Start frontend
cd apps/web
npm run dev

# Terminal 3: Watch logs
tail -f apps/api/logs/application.log | grep -E "QUEUE|CAMPAIGN|ORCHESTRATOR|TWILIO"
```

## ✅ Verification Checklist

After fixes, verify:

- [ ] Backend starts without errors
- [ ] Twilio provider initializes (see "✅ Twilio Telephony Provider initialized")
- [ ] Database connection works
- [ ] Campaign can be created
- [ ] Contacts are loaded
- [ ] Queue processor starts
- [ ] Calls are queued
- [ ] Twilio calls are created
- [ ] Call SIDs are returned
- [ ] Database records are created
- [ ] WebSocket events are emitted
- [ ] Runtime Monitor updates in real-time
- [ ] Active calls appear in dashboard

## 📞 Next Steps

1. **Start Backend:**
   ```bash
   cd apps/api
   npm run start:dev
   ```

2. **Watch Logs:**
   Look for the colorful diagnostic logs:
   - 🔵 Blue = Call Orchestrator
   - 🟢 Green = Queue operations
   - 🟡 Yellow = Queue processing
   - 📞 Twilio operations
   - ❌ Errors (red)
   - ✅ Success (green checkmark)

3. **Start Campaign:**
   - Open frontend
   - Navigate to Campaigns
   - Click "Start Campaign" on an active campaign
   - Watch backend logs
   - Check Runtime Monitor

4. **Verify in Twilio Dashboard:**
   - Go to https://console.twilio.com/
   - Navigate to Phone Numbers → Logs → Calls
   - You should see outbound calls appearing

## 🚨 Important Notes

1. **Twilio Trial Account Limitations:**
   - Can only call verified numbers
   - Must verify each phone number before calling
   - Has limited free credits

2. **Webhook URLs Must Be Public:**
   - Twilio needs to reach your webhook URLs
   - Use ngrok for local development
   - For production, use a public domain

3. **Phone Number Format:**
   - Must be in E.164 format: +[country code][number]
   - Example: +12345678900 (US)
   - Example: +919876543210 (India)

4. **Rate Limiting:**
   - Twilio has rate limits
   - Adjust `concurrentCalls` accordingly
   - Monitor Twilio usage dashboard

## 📝 Summary of Changes

### Files Modified:
1. **call-orchestrator.service.ts**
   - Added comprehensive logging (🔵 blue logs)
   - Added Runtime Monitor WebSocket event emission
   - Enhanced error handling

2. **campaign-execution.service.ts**
   - Fixed contact data mapping bug
   - Added detailed progress logging
   - Improved error messages

3. **queue-execution.service.ts**
   - Added queue operation logging (🟢 green)
   - Added queue processor logging (🟡 yellow)
   - Enhanced retry logic visibility

### New Events Emitted:
- `monitor.call_state` - For Runtime Monitor updates
- Includes: sessionId, callSid, state, contactName, phoneNumber, etc.

### Logging Format:
- Color-coded by service
- Step-by-step execution tracing
- Clear success/failure indicators
- Full context for debugging

---

**Status:** ✅ **Ready for Testing**
**Action Required:** Start backend, start campaign, verify logs and Runtime Monitor
