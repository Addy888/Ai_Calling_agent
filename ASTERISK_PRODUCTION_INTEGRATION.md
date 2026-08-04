# Asterisk Production Integration Guide

**Enterprise AI Calling Platform - Production Asterisk Integration**

---

## 📋 Overview

This document provides complete instructions for integrating the AI Calling Platform with your production Asterisk 1.8.23.0 server.

**Server Details:**
- **Asterisk IP**: 192.168.1.4
- **Asterisk Version**: 1.8.23.0
- **GSM Gateway**: Dinstar @ 192.168.1.8
- **SIP Peer**: GSM1
- **Codecs**: gsm, ulaw, alaw, g729

---

## ✅ What Has Been Implemented

### 1. Production AMI Client
- ✅ Direct TCP connection to Asterisk AMI
- ✅ Auto-reconnection with exponential backoff
- ✅ Event stream processing
- ✅ Action/Response correlation
- ✅ Ping/keepalive monitoring

**File**: `apps/api/src/modules/telephony-engine/services/asterisk-production-ami.service.ts`

### 2. Campaign Call Dispatcher
- ✅ BullMQ queue integration
- ✅ SIM allocation strategy
- ✅ Call origination via AMI
- ✅ Real-time event tracking
- ✅ Resource management

**File**: `apps/api/src/modules/telephony-engine/services/campaign-call-dispatcher.service.ts`

### 3. Asterisk Diagnostics
- ✅ System health monitoring
- ✅ SIP peer (GSM1) status
- ✅ Channel monitoring
- ✅ Recording path validation
- ✅ AI services health

**File**: `apps/api/src/modules/telephony-engine/services/asterisk-diagnostics.service.ts`

### 4. Admin Dashboard API
- ✅ Real-time monitoring endpoints
- ✅ Active calls tracking
- ✅ Gateway status
- ✅ SIM card management
- ✅ Queue statistics

**File**: `apps/api/src/modules/telephony-engine/asterisk-admin.controller.ts`

---

## 🔧 Configuration Setup

### Step 1: Update Environment Variables

Open `.env` file and configure:

```bash
# =========================================================
# ASTERISK - PRODUCTION CONFIGURATION
# =========================================================

ASTERISK_ENABLED=true
ASTERISK_HOST=192.168.1.4
ASTERISK_VERSION=1.8.23.0

# AMI Configuration (UPDATE THESE)
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=YOUR_AMI_PASSWORD_HERE
ASTERISK_AMI_EVENTS=true

# AGI Configuration
ASTERISK_AGI_PORT=4573
ASTERISK_AGI_ENABLED=true

# Dialplan
ASTERISK_CONTEXT=ai-calling
ASTERISK_EXTENSION=s
ASTERISK_PRIORITY=1

# Recording
ASTERISK_RECORDING_ENABLED=true
ASTERISK_RECORDING_PATH=/var/spool/asterisk/monitor
ASTERISK_RECORDING_FORMAT=wav

# Connection Settings
ASTERISK_CONNECTION_TIMEOUT=30000
ASTERISK_MAX_RECONNECT_ATTEMPTS=10
ASTERISK_RECONNECT_INTERVAL=5000
ASTERISK_HEALTH_CHECK_INTERVAL_MS=30000

# =========================================================
# GSM GATEWAY - DINSTAR
# =========================================================

GSM_GATEWAY_ENABLED=true
GSM_GATEWAY_VENDOR=Dinstar
GSM_GATEWAY_MODEL=UC2000-VG-16G
GSM_GATEWAY_HOST=192.168.1.8
GSM_GATEWAY_IP=192.168.1.8
GSM_GATEWAY_PORT=5060
GSM_GATEWAY_NAME=Dinstar-Gateway-1

# SIP Peer
SIP_PEER_NAME=GSM1
SIP_PEER_TYPE=peer
SIP_PEER_CONTEXT=ai-calling
SIP_PEER_HOST=192.168.1.8
SIP_PEER_PORT=5060

# Codecs (order of preference)
SIP_CODECS=gsm,ulaw,alaw,g729
SIP_CODEC_GSM=yes
SIP_CODEC_ULAW=yes
SIP_CODEC_ALAW=yes
SIP_CODEC_G729=yes

# SIM Configuration
GSM_TOTAL_SIMS=16
GSM_TOTAL_PORTS=16

# Gateway Monitoring
GSM_GATEWAY_HEALTH_CHECK_INTERVAL=60000
GSM_GATEWAY_PING_TIMEOUT=5000
GSM_GATEWAY_MAX_FAILURES=3
```

