# Quick Fix Guide - Production Issues

## Run Diagnostics

```bash
# Option 1: npm script
npm run diagnose

# Option 2: Direct execution (Windows)
scripts\diagnose-production.bat

# Option 3: Node directly
node scripts/diagnose-production.js
```

This will test both Redis and Asterisk AMI connectivity and provide detailed error messages.

---

## Issue 1: Redis Not Available

### Symptoms
```
❌ Failed to initialize BullMQ queue: connect ECONNREFUSED 127.0.0.1:6379
⚠️  Redis connection failed, falling back to in-memory cache
```

### Quick Fix

**Windows:**
```bash
# Install Redis (using Chocolatey)
choco install redis-64

# Start Redis
redis-server

# Or start as service
sc start Redis
```

**Alternative: Redis not required**
The application will run without Redis using in-memory cache. However:
- Queue features limited
- Cache not shared across instances
- Not suitable for multi-server deployment

### Verify Fix
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Or using the diagnostic script
npm run diagnose
```

---

## Issue 2: Asterisk AMI Connection Failure (TCP)

### Symptoms
```
❌ ASTERISK AMI TCP CONNECTION FAILED
TCP Connected: false
Greeter Received: false
Authenticated: false
```

### ✅ Application Behavior (Correct)
The application **SHOULD CONTINUE RUNNING** even when Asterisk is offline.

**Expected logs:**
```
❌ ASTERISK AMI TCP CONNECTION FAILED
⚠️  Asterisk AMI Status: OFFLINE
✅ Application continues without telephony features
⏳ Will retry connection in 5000ms
```

This is **NOT a bug** - it's graceful degradation.

### Quick Fixes

#### Fix 1: Wrong Port (Most Common)
```bash
# Check your .env file
ASTERISK_AMI_PORT=5038  # ✅ Correct (AMI port)
# NOT 5060 or 5061 (SIP ports)
```

#### Fix 2: Verify Asterisk Configuration
SSH to Asterisk server (192.168.1.4):
```bash
# Check manager.conf
cat /etc/asterisk/manager.conf

# Must have:
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]
secret = your-password
read = all
write = all

# Reload Asterisk manager
asterisk -rx "manager reload"
```

#### Fix 3: Test Manually
```bash
# From Windows machine
telnet 192.168.1.4 5038

# You should see:
Asterisk Call Manager/1.1

# If you see this, AMI is working!
```

#### Fix 4: Check Credentials
Update your `.env` file:
```bash
ASTERISK_AMI_USERNAME=admin  # Must match manager.conf
ASTERISK_AMI_SECRET=your-actual-password  # Must match manager.conf
```

### Verify Fix
```bash
# Using diagnostic script
npm run diagnose

# Should show:
✅ TCP connection established
✅ Received greeter: Asterisk Call Manager/1.1
✅ Authentication successful!
✅ Asterisk AMI is ready
```

---

## Start Application

After fixing both issues:

```bash
# Terminal 1: Start API server
cd apps/api
npm run dev

# Terminal 2: Start Web UI
cd apps/web
npm run dev
```

### Expected Logs (Success)

**Redis:**
```
✅ Redis connected: localhost:6379
✅ BullMQ queue initialized
✅ Redis cache store initialized successfully
```

**Asterisk AMI:**
```
🔌 Connecting to Asterisk AMI at 192.168.1.4:5038...
✅ TCP connected to 192.168.1.4:5038
📨 Received Asterisk greeter: Asterisk Call Manager/1.1
🔐 Sending login credentials...
✅ Authenticated to Asterisk AMI
✅ Asterisk Production AMI ready
```

---

## Still Having Issues?

### Check Network
```bash
# Ping Asterisk server
ping 192.168.1.4

# Test port connectivity
Test-NetConnection -ComputerName 192.168.1.4 -Port 5038
```

### Check Environment Variables
```bash
# Print current config
echo %ASTERISK_HOST%
echo %ASTERISK_AMI_PORT%
echo %REDIS_HOST%
echo %REDIS_PORT%
```

### Review Full Documentation
See `PRODUCTION_ISSUES_FIXED.md` for detailed information.

---

## Emergency Contacts

If all else fails:
1. Check application logs in `apps/api/logs/`
2. Check Asterisk logs: `/var/log/asterisk/full`
3. Verify all services are running
4. Review firewall rules
5. Contact system administrator

---

## Files Changed

These files were modified to fix the issues:
- `apps/api/src/modules/telephony-engine/services/campaign-call-dispatcher.service.ts`
- `apps/api/src/modules/telephony-engine/services/asterisk-production-ami.service.ts`
- `apps/api/src/common/cache/cache.module.ts`

All changes are backward compatible and include graceful degradation.
