# AI Calling Agent MVP - Quick Start Guide

## 🎯 Goal
Get a working AI Calling Agent demo running in **3-5 days**.

---

## 📋 Prerequisites

### Required Services
1. **Twilio Account** (for making calls)
   - Sign up: https://www.twilio.com/try-twilio
   - Get: Account SID, Auth Token, Phone Number
   
2. **ElevenLabs Account** (for voice synthesis)
   - Sign up: https://elevenlabs.io
   - Get: API Key
   
3. **OpenAI Account** (for AI conversation)
   - Sign up: https://platform.openai.com
   - Get: API Key

4. **Database** (MySQL)
   - Local: Install MySQL 8.0
   - Or use Docker

---

## 🚀 Quick Setup (30 minutes)

### Step 1: Configure Environment

Edit `.env` file:

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/ai_calling_agent"

# API
API_PORT=3001
API_BASE_URL=https://your-ngrok-url.ngrok.io

# Twilio (Telephony)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TELEPHONY_PROVIDER=twilio

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
TTS_PROVIDER=elevenlabs

# Faster Whisper (STT)
FASTER_WHISPER_ENDPOINT=http://localhost:9000
STT_PROVIDER=faster-whisper

# OpenAI (LLM)
OPENAI_API_KEY=sk-your_openai_key
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.7

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for Whisper service
cd apps/whisper-service
pip install -r requirements.txt
cd ../..
```

### Step 3: Setup Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE ai_calling_agent;"

# Run migrations (if available)
npm run migrate

# Or import schema manually
mysql -u root -p ai_calling_agent < schema.sql
```

### Step 4: Start Services

**Terminal 1: Start Whisper STT Service**
```bash
cd apps/whisper-service
python main.py
# Runs on http://localhost:9000
```

**Terminal 2: Start API Server**
```bash
npm run dev:api
# Runs on http://localhost:3001
```

**Terminal 3: Start Web Dashboard**
```bash
npm run dev:web
# Runs on http://localhost:3000
```

### Step 5: Expose Webhooks with ngrok

```bash
# Install ngrok: https://ngrok.com/download

# Expose API server
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update API_BASE_URL in .env with this URL
```

---

## 🎬 Testing the MVP (End-to-End)

### Test 1: Create Campaign

1. **Login to Dashboard**
   - Go to http://localhost:3000
   - Login with your credentials

2. **Create New Campaign**
   - Go to "Campaigns" → "Create New"
   - Fill in:
     - Name: "Test Campaign"
     - Description: "First test campaign"
     - Select AI Agent (create one if needed)
     - Select Voice (from ElevenLabs)
     - Add Script (paste text or upload)
     - Upload Contacts CSV:
       ```csv
       name,phone,email
       John Doe,+1234567890,john@example.com
       Jane Smith,+0987654321,jane@example.com
       ```
   - Save Campaign

3. **Start Campaign**
   - Click "Start Campaign"
   - System will begin calling contacts

### Test 2: Manual Call Test

Use API directly:

```bash
# Start a single call
curl -X POST http://localhost:3001/api/v1/calling/start-call \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "contact-123",
    "campaignId": "campaign-123",
    "agentId": "agent-123",
    "phoneNumber": "+1234567890"
  }'

# Check call status
curl http://localhost:3001/api/v1/calling/call/SESSION_ID

# Get active calls
curl http://localhost:3001/api/v1/calling/active-calls
```

### Test 3: Check Webhooks

Monitor webhook calls from Twilio:

```bash
# View logs in API terminal
# You should see:
# - Call status updates (ringing, answered, completed)
# - Speech input from customer
# - TwiML generation
```

### Test 4: View Results

1. **Call Transcript**
   - Go to "Calls" in dashboard
   - Click on a call
   - View transcript

2. **Call Recording**
   - Recording URL should be available
   - Click to listen

3. **Campaign Analytics**
   - Go to "Campaigns" → Select campaign
   - View:
     - Total calls
     - Completed calls
     - Success rate
     - Average duration

---

## 🔧 Troubleshooting

### Issue: Calls not connecting

**Check:**
1. Twilio credentials are correct
2. Phone number is verified
3. Ngrok URL is correct in .env
4. Webhooks are configured in Twilio dashboard

