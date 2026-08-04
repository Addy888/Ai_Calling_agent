# 🚀 Start AI Calling Platform - Complete Guide

**Date**: August 4, 2026  
**Status**: ✅ **Ready to Start**

---

## ✅ Prerequisites Check

| Service | Status | Action |
|---------|--------|--------|
| **MySQL** | Required | Running on port 3306 |
| **Redis** | ✅ Installed | Running on port 6379 |
| **Node.js** | Required | v18+ installed |
| **Build** | ✅ Complete | No compilation errors |

---

## 🎯 Quick Start (2 Steps)

### Step 1: Add AMI Password

Open `.env` and update:
```bash
ASTERISK_AMI_SECRET=your_actual_ami_password
```

**Get password from Asterisk server:**
```bash
ssh root@192.168.1.4
cat /etc/asterisk/manager.conf | grep -A 3 "\[admin\]"
```

### Step 2: Start Services

```bash
# Terminal 1: Start API
cd apps/api
npm run start:dev

# Terminal 2: Start Frontend (optional)
cd apps/web
npm run dev
```

---

## 📊 Expected Startup Logs

### ✅ Successful Startup

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [InstanceLoader] PrismaModule dependencies initialized
[Nest] LOG [InstanceLoader] TelephonyEngineModule dependencies initialized

[Nest] LOG [AsteriskProductionAMIService] 🚀 Asterisk Production AMI Service starting...
[Nest] LOG [AsteriskProductionAMIService] 📋 Configuration loaded:
[Nest] LOG [AsteriskProductionAMIService]    Asterisk: 192.168.1.4:5038
[Nest] LOG [AsteriskProductionAMIService]    Username: admin
[Nest] LOG [AsteriskProductionAMIService]    Context: ai-calling
[Nest] LOG [AsteriskProductionAMIService]    SIP Peer: GSM1
[Nest] LOG [AsteriskProductionAMIService] 🔌 Connecting to Asterisk AMI at 192.168.1.4:5038...
[Nest] LOG [AsteriskProductionAMIService] ✅ TCP connected to 192.168.1.4:5038
[Nest] LOG [AsteriskProductionAMIService] ✅ Authenticated to Asterisk
[Nest] LOG [AsteriskProductionAMIService] ✅ Asterisk Production AMI ready

[Nest] LOG [CampaignCallDispatcherService] 🚀 Campaign Call Dispatcher Service starting...
[Nest] LOG [CampaignCallDispatcherService] ✅ BullMQ queue initialized
[Nest] LOG [CampaignCallDispatcherService] ✅ BullMQ worker initialized
[Nest] LOG [CampaignCallDispatcherService] ✅ Campaign Call Dispatcher ready
[Nest] LOG [CampaignCallDispatcherService]    Max Concurrent: 3
[Nest] LOG [CampaignCallDispatcherService]    Call Timeout: 120s

[Nest] LOG [GatewayManagerService] ❤️ Health monitoring started (interval: 60000ms)