### Step 2: Get AMI Credentials

**Important**: You need to obtain the AMI credentials from your Asterisk server.

#### Option A: Check Asterisk Manager Configuration

SSH to your Asterisk server (192.168.1.4) and check:

```bash
cat /etc/asterisk/manager.conf
```

Look for:
```ini
[admin]
secret=YOUR_PASSWORD
permit=192.168.1.0/255.255.255.0
read=all
write=all
```

#### Option B: Create New AMI User

If you need to create a new user:

```bash
# SSH to Asterisk server
ssh root@192.168.1.4

# Edit manager.conf
nano /etc/asterisk/manager.conf

# Add new user
[aicallagent]
secret=SuperSecurePassword123
permit=192.168.1.0/255.255.255.0
read=system,call,log,verbose,command,agent,user,config
write=system,call,log,verbose,command,agent,user,config
deny=0.0.0.0/0.0.0.0

# Reload Asterisk
asterisk -rx "manager reload"
```

Then update `.env`:
```bash
ASTERISK_AMI_USERNAME=aicallagent
ASTERISK_AMI_SECRET=SuperSecurePassword123
```

---

## 🚀 Installation & Deployment

### Step 1: Install Dependencies

```bash
# Install asterisk-manager library
npm install asterisk-manager

# Or if using yarn
yarn add asterisk-manager
```

### Step 2: Build the API

```bash
cd apps/api
npm run build
```

### Step 3: Start the Services

#### Option A: Development Mode

```bash
# Terminal 1: Start API
cd apps/api
npm run start:dev

# Terminal 2: Start Web
cd apps/web
npm run dev
```

#### Option B: Production Mode

```bash
# Build all
npm run build

# Start API
cd apps/api
npm run start:prod

# Start Web (use PM2)
cd apps/web
pm2 start npm --name "ai-calling-web" -- start
```

---

## 📞 Call Flow Implementation

### Complete Call Flow

```
1. User Creates Campaign
   ↓
2. Campaign Queued to BullMQ
   ↓
3. Worker Picks Up Job
   ↓
4. Select Best Gateway (Dinstar @ 192.168.1.8)
   ↓
5. Select Best SIM Card (Available port)
   ↓
6. Connect to Asterisk AMI (192.168.1.4:5038)
   ↓
7. Send Originate Action
   {
     Action: Originate
     Channel: SIP/{phoneNumber}@GSM1
     Context: ai-calling
     Exten: s
     Priority: 1
     CallerID: {simNumber}
     Async: true
   }
   ↓
8. Asterisk Executes Dialplan
   extensions.conf → Dial(SIP/${EXTEN}@GSM1)
   ↓
9. Call Routes to GSM Gateway (192.168.1.8)
   ↓
10. GSM Gateway Selects Physical SIM
    ↓
11. Call Goes Out via GSM Network
    ↓
12. Customer Answers
    ↓
13. AGI Script Activated
    ↓
14. Audio Stream to Whisper STT
    ↓
15. Text to Ollama LLM
    ↓
16. Response to Kokoro TTS
    ↓
17. Audio Playback to Customer
    ↓
18. Conversation Loop Continues
    ↓
19. Call Ends
    ↓
20. Resources Released
    ↓
21. Recording Saved to /var/spool/asterisk/monitor
    ↓
22. Call Statistics Updated
```

---

## 🔍 Testing the Integration

### Test 1: Check AMI Connection

