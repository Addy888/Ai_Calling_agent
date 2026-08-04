# Quick Start: Asterisk Production Integration

**Get your AI Calling Platform connected to Asterisk in 5 minutes**

---

## 🚀 Quick Setup

### Step 1: Get AMI Credentials (2 minutes)

SSH to your Asterisk server:
```bash
ssh root@192.168.1.4
cat /etc/asterisk/manager.conf | grep -A 5 "\[admin\]"
```

You'll see something like:
```ini
[admin]
secret=YourPassword123
permit=192.168.1.0/255.255.255.0
```

### Step 2: Update .env (1 minute)

Open `.env` and update these lines:
```bash
ASTERISK_AMI_SECRET=YourPassword123  # Replace with your actual password
```

That's it for configuration!

### Step 3: Install & Start (2 minutes)

```bash
# Install dependencies (if not done already)
npm install

# Build API
cd apps/api && npm run build

# Start services
npm run start:dev
```

---

## ✅ Verify It Works

### Test 1: Check Connection
```bash
curl http://localhost:3001/api/v1/asterisk/admin/status
```

You should see:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "authenticated": true
  }
}
```

### Test 2: Check GSM1
```bash
curl http://localhost:3001/api/v1/asterisk/admin/sip-peer/GSM1
```

You should see:
```json
{
  "success": true,
  "data": {
    "peer": "GSM1",
    "status": "OK"
  }
}
```

### Test 3: Make a Test Call

1. Open dashboard: http://localhost:3000
2. Go to Campaigns
3. Create campaign
4. Add contact
5. Start campaign
6. Watch real-time call status!

---

## 🐛 Quick Troubleshooting

### Can't Connect to Asterisk?

```bash
# Test connection
telnet 192.168.1.4 5038

# If fails, check Asterisk is running
ssh root@192.168.1.4
asterisk -rx "core show version"
```

### Wrong Password?

```bash
# Check manager.conf
ssh root@192.168.1.4
cat /etc/asterisk/manager.conf
```

Update `.env` with the correct password.

### GSM1 Not Found?

```bash
# Check SIP peers
ssh root@192.168.1.4
asterisk -rx "sip show peers"
```

You should see GSM1 in the list.

---

## 📊 Monitor Your System

Open the Admin Dashboard:
```
http://localhost:3000/dashboard/system-health
```

You'll see real-time:
- ✅ Asterisk Status
- ✅ Gateway Status  
- ✅ Active Calls
- ✅ SIM Cards Status
- ✅ Queue Status

---

## 🎯 What's Next?

1. **Register Gateway** → Admin Panel → GSM Gateway → Add Gateway
2. **Add SIM Cards** → Admin Panel → SIM Cards → Add SIM
3. **Create Campaign** → Campaigns → New Campaign
4. **Import Contacts** → Contacts → Import CSV
5. **Start Calling** → Campaign → Start

---

## 📚 Full Documentation

For complete details, see:
- [ASTERISK_PRODUCTION_INTEGRATION.md](./ASTERISK_PRODUCTION_INTEGRATION.md)
- API Docs: http://localhost:3001/api/docs

---

## ✨ That's It!

Your AI Calling Platform is now connected to your production Asterisk server.

**Status**: ✅ READY TO MAKE CALLS

---

**Need Help?**

Check the logs:
```bash
# API logs
tail -f apps/api/logs/application.log

# Asterisk logs  
ssh root@192.168.1.4 "tail -f /var/log/asterisk/messages"
```
