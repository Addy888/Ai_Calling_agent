# Asterisk AMI Graceful Degradation - Complete

## Summary

The Asterisk AMI service now handles TCP connection failures gracefully, allowing the NestJS application to remain fully operational even when the Asterisk telephony server is offline.

**Status:** ✅ **PRODUCTION READY**

---

## Problem Statement

### Before Fix

**Issue:** TCP connection failures to Asterisk AMI crashed the entire NestJS application

**Logs:**
```
TCP Connected: false
Greeter Received: false
Authenticated: false
❌ [Application crashes]
```

**Impact:**
- ❌ Entire backend terminates
- ❌ All services unavailable
- ❌ Requires manual restart
- ❌ Poor production reliability

### After Fix

**Result:** Application continues running when Asterisk is unavailable

**Logs:**
```
❌ ASTERISK AMI TCP CONNECTION FAILED
⚠️  Asterisk AMI Status: OFFLINE
✅ Application continues without telephony features
⏳ Will retry connection in 5000ms
```

**Impact:**
- ✅ Backend remains online
- ✅ Non-telephony features available
- ✅ Automatic reconnection
- ✅ Production-grade reliability

---

## Key Changes

### 1. Non-Blocking Initialization

```typescript
// ❌ BEFORE: Application waits and crashes if fails
async onModuleInit() {
  await this.connect(); // Blocks and throws
}

// ✅ AFTER: Application starts regardless
async onModuleInit() {
  this.connect().catch((error) => {
    this.logger.error('Initial connection failed');
    this.logger.warn('Application will continue');
  });
}
```

### 2. Enhanced TCP Error Detection

```typescript
socket.on('error', (error: NodeJS.ErrnoException) => {
  if (!tcpConnected) {
    // Detailed diagnostic based on error code
    if (error.code === 'ECONNREFUSED') {
      // Server not running
    } else if (error.code === 'ETIMEDOUT') {
      // Network timeout
    } else if (error.code === 'EHOSTUNREACH') {
      // Host unreachable
    } else if (error.code === 'ENETUNREACH') {
      // Network unreachable
    }
    
    this.logger.error('Asterisk AMI Status: OFFLINE');
    this.logger.log('Application continues without telephony');
  }
  
  // Don't throw - handle gracefully
  reject(error); // Promise rejection, not exception
});
```

### 3. Exponential Backoff Reconnection

```typescript
private getNextRetryDelay(): number {
  // 5s, 10s, 20s, 30s, 40s, 50s, 60s (max)
  const delays = [5000, 10000, 20000, 30000, 40000, 50000, 60000];
  const index = Math.min(this.reconnectAttempts, delays.length - 1);
  return delays[index];
}
```

### 4. Enhanced Health Status

```typescript
getHealth(): {
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING';
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  nextRetryIn?: number;
  // ... other fields
}
```

### 5. Clear Diagnostic Messages

```typescript
this.logger.error('═══════════════════════════════════════');
this.logger.error('❌ ASTERISK AMI TCP CONNECTION FAILED');
this.logger.error('═══════════════════════════════════════');
this.logger.error('Host: 192.168.1.4');
this.logger.error('Port: 5038');
this.logger.error('Error: connect ECONNREFUSED 192.168.1.4:5038');
this.logger.error('Code: ECONNREFUSED');
this.logger.error('');
this.logger.error('🔍 Diagnostic: Connection Refused');
this.logger.error('   Possible causes:');
this.logger.error('   1. Asterisk server is not running');
this.logger.error('   2. AMI is not enabled in manager.conf');
this.logger.error('   3. Firewall blocking port 5038');
// ... more diagnostics
```

---

## Connection States

### State Diagram

```
[Application Start]
      ↓
[AMI Initializing]
      ↓
[TCP Connect Attempt]
      ↓
  ┌───┴───┐
  ↓       ↓
[SUCCESS] [FAILURE]
  ↓       ↓
[ONLINE]  [OFFLINE]
  ↓       ↓
[Ready]   [Retry Scheduled]
          ↓
      [Wait 5-60s]
          ↓
      [Retry Connect]
          ↓
      [Max 10 attempts]
          ↓
      [Permanently Offline]
```

### Status Values

| Status | Meaning | Application State |
|--------|---------|-------------------|
| `ONLINE` | Connected & authenticated | Telephony features available |
| `OFFLINE` | Not connected | Running without telephony |
| `CONNECTING` | Connection in progress | Running, telephony pending |

---

## Reconnection Strategy

### Exponential Backoff

| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 | 5s | 5s |
| 2 | 10s | 15s |
| 3 | 20s | 35s |
| 4 | 30s | 65s (1m 5s) |
| 5 | 40s | 105s (1m 45s) |
| 6 | 50s | 155s (2m 35s) |
| 7 | 60s | 215s (3m 35s) |
| 8 | 60s | 275s (4m 35s) |
| 9 | 60s | 335s (5m 35s) |
| 10 | 60s | 395s (6m 35s) |
| **Max** | **Stop** | **~6.5 minutes** |

