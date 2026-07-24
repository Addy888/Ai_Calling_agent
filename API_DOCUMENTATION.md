# AI Calling Agent - API Documentation

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 Campaign Management

### Create Campaign
Create a new calling campaign.

**Endpoint**: `POST /campaigns`

**Request Body**:
```json
{
  "companyId": "string",
  "userId": "string",
  "name": "string",
  "description": "string (optional)",
  "scriptId": "string (optional)",
  "voiceId": "string (optional)",
  "promptId": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "id": "campaign-uuid",
  "name": "My Campaign",
  "status": "DRAFT",
  "companyId": "company-uuid",
  "userId": "user-uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Get Campaign
Retrieve campaign details.

**Endpoint**: `GET /campaigns/:id`

**Response** (200 OK):
```json
{
  "id": "campaign-uuid",
  "name": "My Campaign",
  "status": "ACTIVE",
  "description": "Campaign description",
  "script": {
    "id": "script-uuid",
    "content": "Hello! This is..."
  },
  "voice": {
    "id": "voice-uuid",
    "name": "Rachel"
  },
  "_count": {
    "contacts": 150,
    "calls": 75
  }
}
```

---

### List Campaigns
Get all campaigns with optional filtering.

**Endpoint**: `GET /campaigns`

**Query Parameters**:
- `companyId` (optional): Filter by company
- `status` (optional): Filter by status (DRAFT, ACTIVE, PAUSED, COMPLETED)

**Response** (200 OK):
```json
[
  {
    "id": "campaign-uuid",
    "name": "Campaign 1",
    "status": "ACTIVE",
    "_count": {
      "contacts": 100,
      "calls": 50
    }
  }
]
```

---

### Update Campaign
Update campaign details.

**Endpoint**: `PUT /campaigns/:id`

**Request Body**:
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "scriptId": "string (optional)",
  "voiceId": "string (optional)",
  "status": "string (optional)"
}
```

---

## 📤 File Uploads

### Upload Script
Upload a script file for the campaign.

**Endpoint**: `POST /campaigns/:id/script/upload`

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: Script file (TXT, PDF, DOCX)

**Response** (200 OK):
```json
{
  "success": true,
  "scriptId": "script-uuid"
}
```

---

### Upload Contacts
Upload contacts from CSV or Excel file.

**Endpoint**: `POST /campaigns/:id/contacts/upload`

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: Contact file (CSV, XLSX)

**CSV Format**:
```csv
firstName,lastName,phone,email,language
John,Doe,+1234567890,john@example.com,en
Jane,Smith,+1234567891,jane@example.com,en
```

**Response** (200 OK):
```json
{
  "success": true,
  "imported": 150,
  "failed": 2
}
```

---

## 🎬 Campaign Execution

### Start Campaign
Start campaign execution and begin calling contacts.

**Endpoint**: `POST /campaigns/:id/start`

**Request Body**:
```json
{
  "concurrentCalls": 5
}
```

**Response** (200 OK):
```json
{
  "executionId": "exec-uuid",
  "status": "RUNNING"
}
```

---

### Pause Campaign
Pause an active campaign.

**Endpoint**: `POST /campaigns/:id/pause`

**Response** (200 OK):
```json
{
  "success": true
}
```

---

### Resume Campaign
Resume a paused campaign.

**Endpoint**: `POST /campaigns/:id/resume`

**Response** (200 OK):
```json
{
  "success": true
}
```

---

### Stop Campaign
Stop campaign execution.

**Endpoint**: `POST /campaigns/:id/stop`

**Request Body**:
```json
{
  "force": false
}
```

**Response** (200 OK):
```json
{
  "success": true
}
```

---

## 📊 Campaign Monitoring

### Get Campaign Status
Get real-time campaign execution status.

**Endpoint**: `GET /campaigns/:id/status`

**Response** (200 OK):
```json
{
  "executionId": "exec-uuid",
  "campaignId": "campaign-uuid",
  "state": "RUNNING",
  "totalContacts": 150,
  "processedContacts": 75,
  "successfulCalls": 60,
  "failedCalls": 15,
  "activeCalls": 5,
  "progressPercentage": 50
}
```

---

### Get Campaign Analytics
Get comprehensive campaign analytics.

**Endpoint**: `GET /campaigns/:id/analytics`

**Response** (200 OK):
```json
{
  "totalContacts": 150,
  "completedCalls": 75,
  "failedCalls": 15,
  "pendingCalls": 60,
  "inProgressCalls": 5,
  "totalDuration": 4500,
  "avgDuration": 60,
  "successRate": 83.33
}
```

---

### Get Live Calls
Get currently active calls for a campaign.

**Endpoint**: `GET /campaigns/:id/live-calls`

**Response** (200 OK):
```json
[
  {
    "callId": "call-uuid",
    "contactId": "contact-uuid",
    "campaignId": "campaign-uuid",
    "status": "IN_PROGRESS",
    "duration": 45
  }
]
```

---

## 📞 Call Management

### Get Call History
Get call history for a campaign.

**Endpoint**: `GET /campaigns/:id/calls`

