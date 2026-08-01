# 🚀 Quick Start: GSM Gateway Integration

## For Developers & System Administrators

This guide gets your AI Calling Platform connected to a real GSM Gateway in under 30 minutes.

---

## Prerequisites

- ✅ GSM Gateway (Dinstar/Yeastar/OpenVox) - Powered on and network-connected
- ✅ 3 Active SIM cards inserted in gateway
- ✅ Asterisk PBX installed and running
- ✅ Application code cloned and dependencies installed
- ✅ MySQL and Redis running

---

## Step 1: Configure Environment (5 minutes)

Edit `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

**Required Changes:**

```env
# === ASTERISK CONFIGURATION ===
ASTERISK_HOST=192.168.1.200              # ← Your Asterisk server IP
ASTERISK_AMI_PORT=5038                   # ← Keep default or change
ASTERISK_AMI_USERNAME=admin              # ← Your AMI username
ASTERISK_AMI_SECRET=your-secure-password # ← Your AMI password

# === TELEPHONY PROVIDER ===
TELEPHONY_ENGINE_PROVIDER=asterisk       # ← Must be "asterisk"

# === AI SERVICES (Configure these too) ===
FASTER_WHISPER_ENDPOINT=http://localhost:9000
OLLAMA_BASE_URL=http://localhost:11434
KOKORO_ENDPOINT=http://localhost:8000
```

Save and close.

---

## Step 2: Database Setup (2 minutes)

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed initial data (optional)
npm run seed
```

---

## Step 3: Start Application (1 minute)

```bash
# Start API server
npm run dev:api

# In another terminal, start web dashboard
npm run dev:web
```

**Verify:**
- API running on: http://localhost:3001
- Dashboard running on: http://localhost:3000

---

## Step 4: Register Gateway (3 minutes)

### Option A: Using Dashboard (Recommended)

1. Open dashboard: http://localhost:3000
2. Login with admin credentials
3. Navigate to: **Settings → Telephony → Gateways**
4. Click: **"Add Gateway"**
5. Fill in:
   ```
   Name: Primary GSM Gateway
   Model: Dinstar UC2000-VF
   IP Address: 192.168.1.100
   Port: 5060
   Username: admin
   Password: [gateway-password]
   Total Ports: 4
   ```
6. Click: **"Save"**

### Option B: Using API

```bash
curl -X POST http://localhost:3001/api/v1/telephony/gateways \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyId": "your-company-id",
    "name": "Primary GSM Gateway",
    "ipAddress": "192.168.1.100",
    "port": 5060,
    "username": "admin",
    "password": "gateway-password",
    "model": "Dinstar UC2000-VF",
    "manufacturer": "Dinstar",
    "totalPorts": 4
  }'
```

---

## Step 5: Register SIM Cards (5 minutes)

### For each SIM (repeat 3 times):

**Dashboard Method:**
1. Navigate to: **Settings → Telephony → SIM Cards**
2. Click: **"Add SIM"**
3. Fill in:
   ```
   Gateway: Primary GSM Gateway
   SIM Number: +919876543210
   Operator: Jio
   Port Number: 1
   Daily Limit: 100
   ```
4. Repeat for SIM 2 (Port 2) and SIM 3 (Port 3)

**Quick API Method:**

```bash
# SIM 1
curl -X POST http://localhost:3001/api/v1/telephony/sims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gatewayId": "gateway-id",
    "companyId": "company-id",
    "simNumber": "+919876543210",
    "operator": "Jio",
    "portNumber": 1,
    "dailyLimit": 100
  }'

# SIM 2 (change portNumber and simNumber)
# SIM 3 (change portNumber and simNumber)
```

---

## Step 6: Verify System Health (2 minutes)

### Dashboard Health Check

1. Navigate to: **Dashboard → Telephony Health**
2. Click: **"Run Diagnostics"**
3. Verify all components show **GREEN**:
   - ✅ MySQL Database
   - ✅ Redis Cache
   - ✅ Asterisk AMI
   - ✅ GSM Gateway (Online)
   - ✅ SIM Cards (Active)
   - ✅ Faster Whisper
   - ✅ Ollama
   - ✅ Kokoro

### CLI Health Check

```bash
# Test AMI connection
curl http://localhost:3001/api/v1/telephony/health/component/asterisk

# Test Gateway
curl http://localhost:3001/api/v1/telephony/health/gateways

# Test SIMs
curl http://localhost:3001/api/v1/telephony/health/sims
```

---

## Step 7: Make Test Call (5 minutes)

### Method 1: Via Asterisk CLI (Quick Test)

```bash
# Connect to Asterisk
asterisk -rvvv

# Originate test call (replace with real number)
originate PJSIP/1/gsm-gateway/+919876543210 application Playback demo-congrats

# Watch for output
```

### Method 2: Via Dashboard (Full Test)

1. **Create Campaign:**
   - Navigate to: **Campaigns → New Campaign**
   - Name: "Test Campaign"
   - Select script
   - Save

2. **Upload Contacts:**
   - Click: "Upload Contacts"
   - CSV with 1 test contact:
     ```csv
     firstName,lastName,phone
     Test,User,+919876543210
     ```

3. **Start Campaign:**
   - Click: "Start Campaign"
   - Monitor in real-time

### Expected Result