**Fix:**
```bash
# Test Twilio connection
curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Calls.json \
  --data-urlencode "To=+1234567890" \
  --data-urlencode "From=YOUR_TWILIO_NUMBER" \
  --data-urlencode "Url=https://demo.twilio.com/welcome/voice/" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

### Issue: No audio/speech recognition

**Check:**
1. Whisper service is running (http://localhost:9000/health)
2. STT provider is configured
3. Audio format is correct

**Fix:**
```bash
# Restart Whisper service
cd apps/whisper-service
python main.py

# Test STT endpoint
curl http://localhost:3001/api/v1/stt/providers
```

### Issue: AI not responding

**Check:**
1. OpenAI API key is valid
2. LLM model is accessible
3. Conversation engine is initialized

**Fix:**
```bash
# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_KEY"
```

### Issue: TTS not working

**Check:**
1. ElevenLabs API key is valid
2. Voice ID is correct
3. TTS provider is initialized

**Fix:**
```bash
# Test ElevenLabs connection
curl -X GET https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_ELEVENLABS_KEY"
```

---

## 📊 MVP Success Checklist

- [ ] User can login to dashboard
- [ ] User can create campaign
- [ ] User can upload contacts
- [ ] User can add script
- [ ] User can select AI agent & voice
- [ ] User can start campaign
- [ ] System makes calls automatically
- [ ] Customer speech is transcribed
- [ ] AI generates responses
- [ ] AI speech is synthesized
- [ ] Call is recorded
- [ ] Transcript is saved
- [ ] Recording URL is stored
- [ ] Campaign analytics update
- [ ] User can view call history
- [ ] User can listen to recordings
- [ ] User can read transcripts

---

## 🎯 MVP Demo Script

### Scenario: Real Estate Lead Follow-up

**Script for AI Agent:**
```
Hello! This is Sarah calling from Dream Homes Realty. 

I'm reaching out because you recently inquired about properties in your area. 
Do you have a few minutes to discuss your home search?

[WAIT FOR RESPONSE]

Great! What type of property are you looking for? 
A house, condo, or apartment?

[WAIT FOR RESPONSE]

Excellent. What's your preferred location?

[WAIT FOR RESPONSE]

And what's your budget range?

[WAIT FOR RESPONSE]

Perfect! I have several properties that match your criteria. 
Would you like me to email you the listings, 
or would you prefer to schedule a viewing?

[WAIT FOR RESPONSE]

Wonderful! I'll send those over right away. 
Is there anything else I can help you with today?

[WAIT FOR RESPONSE]

Great! Thank you for your time. 
Have a wonderful day!
```

**Test Contacts CSV:**
```csv
name,phone,email,notes
John Doe,+1234567890,john@example.com,Interested in 3BR house
Jane Smith,+0987654321,jane@example.com,Looking for condo downtown
```

### Running the Demo

1. Create campaign with above script
2. Upload test contacts
3. Select voice (female, professional)
4. Start campaign
5. System calls both contacts
6. Monitor in real-time
7. Review transcripts after
8. Show analytics

---

## 🚀 Production Deployment (Optional)

### Docker Compose

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n ai-calling-agent

# View logs
kubectl logs -f deployment/api-server -n ai-calling-agent
```

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:3001/api/docs
- **STT Documentation**: `apps/api/src/modules/speech-recognition/README.md`
- **Implementation Status**: `MVP_IMPLEMENTATION_STATUS.md`
- **Architecture Diagram**: `docs/architecture.md`

---

## 🆘 Support

- **Logs Location**: `apps/api/logs/`
- **Error Logs**: Check API terminal output
- **Debug Mode**: Set `LOG_LEVEL=debug` in .env

---

## 🎉 Next Steps After MVP

1. **Improve UI/UX**
   - Better dashboard design
   - Real-time call monitoring
   - Live transcript viewer

2. **Add Features**
   - Call scheduling
   - Advanced retry logic
   - SMS follow-up
   - Email integration

3. **Optimize Performance**
   - Connection pooling
   - Caching
   - Load balancing

4. **Production Hardening**
   - Error handling
   - Rate limiting
   - Security audit
   - Load testing

---

**Current Status**: 80% Complete
**Time to Working Demo**: 2-3 days
**Blocking Items**: TTS integration, Webhook testing

**Last Updated**: January 2024