**Query Parameters**:
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "calls": [
    {
      "id": "call-uuid",
      "status": "COMPLETED",
      "duration": 120,
      "contact": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 75,
  "limit": 50,
  "offset": 0
}
```

---

### Get Call Transcript
Get transcript for a specific call.

**Endpoint**: `GET /campaigns/calls/:callId/transcript`

**Response** (200 OK):
```json
{
  "id": "transcript-uuid",
  "callId": "call-uuid",
  "content": "Agent: Hello! This is...\n\nCustomer: Yes, I'm interested...",
  "metadata": {
    "messageCount": 8,
    "duration": 120
  },
  "call": {
    "contact": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

---

### Get Call Recording
Get recording information for a specific call.

**Endpoint**: `GET /campaigns/calls/:callId/recording`

**Response** (200 OK):
```json
{
  "id": "recording-uuid",
  "callId": "call-uuid",
  "filePath": "storage/recordings/call-uuid.mp3",
  "fileSize": 1024000,
  "duration": 120,
  "call": {
    "contact": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

---

### Test Call
Make a test call without full campaign execution.

**Endpoint**: `POST /campaigns/:id/test-call`

**Request Body**:
```json
{
  "phoneNumber": "+1234567890",
  "contactName": "Test User"
}
```

**Response** (200 OK):
```json
{
  "callId": "call-uuid",
  "status": "CALLING"
}
```

---

## 🔌 Calling Pipeline (Low-Level)

### Start Single Call
Manually start a single call (advanced usage).

**Endpoint**: `POST /calling/start-call`

**Request Body**:
```json
{
  "campaignId": "campaign-uuid",
  "contactId": "contact-uuid",
  "agentId": "agent-uuid",
  "metadata": {}
}
```

---

### End Call
Manually end an active call.

**Endpoint**: `POST /calling/end-call`

**Request Body**:
```json
{
  "sessionId": "session-uuid"
}
```

---

### Get Pipeline Status
Get overall calling pipeline status.

**Endpoint**: `GET /calling/pipeline`

**Response** (200 OK):
```json
{
  "activeCampaigns": 3,
  "activeCalls": 15,
  "queuedCalls": 50,
  "totalCallsToday": 250
}
```

---

### Get Active Calls
Get all currently active calls.

**Endpoint**: `GET /calling/active-calls`

**Response** (200 OK):
```json
{
  "calls": [
    {
      "sessionId": "session-uuid",
      "campaignId": "campaign-uuid",
      "contactId": "contact-uuid",
      "status": "IN_PROGRESS",
      "duration": 45
    }
  ],
  "count": 15
}
```

---

## 🏥 Health & Monitoring

### Health Check
Check if the calling pipeline is healthy.

**Endpoint**: `GET /calling/health`

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔗 Webhooks (For Twilio Integration)

### Call Status Webhook
Receives call status updates from Twilio.

**Endpoint**: `POST /webhooks/twilio/status`

**Request Body**: Twilio webhook payload

---

### Call Webhook
Receives incoming call events and returns TwiML.

**Endpoint**: `POST /webhooks/twilio/call`

**Response**: TwiML XML

---

### Recording Webhook
Receives recording available notifications.

**Endpoint**: `POST /webhooks/twilio/recording`

**Request Body**: Twilio recording payload

---

## 📝 Response Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 404  | Not Found |
| 500  | Internal Server Error |

---

## 🔒 Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## 📚 Example Workflows

### Complete Campaign Flow

```bash
# 1. Create Campaign
CAMPAIGN_ID=$(curl -X POST $API_URL/campaigns \
  -H "Content-Type: application/json" \
  -d '{"companyId":"comp-1","userId":"user-1","name":"New Campaign"}' \
  | jq -r '.id')

# 2. Upload Script
curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/script/upload \
  -F "file=@script.txt"

# 3. Upload Contacts
curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/contacts/upload \
  -F "file=@contacts.csv"

# 4. Start Campaign
curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/start \
  -H "Content-Type: application/json" \
  -d '{"concurrentCalls":5}'

# 5. Monitor Status
curl $API_URL/campaigns/$CAMPAIGN_ID/status

# 6. Get Analytics
curl $API_URL/campaigns/$CAMPAIGN_ID/analytics

# 7. Get Transcripts
CALL_ID=$(curl $API_URL/campaigns/$CAMPAIGN_ID/calls | jq -r '.calls[0].id')
curl $API_URL/campaigns/calls/$CALL_ID/transcript
```

---

## 🌐 Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:3001/api/docs
```

---

## 💡 Tips

1. **Rate Limiting**: Some endpoints may be rate-limited. Check response headers.
2. **Pagination**: Use `limit` and `offset` for large result sets.
3. **Webhooks**: Ensure webhooks are configured in Twilio console.
4. **Testing**: Use test-call endpoint for quick validation.
5. **Monitoring**: Check pipeline status regularly during campaigns.

---

## 🆘 Support

For issues or questions:
1. Check the logs
2. Review error messages
3. Verify API keys and configuration
4. Test individual endpoints

For detailed setup instructions, see `CALLING_MVP_SETUP.md`.
