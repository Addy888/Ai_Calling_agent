# Outbound Calling Pipeline - Verification Checklist ✅

## 🎯 Quick Start Guide

### Prerequisites
1. ✅ MySQL database running
2. ✅ Node.js and npm installed
3. ✅ Twilio account with credits
4. ✅ Active phone number in Twilio

### Step 1: Configure Environment Variables

Check your `.env` file has these **REQUIRED** variables:

```bash
# Database
DATABASE_URL="mysql://root:password@localhost:3306/ai_calling_agent"

# Twilio (REQUIRED for calls)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890

# Telephony Provider (must be 'twilio')
TELEPHONY_ENGINE_PROVIDER=twilio

# API Base URL (CRITICAL for webhooks)
API_BASE_URL=https://your-domain.com
# For local development:
# API_BASE_URL=https://yoursubdomain.ngrok.io

# OpenAI (for AI responses)
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4-turbo-preview

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Step 2: Local Development Webhook Setup (if testing locally)

```bash
# Install ngrok if not already installed
# Download from: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update .env:
API_BASE_URL=https://abc123.ngrok.io

# IMPORTANT: Restart backend after changing API_BASE_URL
```

### Step 3: Verify Database Setup

```bash
# Connect to MySQL
mysql -u root -p ai_calling_agent

# Check if you have active campaigns with contacts
SELECT c.id, c.name, COUNT(ct.id) as contact_count 
FROM Campaign c
LEFT JOIN Contact ct ON ct.campaignId = c.id 
  AND ct.status = 'ACTIVE' 
  AND ct.deletedAt IS NULL
GROUP BY c.id, c.name;

# Verify contacts have valid phone numbers
SELECT id, fullName, phone, status 
FROM Contact 
WHERE campaignId = 'your-campaign-id' 
AND status = 'ACTIVE' 
AND deletedAt IS NULL 
LIMIT 5;
```

**Requirements:**
- Contacts must have `status = 'ACTIVE'`
- Contacts must have `deletedAt IS NULL`
- Phone numbers must be in E.164 format: `+1234567890` (country code + number)

### Step 4: Start Backend

```bash
cd apps/api
npm install
npm run start:dev
```

**Look for these startup logs:**
```
✅ Twilio Telephony Provider initialized
📞 Using Twilio number: +1234567890
[QueueExecutionService] Queue Execution Service initialized
[QueueExecutionService] Queue processor started
[CallOrchestratorService] Call Orchestrator Service initialized
```

### Step 5: Start Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open: `http://localhost:3000/dashboard/runtime-monitor`

### Step 6: Start a Campaign

**Option A - Via API:**
```bash
curl -X POST http://localhost:3001/api/v1/calling/start-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "your-campaign-id",
    "companyId": "your-company-id",
    "concurrentCalls": 1,
    "autoStart": true
  }'
```

**Option B - Via Frontend:**
1. Navigate to Campaigns page
2. Find your campaign
3. Click "Start Campaign" button

## 🔍 Expected Results

### Backend Logs (in order)

Within 1-2 seconds of starting a campaign, you should see:

```
[CallingPipelineService] Starting campaign: clxxxxxx
[CampaignExecutionService] Creating campaign execution for: clxxxxxx
[CampaignExecutionService] Loading contacts for campaign: clxxxxxx
✅ [CAMPAIGN] Loaded 5 contacts for campaign clxxxxxx
📊 [CAMPAIGN clxxxxxx] Processing contacts:
   - Concurrent calls limit: 1
   - Active calls: 0
   - Available slots: 1
   - Contacts in queue: 5
📞 Queueing call for contact: John Doe (+1234567890)
🟢 [QUEUE] ===============================================
🟢 [QUEUE] Queuing call for contact: clxxxxxx
🟢 [QUEUE] Phone: +1234567890
🟢 [QUEUE] Campaign: clxxxxxx
🟢 [QUEUE] ✅ Call queued: call_1234567890_abc123
🟢 [QUEUE] Queue size: 1
🟢 [QUEUE] ===============================================
✅ Call queued successfully for John Doe
```

