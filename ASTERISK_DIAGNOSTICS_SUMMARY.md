# Asterisk AMI Diagnostics - Implementation Summary

## What Was Fixed

**Problem:** Application reported "Authentication timeout" for every Asterisk connection failure, even when TCP connection never succeeded.

**Solution:** Implemented detailed connection stage tracking and failure reason classification.

---

## Key Changes

### 1. Connection Stage Tracking

Added 7 distinct stages:
- `DISCONNECTED` - No connection
- `TCP_CONNECTING` - Attempting TCP
- `TCP_CONNECTED` - TCP established
- `WAITING_BANNER` - Waiting for AMI banner
- `BANNER_RECEIVED` - Banner received
- `AUTHENTICATING` - Sending credentials
- `AUTHENTICATED` - Fully connected

### 2. Failure Reason Classification

Added 7 failure types:
- `TCP_CONNECTION_FAILED` - Generic TCP error
- `CONNECTION_REFUSED` - ECONNREFUSED
- `CONNECTION_TIMEOUT` - ETIMEDOUT
- `AMI_BANNER_TIMEOUT` - Banner not received
- `AUTHENTICATION_FAILED` - Invalid credentials
- `AUTHENTICATION_TIMEOUT` - Auth response timeout
- `CONNECTION_CLOSED` - Connection closed

### 3. Enhanced Logging

**Before:**
```
❌ Reason: Authentication timeout
```

**After:**
```
┌─────────────────────────────────────────────┐
│  Asterisk OFFLINE                          │
├─────────────────────────────────────────────┤
│  Stage: TCP_CONNECTING                      │
│  Last Attempt: 8/4/2026, 12:00:00 PM       │
│  Next Retry: 8/4/2026, 12:00:10 PM         │
│  Reason: Connection refused (192.168.1.4...)│
└─────────────────────────────────────────────┘
```

### 4. Health Dashboard Integration

Now shows:
- Connection stage
- Failure type
- Precise error message
- Troubleshooting hints

---

## Benefits

### ✅ Accurate Diagnosis

Each failure type maps to specific problem:

| Failure | Problem | Fix |
|---------|---------|-----|
| `CONNECTION_REFUSED` | Asterisk down | Start Asterisk |
| `CONNECTION_TIMEOUT` | Network issue | Check firewall |
| `AMI_BANNER_TIMEOUT` | AMI disabled | Enable in manager.conf |
| `AUTHENTICATION_FAILED` | Wrong credentials | Check username/password |

### ✅ Faster Troubleshooting

Clear error messages eliminate guesswork:
- "Connection refused" → Check if Asterisk running
- "AMI banner not received" → Check AMI enabled
- "Invalid username or password" → Check credentials

### ✅ Better Monitoring

Production alerts based on failure type:
- TCP failures → Infrastructure alert
- Auth failures → Configuration alert
- Banner timeouts → Service alert

---

## Files Modified

1. **asterisk-production-ami.service.ts**
   - Added `ConnectionStage` type
   - Added `FailureReason` type
   - Enhanced `connect()` method
   - Improved error handling
   - Updated health reporting

2. **health.service.ts**
   - Enhanced AMI health check
   - Added detailed failure messages
   - Improved status reporting

---

## Testing

### Test Scenarios

1. ✅ Asterisk offline → Shows "Connection refused"
2. ✅ Network timeout → Shows "TCP connection timeout"
3. ✅ AMI disabled → Shows "AMI banner not received"
4. ✅ Wrong password → Shows "Invalid AMI username or password"
5. ✅ Auth timeout → Shows "Authentication timeout" (only when appropriate)

### Verification

```bash
# Check health endpoint
curl http://localhost:3001/api/v1/health/asterisk

# Response includes:
# - stage: Current connection stage
# - failureType: Specific failure reason
# - reason: Human-readable message
```

---

## Documentation

Created comprehensive documentation:

1. **ASTERISK_DIAGNOSTICS_COMPLETE.md**
   - Full implementation details
   - Connection flow diagrams
   - Test scenarios
   - Code changes

2. **ASTERISK_TROUBLESHOOTING_GUIDE.md**
   - Quick diagnosis steps
   - Common issues and fixes
   - Configuration checklist
   - Verification commands

3. **ASTERISK_DIAGNOSTICS_SUMMARY.md** (this file)
   - High-level overview
   - Key changes
   - Benefits

---

## Configuration

### Required Settings

```bash
# .env
ASTERISK_HOST=192.168.1.4
ASTERISK_AMI_PORT=5038  # Must be 5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your-password
```

### Asterisk Setup

```ini
# /etc/asterisk/manager.conf
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]
secret = your-password
read = all
write = all
```

---

## Success Criteria

All requirements met ✅

- [x] TCP failures differentiated from auth failures
- [x] Never show "Authentication timeout" for TCP failures
- [x] Banner timeout detected separately
- [x] Invalid credentials identified correctly
- [x] Connection stage visible
- [x] Failure reason exposed
- [x] Health dashboard integration
- [x] No crashes or exceptions
- [x] TypeScript compiles

---

## Next Steps

1. **Deploy to Production**
   - Update `.env` with correct credentials
   - Verify Asterisk configuration
   - Test connection

2. **Monitor Health Dashboard**
   - Watch for connection stages
   - Track failure types
   - Set up alerts

3. **Troubleshooting**
   - Use failure type to diagnose issues
   - Follow troubleshooting guide
   - Check connection stage

---

## Related Documentation

- `PRODUCTION_ASTERISK_SERVICE.md` - Background service
- `INFRASTRUCTURE_FIXES_COMPLETE.md` - All infrastructure fixes
- `ASTERISK_GRACEFUL_DEGRADATION.md` - Graceful degradation

---

**Status:** ✅ PRODUCTION READY  
**Date:** 2026-08-04  
**Result:** Precise diagnostics, accurate failure reporting, improved troubleshooting
