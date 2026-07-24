# AI Calling Agent MVP - Installation Guide

## 🚀 Quick Start Installation

This guide will get your AI Calling MVP up and running in minutes.

## 📦 Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies (includes twilio, openai, xlsx)
cd apps/api
npm install twilio openai xlsx @nestjs/platform-express multer
cd ../..
```

## 🔑 Step 2: Configure API Keys

1. Copy the example environment file:
```bash
copy .env.example .env
```

2. Edit `.env` and add your API keys:

### Required API Keys:

**OpenAI** (for AI Conversation):
- Get from: https://platform.openai.com/api-keys
- Add to `.env`: `OPENAI_API_KEY=sk-...`

**ElevenLabs** (for Text-to-Speech):
- Get from: https://elevenlabs.io/app/settings/api-keys
- Add to `.env`: `ELEVENLABS_API_KEY=...`

**Twilio** (for Phone Calls):
- Get from: https://console.twilio.com/
- Add to `.env`:
  ```
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_PHONE_NUMBER=+1...
  ```

### Database Configuration:

Update your MySQL connection:
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/ai_calling_agent"
```

## 🗄️ Step 3: Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

## 📁 Step 4: Create Storage Directories

```bash
# Windows
mkdir storage\recordings
mkdir storage\transcripts

# Linux/Mac
mkdir -p storage/recordings storage/transcripts
```

## ▶️ Step 5: Start the Application

```bash
# Start both API and Web (development mode)
npm run dev
```

This will start:
- **API**: http://localhost:3001
- **Web**: http://localhost:3000

## ✅ Step 6: Verify Installation

### Test API Health:
```bash
curl http://localhost:3001/api/v1/calling/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### Test OpenAI Connection:
```bash
curl http://localhost:3001/api/v1/system-health
```

### Access Web Dashboard:
Open browser to: http://localhost:3000

## 🔧 Twilio Webhook Configuration

For local development, you need to expose your local server to the internet:

### Option 1: Using ngrok (Recommended)

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3001
ngrok http 3001
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and update:

1. **Update `.env`**:
```env
API_BASE_URL=https://abc123.ngrok.io
```

2. **Configure Twilio Phone Number**:
- Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active
- Select your phone number
- Under "Voice Configuration":
  - **A CALL COMES IN**: Webhook
  - **URL**: `https://abc123.ngrok.io/api/v1/webhooks/twilio/call`
  - **HTTP**: POST
- Under "Status Callbacks":
  - **Status Callback URL**: `https://abc123.ngrok.io/api/v1/webhooks/twilio/status`
- Save

### Option 2: Deploy to Cloud

For production, deploy to a cloud provider (AWS, Azure, Heroku, etc.) and use the public URL.

## 🧪 Test the Installation

Run the test script:

### Windows (PowerShell):
```powershell
.\test-calling-mvp.ps1 -ApiUrl "http://localhost:3001/api/v1"
```

### Linux/Mac:
```bash
chmod +x test-calling-mvp.sh
./test-calling-mvp.sh
```

## 🎯 Quick Test - Manual Flow

### 1. Create a Campaign:
```bash
curl -X POST http://localhost:3001/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "test-company",
    "userId": "test-user",
    "name": "My First Campaign",
    "description": "Testing AI Calling"
  }'
```

Save the returned `campaign-id`.

### 2. Upload Script:
```bash
echo "Hello! This is an AI assistant. How can I help you today?" > script.txt

curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/script/upload \
  -F "file=@script.txt"
```

### 3. Upload Contacts:
```bash
cat > contacts.csv << EOF
firstName,lastName,phone,email
John,Doe,+1234567890,john@example.com
EOF

curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/contacts/upload \
  -F "file=@contacts.csv"
```

### 4. Start Campaign:
```bash
curl -X POST http://localhost:3001/api/v1/campaigns/{campaign-id}/start \
  -H "Content-Type: application/json" \
  -d '{"concurrentCalls": 1}'
```

### 5. Monitor Status:
```bash
curl http://localhost:3001/api/v1/campaigns/{campaign-id}/status
```

## ⚠️ Common Issues

### Issue: Module not found errors
**Solution**: 
```bash
npm install
cd apps/api && npm install
cd ../web && npm install
```

### Issue: Prisma Client not generated
**Solution**:
```bash
npm run db:generate
```

### Issue: Port already in use
**Solution**: 
Change ports in `.env`:
```env
API_PORT=3002
```

### Issue: Database connection failed
**Solution**: 
1. Verify MySQL is running
2. Check credentials in `.env`
3. Test connection:
```bash
mysql -u root -p -e "SHOW DATABASES;"
```

### Issue: Twilio calls not connecting
**Solution**:
1. Verify ngrok is running
2. Check webhook URLs in Twilio console
3. Verify phone number format: `+1234567890`
4. Check Twilio logs: https://console.twilio.com/monitor/logs/calls

### Issue: OpenAI API errors
**Solution**:
1. Verify API key is correct
2. Check rate limits
3. Ensure billing is setup: https://platform.openai.com/account/billing

### Issue: ElevenLabs voice not working
**Solution**:
1. List available voices:
```bash
curl https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_KEY"
```
2. Update `ELEVENLABS_VOICE_ID` in `.env`

## 📚 Next Steps

1. **Read Setup Guide**: See `CALLING_MVP_SETUP.md` for detailed testing
2. **Configure Voices**: Customize voice settings in ElevenLabs
3. **Setup Authentication**: Configure JWT secrets for production
4. **Deploy to Production**: Use AWS, Azure, or your preferred platform

## 🆘 Support

If you encounter issues:
1. Check logs in console
2. Review `.env` configuration
3. Test each component individually
4. Check API documentation: http://localhost:3001/api/docs

## 🎉 Success!

If you can:
- ✅ Create a campaign
- ✅ Upload contacts and script
- ✅ Start campaign
- ✅ Make test calls
- ✅ View transcripts and recordings

**You're ready to go!** 🚀

Proceed to `CALLING_MVP_SETUP.md` for detailed usage and testing scenarios.