**After 1 second (queue processor):**
```
🟡 [QUEUE PROCESSOR] ==========================================
🟡 [QUEUE PROCESSOR] Processing queued call: call_1234567890_abc123
🟡 [QUEUE PROCESSOR] Contact: clxxxxxx
🟡 [QUEUE PROCESSOR] Phone: +1234567890
🟡 [QUEUE PROCESSOR] Calling CallOrchestrator.initiateCall()...
🔵 [CALL ORCHESTRATOR] ===============================================
🔵 [CALL ORCHESTRATOR] Initiating call for contact: clxxxxxx
🔵 [CALL ORCHESTRATOR] Campaign: clxxxxxx
🔵 [CALL ORCHESTRATOR] Step 1: Fetching contact details...
🔵 [CALL ORCHESTRATOR] Contact found: John Doe
🔵 [CALL ORCHESTRATOR] Phone: +1234567890
🔵 [CALL ORCHESTRATOR] Step 2: Fetching campaign details...
🔵 [CALL ORCHESTRATOR] Campaign: My Campaign
🔵 [CALL ORCHESTRATOR] Step 3: Creating call record in database...
🔵 [CALL ORCHESTRATOR] Call record created: clxxxxxx
🔵 [CALL ORCHESTRATOR] Step 4: Initiating Twilio call...
🔵 [CALL ORCHESTRATOR] Callback URL: https://yoursubdomain.ngrok.io/api/v1/webhooks/twilio/call
🔵 [CALL ORCHESTRATOR] Status Callback: https://yoursubdomain.ngrok.io/api/v1/webhooks/twilio/status
🔵 [CALL ORCHESTRATOR] Calling: +1234567890
🔵 [CALL ORCHESTRATOR] From: +1234567890
📞 [TWILIO] Making call to +1234567890
📞 [TWILIO] From: +1234567890
📞 [TWILIO] Call created successfully: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
📞 [TWILIO] Call SID: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
🔵 [CALL ORCHESTRATOR] ✅ Twilio call created successfully!
🔵 [CALL ORCHESTRATOR] Call SID: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
🔵 [CALL ORCHESTRATOR] Registered CallSid mapping: CAxxxxxxxx → clxxxxxx
🔵 [CALL ORCHESTRATOR] Step 5: Updating call record...
🔵 [CALL ORCHESTRATOR] Step 6: Emitting events...
🔵 [CALL ORCHESTRATOR] ✅ Call initiation complete!
🔵 [CALL ORCHESTRATOR] ===============================================
🟡 [QUEUE PROCESSOR] ✅ Call initiated successfully!
🟡 [QUEUE PROCESSOR] Call ID: clxxxxxx
🟡 [QUEUE PROCESSOR] Call status: active
🟡 [QUEUE PROCESSOR] ==========================================
```

### Runtime Monitor UI

**Immediately after call starts:**
- ✅ Active Calls counter increases to 1
- ✅ New row appears in "Live Calls" table
- ✅ Shows: Contact name, phone number, status "Dialing"
- ✅ Timer starts counting (0:01, 0:02, 0:03...)

**As call progresses:**
- ✅ Status updates: Dialing → Ringing → Connected
- ✅ Duration continues to increment
- ✅ Click on row opens call details drawer

### Twilio Dashboard

1. Go to: https://console.twilio.com/
2. Navigate to: Phone Numbers → Monitor → Logs → Calls
3. ✅ Should see outbound call
4. ✅ Call SID matches backend logs
5. ✅ Status shows: initiated → ringing → in-progress → completed

### Database

```bash
mysql -u root -p ai_calling_agent

# Check call record
SELECT id, campaignId, contactId, status, metadata 
FROM \`Call\` 
ORDER BY createdAt DESC 
LIMIT 1;
```

Expected:
- ✅ Status: 'CALLING' or 'IN_PROGRESS'
- ✅ metadata contains callSid: "CAxxxxxxxx"

## ❌ Troubleshooting

### Problem: No logs after "Queue processor started"