```bash
curl -X GET http://localhost:3001/api/v1/asterisk/admin/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
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

### Test 2: Check SIP Peer (GSM1)

```bash
curl -X GET http://localhost:3001/api/v1/asterisk/admin/sip-peer/GSM1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "peer": "GSM1",
    "status": "OK",
    "address": "192.168.1.8:5060"
  }
}
```

### Test 3: Run System Diagnostics

```bash
curl -X GET http://localhost:3001/api/v1/asterisk/admin/diagnostics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "asterisk": {
      "running": true,
      "connected": true,
      "authenticated": true,
      "sipPeerStatus": {
        "peer": "GSM1",
        "status": "OK",
        "registered": true
      }
    },
    "gateway": {
      "name": "Dinstar-Gateway-1",
      "ip": "192.168.1.8",
      "reachable": true
    }
  }
}
```

### Test 4: Originate Test Call

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

## 📊 Admin Dashboard Endpoints

All endpoints require authentication and `system.admin` permission.

### 1. System Diagnostics
```
GET /api/v1/asterisk/admin/diagnostics
```
Complete system health check including:
- Asterisk status
- AMI connection
- Gateway status
- SIM cards
- Database
- Redis
- AI services

### 2. Real-time Monitoring
```
GET /api/v1/asterisk/admin/monitoring
```
Live monitoring data:
- Active calls
- Queued calls
- Today's calls
- Gateway status

### 3. Active Channels
```
GET /api/v1/asterisk/admin/channels
```
All active call channels with:
- Channel name
- Caller ID
- Destination
- Duration
- State

### 4. SIP Peers
```
GET /api/v1/asterisk/admin/sip-peers
```
All registered SIP peers

### 5. Gateway Status
```
GET /api/v1/asterisk/admin/gateway
```
GSM Gateway information

### 6. SIM Cards
```
GET /api/v1/asterisk/admin/sims
```
All SIM cards with status

### 7. Queue Statistics
```
GET /api/v1/asterisk/admin/queue/stats
```
BullMQ queue stats:
- Waiting jobs
- Active jobs
- Completed
- Failed

### 8. Health Summary
```
GET /api/v1/asterisk/admin/health
```
Quick health check of all services

---

## 🐛 Troubleshooting

### Issue 1: Cannot Connect to Asterisk

**Symptoms:**
```
❌ AMI connection error: ECONNREFUSED
```

**Solutions:**

1. **Check Asterisk is running:**
```bash
ssh root@192.168.1.4
asterisk -rx "core show version"
```

2. **Check AMI is enabled:**
```bash
cat /etc/asterisk/manager.conf | grep enabled
```
Should show: `enabled = yes`

3. **Check firewall:**
```bash
iptables -L -n | grep 5038
```

4. **Test connection manually:**
```bash
telnet 192.168.1.4 5038
```

### Issue 2: Authentication Failed

**Symptoms:**
```
❌ AMI authentication failed: Invalid credentials
```

**Solutions:**

1. **Verify credentials in manager.conf:**
```bash
cat /etc/asterisk/manager.conf
```

2. **Check permit/deny rules:**
```ini
permit=192.168.1.0/255.255.255.0
```

3. **Reload manager:**
```bash
asterisk -rx "manager reload"
```

### Issue 3: SIP Peer GSM1 Not Found

**Symptoms:**
```
Peer 'GSM1' not found
```

**Solutions:**

1. **Check SIP configuration:**
```bash
asterisk -rx "sip show peers"
```

2. **Check sip.conf:**
```bash
cat /etc/asterisk/sip.conf | grep -A 10 "\[GSM1\]"
```

3. **Reload SIP:**
```bash
asterisk -rx "sip reload"
```

### Issue 4: Calls Not Originating

**Symptoms:**
```
Originate failed: All circuits are busy
```

**Solutions:**

1. **Check gateway connectivity:**
```bash
ping 192.168.1.8
```

2. **Check SIP registration:**
```bash
asterisk -rx "sip show peer GSM1"
```

3. **Check available channels:**
```bash
asterisk -rx "core show channels"
```

4. **Check dialplan:**
```bash
asterisk -rx "dialplan show ai-calling"
```

### Issue 5: No Audio / One-way Audio

**Solutions:**

1. **Check RTP ports are open:**
```bash
# RTP range: 10000-20000
iptables -A INPUT -p udp --dport 10000:20000 -j ACCEPT
```

2. **Check NAT settings in sip.conf:**
```ini
nat=yes
localnet=192.168.1.0/255.255.255.0
externip=YOUR_PUBLIC_IP
```

3. **Check codec negotiation:**
```bash
asterisk -rx "sip show channels"
```

---

## 📈 Performance Optimization

### 1. Increase Max Concurrent Calls

Update `.env`:
```bash
MAX_CONCURRENT_CALLS=10  # Increase from 3
```

### 2. Optimize BullMQ

```bash
# Redis optimization
REDIS_MAXMEMORY=2gb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

### 3. Database Connection Pool

```bash
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=30000
```

### 4. Asterisk Optimization

Edit `/etc/asterisk/asterisk.conf`:
```ini
maxcalls=100
maxload=0.9
```

---

## 🔐 Security Checklist