### After Max Attempts

```
═══════════════════════════════════════
❌ MAX RECONNECTION ATTEMPTS REACHED
═══════════════════════════════════════
Attempted 10 times to reconnect

⚠️  Asterisk AMI Status: PERMANENTLY OFFLINE
⚠️  Manual intervention required
✅ Application continues without telephony features

To fix:
  1. Check Asterisk server status
  2. Verify network connectivity
  3. Verify manager.conf configuration
  4. Restart the application after fixing
═══════════════════════════════════════
```

---

## Error Code Diagnostics

### ECONNREFUSED

**Meaning:** Connection actively refused by the server

**Diagnostic Output:**
```
🔍 Diagnostic: Connection Refused
   Possible causes:
   1. Asterisk server is not running
   2. AMI is not enabled in manager.conf
   3. Firewall blocking port 5038
   4. Wrong IP address: 192.168.1.4
   5. Wrong port: 5038 (should be AMI port, not SIP 5060/5061)
```

**How to Fix:**
```bash
# Check Asterisk status
systemctl status asterisk

# Check if AMI port is listening
netstat -tuln | grep 5038

# Start Asterisk
systemctl start asterisk

# Verify manager.conf
cat /etc/asterisk/manager.conf
```

### ETIMEDOUT

**Meaning:** Connection attempt timed out

**Diagnostic Output:**
```
🔍 Diagnostic: Connection Timeout
   Possible causes:
   1. Network connectivity issue
   2. Firewall dropping packets
   3. Host unreachable: 192.168.1.4
   4. Asterisk server not responding
```

**How to Fix:**
```bash
# Test network connectivity
ping 192.168.1.4

# Test port connectivity
telnet 192.168.1.4 5038

# Check firewall rules
iptables -L -n | grep 5038
```

### EHOSTUNREACH

**Meaning:** No route to host

**Diagnostic Output:**
```
🔍 Diagnostic: Host Unreachable
   Possible causes:
   1. Wrong IP address: 192.168.1.4
   2. Network routing issue
   3. Host is offline
```

**How to Fix:**
```bash
# Verify IP address
ping 192.168.1.4

# Check routing
route -n

# Verify host is on network
arp -a | grep 192.168.1.4
```

### ENETUNREACH

**Meaning:** Network is unreachable

**Diagnostic Output:**
```
🔍 Diagnostic: Network Unreachable
   Possible causes:
   1. No network connectivity
   2. Wrong network configuration
```

**How to Fix:**
```bash
# Check network interfaces
ip addr show

# Check default route
ip route show

# Test local network
ping <gateway-ip>
```

---

## Health Dashboard Integration

### Health Endpoint Response

```json
{
  "asterisk": {
    "connected": false,
    "authenticated": false,
    "host": "192.168.1.4",
    "port": 5038,
    "status": "OFFLINE",
    "reconnectAttempts": 3,
    "maxReconnectAttempts": 10,
    "nextRetryIn": 30000,
    "activeChannels": 0,
    "sipPeer": "GSM1"
  }
}
```

### Status Indicators

**ONLINE (Green):**
- ✅ TCP connected
- ✅ Authenticated
- ✅ Pinging successfully
- ✅ Ready for calls

**CONNECTING (Yellow):**
- 🔄 Connection attempt in progress
- ⏳ Waiting for authentication
- 🔄 Reconnection scheduled

**OFFLINE (Red):**
- ❌ TCP connection failed
- ❌ Not authenticated
- ⚠️  Telephony unavailable
- 🔄 Retry scheduled (if < 10 attempts)
- ❌ Permanently offline (if >= 10 attempts)

---

## Application Behavior

### Scenario 1: Asterisk Offline at Startup

**What Happens:**
1. Application starts normally
2. AMI connection attempt fails
3. Error logged with diagnostics
4. Application continues starting
5. All services except telephony available
6. Reconnection scheduled for 5 seconds
7. Health endpoint shows `status: "OFFLINE"`

**User Experience:**
- ✅ Backend API responsive
- ✅ Dashboard loads
- ✅ Can view campaigns
- ✅ Can manage contacts
- ⚠️  Cannot make calls
- ℹ️  Status indicator shows telephony offline

### Scenario 2: Asterisk Goes Offline During Runtime

**What Happens:**
1. Application running with Asterisk online
2. Asterisk server crashes/stops
3. Ping fails or connection closes
4. Error logged
5. Reconnection scheduled
6. Active calls may be dropped
7. New calls return "Telephony unavailable" error

**User Experience:**
- ✅ Backend continues running
- ⚠️  Active calls disconnected
- ❌ Cannot start new calls
- ℹ️  Dashboard shows telephony offline
- 🔄 System retrying connection

### Scenario 3: Asterisk Comes Back Online

**What Happens:**
1. Reconnection attempt succeeds
2. TCP connection established
3. Greeter received
4. Authentication successful
5. Status changes to `ONLINE`
6. Ping starts
7. Ready for calls

