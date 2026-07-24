# 🚀 AI Calling Agent - Quick Start

> Get your AI calling system running in 10 minutes!

## ⚡ Super Quick Start

```bash
# 1. Install everything
npm install && cd apps/api && npm install twilio openai xlsx && cd ../..

# 2. Configure
copy .env.example .env
# Edit .env and add your API keys

# 3. Setup database
npm run db:generate && npm run db:migrate

# 4. Create storage
mkdir storage\recordings storage\transcripts

# 5. Run
npm run dev
```

## 🔑 Required API Keys

Add these to `.env`:

```env
OPENAI_API_KEY=sk-...              # Get from platform.openai.com
ELEVENLABS_API_KEY=...             # Get from elevenlabs.io
TWILIO_ACCOUNT_SID=AC...           # Get from console.twilio.com
TWILIO_AUTH_TOKEN=...              # Get from console.twilio.com
TWILIO_PHONE_NUMBER=+1...          # Get from console.twilio.com
DATABASE_URL=mysql://root:pass@localhost:3306/ai_calling_agent
```

## 📞 Make Your First Call

```bash
# Windows PowerShell
$API = "http://localhost:3001/api/v1"

# 1. Create campaign
$c = (Invoke-RestMethod "$API/campaigns" -Method POST -Body '{"companyId":"1","userId":"1","name":"Test"}' -ContentType "application/json").id

# 2. Upload script
"Hello! AI calling." | Out-File script.txt
Invoke-RestMethod "$API/campaigns/$c/script/upload" -Method POST -Form @{file=Get-Item script.txt}

# 3. Upload contacts
"firstName,lastName,phone`nJohn,Doe,+1234567890" | Out-File contacts.csv
Invoke-RestMethod "$API/campaigns/$c/contacts/upload" -Method POST -Form @{file=Get-Item contacts.csv}

# 4. Start!
Invoke-RestMethod "$API/campaigns/$c/start" -Method POST -Body '{"concurrentCalls":1}' -ContentType "application/json"

# 5. Check status
Invoke-RestMethod "$API/campaigns/$c/status"
```

## 🧪 Test Everything

```powershell
.\test-calling-mvp.ps1
```

## 🔧 Twilio Local Setup

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3001

# Update .env
API_BASE_URL=https://YOUR-NGROK-URL.ngrok.io

# Configure Twilio webhooks to point to:
https://YOUR-NGROK-URL.ngrok.io/api/v1/webhooks/twilio/call
https://YOUR-NGROK-URL.ngrok.io/api/v1/webhooks/twilio/status
```

## 📚 Full Docs

- **Installation**: [INSTALL.md](./INSTALL.md)
- **Setup Guide**: [CALLING_MVP_SETUP.md](./CALLING_MVP_SETUP.md)
- **API Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Complete Info**: [MVP_COMPLETE.md](./MVP_COMPLETE.md)

## ✅ Success Check

Your system works if you can:
- ✅ Create campaign: `POST /campaigns`
- ✅ Upload files: `POST /campaigns/:id/script/upload`
- ✅ Start campaign: `POST /campaigns/:id/start`
- ✅ See status: `GET /campaigns/:id/status`
- ✅ Get analytics: `GET /campaigns/:id/analytics`

## 🆘 Quick Fixes

**Port in use?**
```env
API_PORT=3002
```

**Database error?**
```bash
mysql -u root -p -e "CREATE DATABASE ai_calling_agent"
```

**Module not found?**
```bash
npm install && cd apps/api && npm install
```

**Twilio not working?**
- Check ngrok is running
- Verify webhook URLs in Twilio console
- Check phone number format: +1234567890

## 🎯 URLs

- **Web**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **Health**: http://localhost:3001/api/v1/calling/health

## 🎉 You're Ready!

Start building AI-powered calling campaigns now! 🚀