[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG Application is running on: http://localhost:3001
```

---

## 🔍 Verify Services

### 1. API Health Check
```bash
curl http://localhost:3001/api/v1/health
```

Expected:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 2. Asterisk Status
```bash
curl http://localhost:3001/api/v1/asterisk/admin/status
```

Expected:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "authenticated": true,
    "host": "192.168.1.4",
    "port": 5038,
    "sipPeer": "GSM1",
    "activeChannels": 0
  }
}
```

### 3. System Diagnostics
```bash
curl http://localhost:3001/api/v1/asterisk/admin/diagnostics
```

Should return complete system health report.

---

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | http://localhost:3001 | Backend REST API |
| **API Docs** | http://localhost:3001/api/docs | Swagger documentation |
| **Frontend** | http://localhost:3000 | Web dashboard |
| **Admin Panel** | http://localhost:3000/dashboard | Admin interface |

---

## 🎬 After Startup

### 1. Login to Dashboard
```
http://localhost:3000/login
```

Use your Sky Rocket Infosys credentials:
- Email: `skyrocketinfosys@gmail.com`
- Password: (your company admin password)

### 2. Register GSM Gateway

Go to: **Admin Panel → GSM Gateway → Add Gateway**

Fill in:
- **Name**: Dinstar-Gateway-1
- **IP Address**: 192.168.1.8
- **Port**: 5060
- **Model**: UC2000-VG-16G
- **Manufacturer**: Dinstar
- **Total Ports**: 16

### 3. Add SIM Cards

Go to: **Admin Panel → SIM Cards → Bulk Add**

Add your 16 SIM cards with:
- SIM Number (phone number)
- Operator (Jio/Airtel/Vi/BSNL)
- Port Number (1-16)
- Gateway (select Dinstar-Gateway-1)

### 4. Create Test Campaign

Go to: **Campaigns → Create Campaign**

1. Set campaign name
2. Add contacts (manual or CSV)
3. Configure AI agent
4. Start campaign
5. Watch real-time progress!

---

## 🐛 Troubleshooting

### Issue: Can't Connect to Asterisk

**Symptoms**:
```
[Nest] ERROR Connection error: ECONNREFUSED 192.168.1.4:5038
```

**Solutions**:
```bash
# 1. Test network connectivity
ping 192.168.1.4

# 2. Test AMI port
telnet 192.168.1.4 5038

# 3. Check Asterisk is running
ssh root@192.168.1.4
asterisk -rx "core show version"

# 4. Verify AMI is enabled
cat /etc/asterisk/manager.conf
```

### Issue: Redis Connection Errors

**Symptoms**:
```
[Nest] ERROR Worker error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions**:
```powershell
# Check Redis service
Get-Service Redis

# Start Redis if stopped
Start-Service Redis

# Test Redis connection
redis-cli ping
```

### Issue: Database Connection Failed

**Symptoms**:
```
[Nest] ERROR [PrismaService] P1001: Can't reach database server
```

**Solutions**:
```bash
# Check MySQL is running
Get-Service MySQL*

# Test connection
mysql -u root -p -h localhost
```

### Issue: Port Already in Use

**Symptoms**:
```
[Nest] ERROR Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions**:
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <pid> /F

# Or change port in .env
API_PORT=3002
```

---

## 📋 Environment Checklist

Before starting, verify:

- [ ] `.env` file exists and is configured
- [ ] `ASTERISK_AMI_SECRET` is set with real password
- [ ] `DATABASE_URL` points to running MySQL
- [ ] `REDIS_HOST` and `REDIS_PORT` are correct
- [ ] MySQL database exists and is accessible
- [ ] Redis service is running
- [ ] Asterisk server is reachable (192.168.1.4)
- [ ] No other service using ports 3000, 3001
- [ ] Node modules installed (`npm install`)
- [ ] Build successful (`npm run build`)

---

## 🔐 Security Notes

### Production Deployment

When deploying to production:

1. **Change all secrets** in `.env`:
   - `JWT_SECRET` (min 32 characters)
   - `JWT_REFRESH_SECRET` (min 64 characters)
   - `ASTERISK_AMI_SECRET` (strong password)
   - `DATABASE_URL` (production credentials)

2. **Enable HTTPS**:
   - Use reverse proxy (nginx/Apache)
   - Install SSL certificate
   - Update `API_BASE_URL`

3. **Restrict Access**:
   - Configure firewall rules
   - Limit Asterisk AMI access by IP
   - Enable Redis password
   - Set up database user permissions

4. **Update CORS**:
```bash
CORS_ORIGINS=https://yourdomain.com
```

---

## 🎯 Success Indicators

You'll know everything is working when:

1. ✅ API starts without errors
2. ✅ Asterisk shows: **Connected & Authenticated**
3. ✅ Redis shows: **BullMQ worker initialized**
4. ✅ Gateway shows: **Health monitoring started**
5. ✅ Frontend loads dashboard
6. ✅ Can login with company admin
7. ✅ Can see Asterisk status in Admin Panel
8. ✅ Test call can be originated

---

## 📞 First Test Call

### Via Admin Panel:
1. Go to: **Asterisk Admin → Test Call**
2. Enter destination number
3. Enter caller ID
4. Click "Originate"
5. Watch real-time status

### Via API:
```bash
curl -X POST http://localhost:3001/api/v1/asterisk/admin/test-call \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "919876543210",
    "callerId": "918123456789"
  }'
```

---

## 📚 Documentation Files

- **`ASTERISK_INTEGRATION_COMPLETE.md`** - Complete integration guide
- **`QUICK_START_ASTERISK.md`** - 5-minute setup
- **`BUILD_FIXES_APPLIED.md`** - Build errors resolved
- **`REDIS_SETUP_COMPLETE.md`** - Redis installation guide
- **`START_PLATFORM.md`** - This file

---

## 🎉 You're Ready!

Your Enterprise AI Calling Platform is now:
- ✅ Fully built and compiled
- ✅ Integrated with production Asterisk
- ✅ Connected to Redis for queues
- ✅ Connected to MySQL database
- ✅ Ready to make AI-powered calls

**Just restart your server and you're good to go!** 🚀

