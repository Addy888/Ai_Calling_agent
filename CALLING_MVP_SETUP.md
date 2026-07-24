# AI Calling MVP - Setup & Testing Guide

## 🚀 Overview

This guide will help you set up and test the complete AI Calling MVP system.

## 📋 Prerequisites

1. **Node.js** (v18+)
2. **MySQL** (running and accessible)
3. **API Keys**:
   - OpenAI API Key (for LLM and Whisper STT)
   - ElevenLabs API Key (for TTS)
   - Twilio Account (SID, Auth Token, Phone Number)

## ⚙️ Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Additional Required Packages

```bash
# API Dependencies
cd apps/api
npm install twilio openai xlsx @nestjs/platform-express multer

# Return to root
cd ../..
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/ai_calling_agent"

# API
API_PORT=3001
API_HOST=localhost
API_BASE_URL=http://localhost:3001

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m

# OpenAI (for LLM and STT)
OPENAI_API_KEY=sk-your-openai-api-key-here
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500

# ElevenLabs (for TTS)
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# Twilio (for Telephony)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Providers
STT_PROVIDER=openai-whisper
TTS_PROVIDER=elevenlabs
TELEPHONY_PROVIDER=twilio

# Campaign Settings
MAX_CONCURRENT_CALLS=5
CALL_TIMEOUT=120
MAX_RETRY_ATTEMPTS=3

# Storage
STORAGE_PATH=./storage
```

### 4. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Run Migrations
npm run db:migrate

# (Optional) Seed Database
npm run db:seed
```

### 5. Create Storage Directories

```bash
mkdir -p storage/recordings storage/transcripts
```

## 🏃 Running the Application

### Development Mode

```bash
# Start both API and Web
npm run dev

# Or start separately
npm run dev:api    # API on http://localhost:3001
npm run dev:web    # Web on http://localhost:3000
```

### Production Mode

```bash
# Build
npm run build

# Start
npm start
```

## 🧪 Testing the MVP

### Step 1: User Login

1. Navigate to `http://localhost:3000`
2. Login with your credentials
3. You should be redirected to the dashboard

### Step 2: Create Campaign

**API Endpoint**: `POST /api/v1/campaigns`

```bash
curl -X POST http://localhost:3001/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "companyId": "your-company-id",
    "userId": "your-user-id",
    "name": "Test Campaign",
    "description": "My first AI calling campaign"
  }'
```

**Response**:
```json
{
  "id": "campaign-id",
  "name": "Test Campaign",
  "status": "DRAFT"
}
```

### Step 3: Upload Script

**API Endpoint**: `POST /api/v1/campaigns/{id}/script/upload`

```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/script/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@script.txt"
```

**Sample Script** (`script.txt`):
```
Hello! This is an AI assistant calling on behalf of [Company Name].

I'm calling to inform you about our new product launch. 

Would you be interested in learning more about our services?

If yes, I can schedule a demo for you.

Thank you for your time!
```

### Step 4: Upload Contacts

**API Endpoint**: `POST /api/v1/campaigns/{id}/contacts/upload`

```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/contacts/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@contacts.csv"
```

**Sample CSV** (`contacts.csv`):
```csv
firstName,lastName,phone,email,language
John,Doe,+1234567890,john@example.com,en
Jane,Smith,+1234567891,jane@example.com,en
```

### Step 5: Start Campaign

**API Endpoint**: `POST /api/v1/campaigns/{id}/start`

```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "concurrentCalls": 2
  }'
```

**Response**:
```json
{
  "executionId": "exec_1234567890_abc123",
  "status": "RUNNING"
}
```

### Step 6: Monitor Campaign Status

**API Endpoint**: `GET /api/v1/campaigns/{id}/status`

```bash
curl http://localhost:3001/api/v1/campaigns/{campaign-id}/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "executionId": "exec_1234567890_abc123",
  "campaignId": "campaign-id",
  "state": "RUNNING",
  "totalContacts": 2,
  "processedContacts": 1,
  "successfulCalls": 1,
  "failedCalls": 0,
  "activeCalls": 1,
  "progressPercentage": 50
}
```

### Step 7: Get Live Calls

**API Endpoint**: `GET /api/v1/campaigns/{id}/live-calls`