```
✅ SIM 1 selected automatically
✅ Call initiated via Asterisk
✅ Call connected through GSM Gateway
✅ AI conversation starts
✅ Recording saved
✅ Transcript generated
✅ Analytics updated
```

---

## Step 8: Monitor & Verify (5 minutes)

### Check Dashboard

1. **Telephony Health:**
   - All gateways online
   - All SIMs active
   - Connections healthy

2. **Campaign Monitor:**
   - Call in progress
   - Real-time transcript
   - AI responses

3. **Call Logs:**
   - Call completed
   - Duration recorded
   - Status: SUCCESS

### Check Asterisk Logs

```bash
# View recent calls
asterisk -rx "cdr show"

# View active channels
asterisk -rx "core show channels"

# View SIP endpoints
asterisk -rx "pjsip show endpoints"
```

### Check Recordings

```bash
# Default location
ls -lh /var/spool/asterisk/monitor/

# You should see: {callId}.wav
```

---

## 🎉 Success!

You now have a fully functional AI Calling Platform connected to real GSM hardware!

**What Just Happened:**

✅ Application connected to Asterisk AMI  
✅ Gateway registered and online  
✅ SIM cards registered and active  
✅ Test call placed successfully  
✅ AI conversation executed  
✅ Call recorded and transcribed  

---

## Next Steps

### 1. Production Deployment

- [ ] Configure production environment variables
- [ ] Set up SSL/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring alerts
- [ ] Configure automated backups

### 2. Scale Up

- [ ] Add more SIM cards
- [ ] Add more gateways
- [ ] Increase concurrent calls
- [ ] Optimize AI response times

### 3. Create Real Campaigns

- [ ] Import contact database
- [ ] Create conversation scripts
- [ ] Configure AI personalities
- [ ] Set up analytics dashboards

---

## Common Issues & Quick Fixes

### Issue: Gateway shows offline

**Fix:**
```bash
# Ping gateway
ping 192.168.1.100

# Check firewall
sudo ufw status

# Verify gateway web interface
curl http://192.168.1.100
```

### Issue: AMI connection fails

**Fix:**
```bash
# Test AMI manually
telnet 192.168.1.200 5038

# Check Asterisk AMI config
asterisk -rx "manager show users"

# Reload Asterisk
asterisk -rx "core reload"
```

### Issue: SIM not registering

**Fix:**
```bash
# Check from gateway web interface
# System → GSM Status

# Verify SIM has signal
# Verify SIM is not locked
# Restart gateway if needed
```

### Issue: Calls fail with "CHANUNAVAIL"

**Fix:**
```bash
# Check PJSIP configuration
asterisk -rx "pjsip show endpoints"

# Verify gateway connectivity
asterisk -rx "pjsip show aors"

# Check dialplan
asterisk -rx "dialplan show ai-calling"
```

---

## Support Resources

### Documentation
- Full Setup Guide: `GSM_GATEWAY_PRODUCTION_SETUP.md`
- Implementation Details: `GSM_GATEWAY_IMPLEMENTATION_COMPLETE.md`
- Architecture Docs: `docs/ARCHITECTURE_DIAGRAM.txt`

### Logs
- Application: `tail -f logs/application.log`
- Asterisk: `tail -f /var/log/asterisk/full`
- AMI Events: Dashboard → Telephony Health → Diagnostics

### Health Dashboard
- URL: http://localhost:3000/dashboard/telephony-health
- Auto-refresh: Every 30 seconds
- Real-time status: All components

---

## Configuration Checklist

Before going live, verify:

- [ ] `.env` file configured correctly
- [ ] Database migrated successfully
- [ ] Asterisk AMI responding
- [ ] Gateway registered and online
- [ ] All SIM cards active
- [ ] Test call successful
- [ ] AI services responding
- [ ] Recordings being saved
- [ ] Transcripts generated
- [ ] Dashboard accessible
- [ ] Health checks passing

---

## Pro Tips

1. **Always start with 1 test call** before full campaigns
2. **Monitor health dashboard** during initial campaigns
3. **Check SIM signal strength** regularly (should be >15)
4. **Review Asterisk logs** for any errors
5. **Keep firmware updated** on GSM Gateway
6. **Use UPS** for gateway to prevent call drops
7. **Set SIM daily limits** to avoid abuse
8. **Enable auto-refresh** on health dashboard
9. **Configure alerts** for gateway offline events
10. **Backup configuration** regularly

---

## Time Breakdown

- Environment setup: 5 min
- Database setup: 2 min
- Start services: 1 min
- Register gateway: 3 min
- Register SIMs: 5 min
- Health check: 2 min
- Test call: 5 min
- Verification: 5 min

**Total: ~30 minutes** ⏱️

---

## Success Criteria

Your setup is successful when:

✅ Health dashboard shows all green  
✅ Gateways show "Online"  
✅ SIM cards show "Active"  
✅ Test call connects  
✅ AI responds naturally  
✅ Recording saved  
✅ Transcript accurate  

**You're ready for production!** 🚀

---

## Need Help?

- 📧 Email: support@yourcompany.com
- 📚 Docs: See `GSM_GATEWAY_PRODUCTION_SETUP.md`
- 🐛 Issues: Check Asterisk logs first
- 💬 Community: Asterisk forums

---

**Remember:** The system is designed to work immediately after configuration. No code changes needed! 🎯