- [ ] Change default AMI password
- [ ] Use strong passwords (16+ characters)
- [ ] Restrict AMI access by IP (permit directive)
- [ ] Enable SSL/TLS for AMI (if supported)
- [ ] Regularly rotate credentials
- [ ] Monitor failed login attempts
- [ ] Enable audit logging
- [ ] Restrict API access with JWT
- [ ] Use role-based access control
- [ ] Keep Asterisk updated

---

## 📝 Monitoring & Logging

### Application Logs

```bash
# API logs
tail -f apps/api/logs/application.log

# Error logs
tail -f apps/api/logs/error.log

# Asterisk logs
tail -f /var/log/asterisk/messages
tail -f /var/log/asterisk/full
```

### Performance Metrics

Monitor:
- AMI connection uptime
- Call success rate
- Average call duration
- Queue processing time
- SIM utilization
- Gateway performance

### Alerting

Set up alerts for:
- AMI disconnection
- Gateway unreachable
- High call failure rate
- Queue backlog
- Disk space (recordings)

---

## 🎯 Next Steps

### After Successful Connection

1. **Register GSM Gateway in Database:**
```bash
# Use the Admin Panel UI or run SQL:
INSERT INTO GSMGateway (name, ipAddress, port, model, vendor, totalPorts)
VALUES ('Dinstar-Gateway-1', '192.168.1.8', 5060, 'UC2000-VG-16G', 'Dinstar', 16);
```

2. **Register SIM Cards:**
```bash
# Use Admin Panel to add all 16 SIM cards
```

3. **Create Test Campaign:**
```bash
# Use Campaign Dashboard to create test campaign
```

4. **Monitor First Calls:**
```bash
# Watch real-time dashboard for call progress
```

---

## 📚 API Documentation

Full API documentation available at:
```
http://localhost:3001/api/docs
```

---

## 🆘 Support

For issues or questions:

1. **Check logs first:**
   - API logs: `apps/api/logs/`
   - Asterisk logs: `/var/log/asterisk/`

2. **Run diagnostics:**
   ```bash
   curl http://localhost:3001/api/v1/asterisk/admin/diagnostics
   ```

3. **Check configuration:**
   - `.env` file
   - Asterisk configs: `/etc/asterisk/`

---

## ✅ Integration Checklist

Use this checklist to ensure complete integration:

### Configuration
- [ ] Updated `.env` with Asterisk IP (192.168.1.4)
- [ ] Updated `.env` with AMI credentials
- [ ] Updated `.env` with Gateway IP (192.168.1.8)
- [ ] Verified SIP peer name (GSM1)
- [ ] Configured recording path
- [ ] Set max concurrent calls

### Dependencies
- [ ] Installed `asterisk-manager` package
- [ ] Installed all npm dependencies
- [ ] Built API successfully
- [ ] Built Web successfully

### Network
- [ ] Asterisk server reachable (ping 192.168.1.4)
- [ ] Gateway reachable (ping 192.168.1.8)
- [ ] AMI port accessible (telnet 192.168.1.4 5038)
- [ ] Firewall rules configured
- [ ] RTP ports open (10000-20000)

### Asterisk
- [ ] AMI enabled in manager.conf
- [ ] User credentials configured
- [ ] SIP peer GSM1 registered
- [ ] Dialplan exists for ai-calling context
- [ ] Recording path exists and writable
- [ ] Codecs configured (gsm, ulaw, alaw, g729)

### Database
- [ ] Gateway registered in GSMGateway table
- [ ] SIM cards registered in SIMCard table
- [ ] Proper indexes created
- [ ] Database connection verified

### Testing
- [ ] AMI connection successful
- [ ] SIP peer status OK
- [ ] Test call originated successfully
- [ ] Call events received
- [ ] Recording created
- [ ] Dashboard displays data

### Production
- [ ] SSL/TLS configured
- [ ] Authentication enforced
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Disaster recovery plan

---

## 🎉 Success Indicators

You'll know the integration is successful when:

1. ✅ Dashboard shows: `Asterisk: Connected`
2. ✅ SIP Peer GSM1: `Status: OK`
3. ✅ Test call completes successfully
4. ✅ Real-time events appear in dashboard
5. ✅ Recordings are saved automatically
6. ✅ Campaign calls queue and execute
7. ✅ AI conversation flows work
8. ✅ No errors in application logs

---

**Integration Status**: ✅ READY FOR DEPLOYMENT

Once AMI credentials are added to `.env`, the platform will automatically connect and start working with your production Asterisk server.

No further code changes required.