**User Experience:**
- ✅ Telephony features restored
- ✅ Can make calls again
- ✅ Dashboard shows online status
- 🎉 No manual intervention needed

### Scenario 4: Max Reconnection Attempts Reached

**What Happens:**
1. 10 reconnection attempts fail (over ~6.5 minutes)
2. Permanently marked offline
3. No more reconnection attempts
4. Detailed error logged
5. Manual intervention required

**User Experience:**
- ❌ Telephony permanently unavailable
- ⚠️  Admin notified (via logs/monitoring)
- ℹ️  Must fix Asterisk and restart application
- ✅ Other features still work

---

## Testing

### Test 1: Start Without Asterisk

```bash
# Stop Asterisk
systemctl stop asterisk

# Start application
npm run dev

# Expected:
✅ Application starts successfully
❌ ASTERISK AMI TCP CONNECTION FAILED
⚠️  Asterisk AMI Status: OFFLINE
✅ Application continues without telephony features
⏳ Will retry connection in 5000ms
```

### Test 2: Asterisk Offline, Then Online

```bash
# Start app without Asterisk
npm run dev

# Wait 30 seconds (see retry attempts)
# Then start Asterisk
systemctl start asterisk

# Expected:
🔄 Reconnection attempt 3/10...
✅ TCP connected to 192.168.1.4:5038
✅ Received Asterisk greeter
✅ Authenticated to Asterisk AMI
✅ Asterisk Production AMI ready
```

### Test 3: Asterisk Crashes During Runtime

```bash
# Start with Asterisk online
npm run dev

# After startup, stop Asterisk
systemctl stop asterisk

# Expected:
⚠️  Connection closed
⏳ Scheduling Asterisk AMI reconnection attempt 1/10 in 5s
```

### Test 4: Health Endpoint

```bash
# Check health
curl http://localhost:3001/api/v1/health/asterisk

# Response (offline):
{
  "status": "OFFLINE",
  "connected": false,
  "authenticated": false,
  "reconnectAttempts": 5,
  "nextRetryIn": 40000
}
```

---

## Monitoring & Alerts

### Log Patterns to Monitor

**Critical (Alert Immediately):**
```
❌ MAX RECONNECTION ATTEMPTS REACHED
⚠️  Asterisk AMI Status: PERMANENTLY OFFLINE
```

**Warning (Monitor):**
```
❌ ASTERISK AMI TCP CONNECTION FAILED
⏳ Scheduling Asterisk AMI reconnection attempt
```

**Info (Track):**
```
✅ Asterisk Production AMI ready
```

### Recommended Alerts

1. **Alert: AMI Permanently Offline**
   - Trigger: "MAX RECONNECTION ATTEMPTS REACHED"
   - Severity: Critical
   - Action: Check Asterisk server immediately

2. **Alert: AMI Connection Failures**
   - Trigger: 3+ failed connection attempts in 5 minutes
   - Severity: Warning
   - Action: Investigate network/Asterisk

3. **Alert: AMI Flapping**
   - Trigger: Multiple connect/disconnect cycles in 15 minutes
   - Severity: Warning
   - Action: Check stability

---

## Configuration

### Environment Variables

```bash
# Asterisk AMI Configuration
ASTERISK_HOST=192.168.1.4          # IP address
ASTERISK_AMI_PORT=5038             # AMI port (not SIP)
ASTERISK_AMI_USERNAME=admin        # manager.conf username
ASTERISK_AMI_SECRET=your-password  # manager.conf secret

# Reconnection Settings (built-in, not configurable)
# - Max attempts: 10
# - Backoff: 5s, 10s, 20s, 30s, 40s, 50s, 60s
# - Socket timeout: 10 seconds
```

---

## Production Checklist

### Before Deployment

- [ ] Verify Asterisk is running
- [ ] Test AMI connection manually
- [ ] Configure monitoring alerts
- [ ] Document recovery procedures
- [ ] Train team on offline behavior

### After Deployment

- [ ] Monitor health endpoint
- [ ] Watch for reconnection logs
- [ ] Verify graceful degradation
- [ ] Test user experience when offline
- [ ] Confirm automatic reconnection works

---

## Success Criteria

All criteria met ✅

- [x] Application starts without Asterisk
- [x] No unhandled exceptions
- [x] No process termination
- [x] Clear diagnostic messages
- [x] Exponential backoff reconnection
- [x] Health status exposed
- [x] Automatic reconnection works
- [x] Max attempts limit enforced
- [x] Error codes properly diagnosed
- [x] Production-ready logging

---

## Related Documentation

- `PRODUCTION_ISSUES_FIXED.md` - Original Redis & AMI fixes
- `QUICK_FIX_GUIDE.md` - Quick troubleshooting
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment steps

---

**Status:** ✅ PRODUCTION READY  
**Last Updated:** 2026-08-04  
**Tested:** Application continues running when Asterisk is offline