```bash
curl http://localhost:3001/api/v1/campaigns/{campaign-id}/live-calls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 8: Get Campaign Analytics

**API Endpoint**: `GET /api/v1/campaigns/{id}/analytics`

```bash
curl http://localhost:3001/api/v1/campaigns/{campaign-id}/analytics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "totalContacts": 2,
  "completedCalls": 2,
  "failedCalls": 0,
  "pendingCalls": 0,
  "inProgressCalls": 0,
  "totalDuration": 180,
  "avgDuration": 90,
  "successRate": 100
}
```

### Step 9: Get Call Transcript

**API Endpoint**: `GET /api/v1/campaigns/calls/{callId}/transcript`

```bash
curl http://localhost:3001/api/v1/campaigns/calls/{call-id}/transcript \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "id": "transcript-id",
  "callId": "call-id",
  "content": "Agent: Hello! This is an AI assistant...\n\nCustomer: Yes, I'm interested...\n\nAgent: Great! I can schedule a demo...",
  "metadata": {
    "messageCount": 6,
    "duration": 90
  }
}
```

### Step 10: Get Call Recording

**API Endpoint**: `GET /api/v1/campaigns/calls/{callId}/recording`

```bash
curl http://localhost:3001/api/v1/campaigns/calls/{call-id}/recording \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Campaign Control Endpoints

### Pause Campaign

```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/pause \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Resume Campaign

```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Stop Campaign

```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"force": false}'
```

## 🧪 Test Call (Without Campaign)

To test a single call without starting a full campaign:

```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/test-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "phoneNumber": "+1234567890",
    "contactName": "Test User"
  }'
```

## 🔧 Troubleshooting

### Issue: Twilio Webhooks Not Working Locally

**Solution**: Use ngrok to expose your local server

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3001
ngrok http 3001

# Update .env with ngrok URL
API_BASE_URL=https://abc123.ngrok.io
```

### Issue: Database Connection Failed

**Solution**: Verify MySQL is running and credentials are correct

```bash
# Test MySQL connection
mysql -u root -p -e "SHOW DATABASES;"

# Verify DATABASE_URL in .env
```

### Issue: OpenAI API Rate Limit

**Solution**: Reduce concurrent calls or upgrade OpenAI plan

```env
MAX_CONCURRENT_CALLS=2
```

### Issue: ElevenLabs Voice Not Found

**Solution**: List available voices and update ELEVENLABS_VOICE_ID

```bash
curl https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_API_KEY"
```

## 📊 Monitoring

### View System Health

```bash
curl http://localhost:3001/api/v1/calling/health
```

### View Pipeline Status

```bash
curl http://localhost:3001/api/v1/calling/pipeline
```

### View Active Calls

```bash
curl http://localhost:3001/api/v1/calling/active-calls
```

## 🎬 Complete Test Flow Script

```bash
#!/bin/bash

API_URL="http://localhost:3001/api/v1"
TOKEN="your-jwt-token"

# 1. Create Campaign
CAMPAIGN_ID=$(curl -s -X POST $API_URL/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyId":"comp-1","userId":"user-1","name":"Test Campaign"}' \
  | jq -r '.id')

echo "Campaign ID: $CAMPAIGN_ID"

# 2. Upload Script
curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/script/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@script.txt"

# 3. Upload Contacts
curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/contacts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@contacts.csv"

# 4. Start Campaign
curl -X POST $API_URL/campaigns/$CAMPAIGN_ID/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"concurrentCalls":2}'

# 5. Monitor Status (every 10 seconds)
while true; do
  STATUS=$(curl -s $API_URL/campaigns/$CAMPAIGN_ID/status \
    -H "Authorization: Bearer $TOKEN")
  echo "Status: $STATUS"
  sleep 10
done
```

## 📝 Notes

1. **Twilio Webhook Configuration**: Make sure to configure your Twilio phone number to point to your webhook endpoints:
   - Voice URL: `{API_BASE_URL}/api/v1/webhooks/twilio/call`
   - Status Callback: `{API_BASE_URL}/api/v1/webhooks/twilio/status`

2. **Storage**: Call recordings and transcripts are stored in `./storage/` directory

3. **Logs**: Application logs are written to console and can be redirected to files

4. **Security**: In production, ensure all endpoints are properly authenticated

## ✅ Success Criteria

- ✓ Campaign created successfully
- ✓ Contacts uploaded and validated
- ✓ Script uploaded and linked
- ✓ Campaign starts calling contacts
- ✓ AI handles conversations naturally
- ✓ Transcripts saved after each call
- ✓ Recordings saved after each call
- ✓ Analytics updated in real-time
- ✓ Campaign can be paused/resumed/stopped

## 🎉 You're All Set!

Your AI Calling MVP is now ready for demonstration!