**Check:**
```bash
# 1. Verify campaign has active contacts
mysql -u root -p ai_calling_agent -e "
  SELECT COUNT(*) as active_contacts 
  FROM Contact 
  WHERE campaignId = 'your-campaign-id' 
  AND status = 'ACTIVE' 
  AND deletedAt IS NULL;"

# 2. Check if campaign was actually started
curl http://localhost:3001/api/v1/calling/pipeline
```

### Problem: "Failed to initiate call" error

**Check backend logs for specific error:**

**Error: `401 Unauthorized`**
- ❌ TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is incorrect
- Fix: Double-check credentials in Twilio console

**Error: `21210: Invalid phone number`**
- ❌ Phone number not in E.164 format
- Fix: Update contact phone to: `+1234567890` (with + and country code)

**Error: `21408: Permission to send an SMS`**
- ❌ Trial account, number not verified
- Fix: Verify the number in Twilio console OR upgrade account

**Error: `21606: Account funds`**
- ❌ Insufficient Twilio credits
- Fix: Add funds to Twilio account

### Problem: Call initiated but no webhooks received

**Check:**
```bash
# 1. Verify API_BASE_URL is publicly accessible
curl https://yoursubdomain.ngrok.io/health

# 2. Check ngrok dashboard for webhook requests
# Open: http://localhost:4040

# 3. Test webhook endpoint directly
curl -X POST https://yoursubdomain.ngrok.io/api/v1/webhooks/twilio/status \
  -d "CallSid=CAtest123&CallStatus=completed"
```

**Fix:**
- Restart ngrok if URL changed
- Update `.env` with new ngrok URL
- Restart backend after changing API_BASE_URL

### Problem: Runtime Monitor shows 0 calls

**Check:**
1. ✅ Frontend connected to WebSocket
   - Open browser console
   - Look for: "Socket.IO connected"

2. ✅ WebSocket events being emitted
   - Check backend logs for: `[RuntimeMonitorGateway]`

3. ✅ Frontend receiving events
   - Browser console should show: `monitor:call_state` events

**Fix:**
```bash
# Restart frontend
cd apps/web
npm run dev

# Check WebSocket connection in browser console:
# Should see: "WebSocket connection established"
```

## 📊 Success Criteria

When everything is working correctly:

1. ✅ **Backend Logs:**
   - Queue processor running
   - Contacts loaded from database
   - Calls queued (🟢 green logs)
   - Queue processor picks up call (🟡 yellow logs)
   - Call orchestrator initiates (🔵 blue logs)
   - Twilio call created (📞 phone logs)
   - Call SID received and stored
   - WebSocket events emitted

2. ✅ **Database:**
   - Call records created with status 'CALLING'
   - Call SID stored in metadata
   - Status updates as call progresses

3. ✅ **Runtime Monitor:**
   - Active Calls > 0
   - Call visible in table
   - Real-time status updates
   - Duration counter incrementing
   - Drawer opens with call details

4. ✅ **Twilio Dashboard:**
   - Call appears in logs
   - Call SID matches backend
   - Status progresses correctly

## 🎉 All Systems Operational

If you see all of the above, congratulations! Your outbound calling pipeline is working perfectly:

- ✅ Campaign execution
- ✅ Contact queue management
- ✅ Automatic call scheduling
- ✅ Twilio integration
- ✅ Real-time monitoring
- ✅ Database tracking
- ✅ WebSocket events

The system will now:
- Process contacts from the queue every 1 second
- Respect concurrent call limits
- Handle Twilio callbacks via webhooks
- Update Runtime Monitor in real-time
- Log every step for debugging

## 📞 Support

If issues persist:

1. Check `PIPELINE_STATUS_COMPLETE.md` for detailed implementation info
2. Check `CALLING_PIPELINE_FIXES.md` for troubleshooting guide
3. Review backend logs for specific error messages
4. Verify all environment variables are set correctly
5. Test Twilio credentials with a simple curl:
   ```bash
   curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Calls.json" \
     --data-urlencode "Url=http://demo.twilio.com/docs/voice.xml" \
     --data-urlencode "To=+1234567890" \
     --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
     -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
   ```

---

**System Status:** ✅ READY FOR USE

All pipeline components are implemented, tested, and operational!
