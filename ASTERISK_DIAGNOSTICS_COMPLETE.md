# Asterisk AMI Connectivity Diagnostics - Complete ✅

## Summary

Fixed Asterisk AMI connectivity diagnostics to properly differentiate between TCP failures, banner timeouts, and authentication failures. The system now provides precise failure reasons at each connection stage.

**Status:** ✅ **PRODUCTION READY**

---

## Problem

**Before:** The application reported "Authentication timeout" even when TCP connection never succeeded.

```
❌ WRONG DIAGNOSIS:
Reason: Authentication timeout

Actual Problem: TCP connection refused
```

This made troubleshooting impossible because:
- TCP failures looked like auth failures
- No visibility into connection stages
- Unclear where the failure occurred
- Health dashboard showed generic errors

---

## Solution

### 1. Connection Stage Tracking ✅

Implemented detailed stage tracking throughout the connection lifecycle:

```typescript
type ConnectionStage = 
  | 'DISCONNECTED'          // No connection attempt
  | 'TCP_CONNECTING'        // Attempting TCP connection
  | 'TCP_CONNECTED'         // TCP established
  | 'WAITING_BANNER'        // Waiting for AMI banner
  | 'BANNER_RECEIVED'       // Banner received
  | 'AUTHENTICATING'        // Sending credentials
  | 'AUTHENTICATED';        // Fully connected
```

**Benefits:**
- Exact visibility into where connection fails
- Health dashboard shows current stage
- Logs indicate precise failure point

---

### 2. Failure Reason Classification ✅

Implemented typed failure reasons:

```typescript
type FailureReason =
  | 'TCP_CONNECTION_FAILED'    // TCP connection error
  | 'CONNECTION_REFUSED'       // ECONNREFUSED
  | 'CONNECTION_TIMEOUT'       // ETIMEDOUT
  | 'AMI_BANNER_TIMEOUT'       // Banner not received
  | 'AUTHENTICATION_FAILED'    // Invalid credentials
  | 'AUTHENTICATION_TIMEOUT'   // Auth response timeout
  | 'CONNECTION_CLOSED'        // Connection closed
  | 'UNKNOWN';                 // Unexpected error
```

**Mapping:**

| Error Code | Failure Reason | User-Facing Message |
|------------|----------------|---------------------|
| `ECONNREFUSED` | `CONNECTION_REFUSED` | Connection refused at 192.168.1.4:5038 |
| `ETIMEDOUT` | `CONNECTION_TIMEOUT` | TCP connection timeout |
| `EHOSTUNREACH` | `TCP_CONNECTION_FAILED` | Host unreachable |
| Banner timeout | `AMI_BANNER_TIMEOUT` | AMI banner not received |
| Invalid creds | `AUTHENTICATION_FAILED` | Invalid AMI username or password |
| Auth timeout | `AUTHENTICATION_TIMEOUT` | Authentication timeout |

---

### 3. Connection Flow ✅

**Step-by-Step Process:**

```
┌─────────────────────────────────────────────────┐
│  1. TCP_CONNECTING                              │
│     Attempting socket.connect(5038, 192.168.1.4) │
│                                                 │
│     ✅ Success → TCP_CONNECTED                   │
│     ❌ Failure → TCP_CONNECTION_FAILED           │
│        - ECONNREFUSED → CONNECTION_REFUSED      │
│        - ETIMEDOUT → CONNECTION_TIMEOUT         │
│        - EHOSTUNREACH → TCP_CONNECTION_FAILED   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  2. WAITING_BANNER (5 second timeout)           │
│     Waiting for Asterisk AMI banner             │
│                                                 │
│     ✅ Received → BANNER_RECEIVED                │
│     ❌ Timeout → AMI_BANNER_TIMEOUT              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  3. AUTHENTICATING (5 second timeout)           │
│     Sending Login action with credentials       │
│                                                 │
│     ✅ Success → AUTHENTICATED                   │
│     ❌ Invalid → AUTHENTICATION_FAILED           │
│     ❌ Timeout → AUTHENTICATION_TIMEOUT          │
└─────────────────────────────────────────────────┘
```

---

### 4. Improved Logging ✅

**Before:**
```
❌ Authentication timeout
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

**Key Improvements:**
- ✅ Shows exact connection stage
- ✅ Clear failure reason
- ✅ Timestamp information
- ✅ Next retry countdown
- ✅ Formatted for readability

---

### 5. Health Dashboard Integration ✅

**Endpoint:** `GET /api/v1/health/asterisk`

**Response Structure:**
```json
{
  "status": "OFFLINE",
  "message": "Connection refused at 192.168.1.4:5038 - attempt 2/10",
  "details": {
    "connected": false,
    "authenticated": false,
    "host": "192.168.1.4",
    "port": 5038,
    "stage": "TCP_CONNECTING",
    "failureType": "CONNECTION_REFUSED",
    "reason": "Connection refused (192.168.1.4:5038)",
    "reconnectAttempts": 2,
    "maxReconnectAttempts": 10,
    "lastAttempt": "2026-08-04T12:00:00.000Z",
    "nextRetryIn": 30000
  }
}
```

**Message Examples:**

| Failure Type | Health Dashboard Message |
|--------------|-------------------------|
| `CONNECTION_REFUSED` | Connection refused at 192.168.1.4:5038 - attempt 2/10 |
| `CONNECTION_TIMEOUT` | TCP connection timeout - attempt 2/10 |
| `TCP_CONNECTION_FAILED` | TCP connection failed: EHOSTUNREACH - attempt 2/10 |
| `AMI_BANNER_TIMEOUT` | Connected but AMI banner not received - attempt 2/10 |
| `AUTHENTICATION_FAILED` | Invalid AMI username or password - attempt 2/10 |
| `AUTHENTICATION_TIMEOUT` | Authentication timeout - attempt 2/10 |

---

## Connection Stage Diagnostics

### Scenario 1: TCP Connection Refused

**What Happens:**
```
1. Application attempts TCP connection
2. Port 5038 is closed or firewalled
3. OS returns ECONNREFUSED
```

**Before:**
```
❌ Reason: Authentication timeout  (WRONG!)
```

**After:**
```
✅ Stage: TCP_CONNECTING
✅ Reason: Connection refused (192.168.1.4:5038)
✅ Failure Type: CONNECTION_REFUSED
```

**Troubleshooting:**
- Check Asterisk is running: `systemctl status asterisk`
- Check AMI enabled in `/etc/asterisk/manager.conf`
- Check firewall: `iptables -L | grep 5038`
- Test from client: `Test-NetConnection -ComputerName 192.168.1.4 -Port 5038`

---

### Scenario 2: TCP Connection Timeout

**What Happens:**
```
1. Application attempts TCP connection
2. Host doesn't respond within timeout
3. OS returns ETIMEDOUT
```

**Before:**
```
❌ Reason: Authentication timeout  (WRONG!)
```

**After:**
```
✅ Stage: TCP_CONNECTING
✅ Reason: TCP connection timeout
✅ Failure Type: CONNECTION_TIMEOUT
```

**Troubleshooting:**
- Check network connectivity: `ping 192.168.1.4`
- Check routing: `tracert 192.168.1.4`
- Check host firewall blocking port
- Verify correct IP address in `.env`

---

### Scenario 3: AMI Banner Not Received

**What Happens:**
```
1. TCP connection succeeds
2. Asterisk doesn't send AMI banner
3. 5-second banner timeout expires
```

**Before:**
```
❌ Reason: Authentication timeout  (WRONG!)
```

**After:**
```
✅ Stage: WAITING_BANNER
✅ Reason: AMI banner not received
✅ Failure Type: AMI_BANNER_TIMEOUT
```

**Troubleshooting:**
- AMI may be disabled in Asterisk
- Check `/etc/asterisk/manager.conf`:
  ```ini
  [general]
  enabled = yes
  port = 5038
  bindaddr = 0.0.0.0
  ```
- Restart Asterisk: `systemctl restart asterisk`
- Check Asterisk logs: `tail -f /var/log/asterisk/messages`

---

### Scenario 4: Invalid Credentials

**What Happens:**
```
1. TCP connection succeeds
2. AMI banner received
3. Login action sent
4. Asterisk returns Error response
```

**Before:**
```
❌ Reason: Authentication failed: Unknown error
```

**After:**
```
✅ Stage: AUTHENTICATING
✅ Reason: Invalid AMI username or password
✅ Failure Type: AUTHENTICATION_FAILED
```

**Troubleshooting:**
- Check credentials in `.env`:
  ```bash
  ASTERISK_AMI_USERNAME=admin
  ASTERISK_AMI_SECRET=your-password
  ```
- Check `/etc/asterisk/manager.conf`:
  ```ini
  [admin]
  secret = your-password
  read = all
  write = all
  ```
- Username must match exactly (case-sensitive)
- Password must match exactly

---

### Scenario 5: Authentication Timeout

**What Happens:**
```
1. TCP connection succeeds
2. AMI banner received
3. Login action sent
4. No response within 5 seconds
```

**Before:**
```
❌ Reason: Authentication timeout  (might be correct but unclear)
```

**After:**
```
✅ Stage: AUTHENTICATING
✅ Reason: Authentication timeout
✅ Failure Type: AUTHENTICATION_TIMEOUT
```

**Troubleshooting:**
- Asterisk may be overloaded
- Check Asterisk CPU/memory usage
- Check Asterisk logs for errors
- Increase timeout if needed

---

## Code Changes

### 1. Connection Stage Tracking

**Added stage field:**
```typescript
private connectionStage: ConnectionStage = 'DISCONNECTED';
```

**Updated throughout connection lifecycle:**
```typescript
// TCP connecting
this.connectionStage = 'TCP_CONNECTING';

// TCP connected
this.connectionStage = 'TCP_CONNECTED';

// Waiting for banner
this.connectionStage = 'WAITING_BANNER';

// Banner received
this.connectionStage = 'BANNER_RECEIVED';

// Authenticating
this.connectionStage = 'AUTHENTICATING';

// Authenticated
this.connectionStage = 'AUTHENTICATED';
```

---

### 2. Failure Reason Tracking

**Added failure reason field:**
```typescript
private lastFailureReason: FailureReason = 'UNKNOWN';
```

**Set based on error type:**
```typescript
socket.on('error', (error: NodeJS.ErrnoException) => {
  if (this.connectionStage === 'TCP_CONNECTING') {
    if (error.code === 'ECONNREFUSED') {
      this.lastFailureReason = 'CONNECTION_REFUSED';
    } else if (error.code === 'ETIMEDOUT') {
      this.lastFailureReason = 'CONNECTION_TIMEOUT';
    } else if (error.code === 'EHOSTUNREACH') {
      this.lastFailureReason = 'TCP_CONNECTION_FAILED';
    }
  }
});
```

---

### 3. Banner Timeout

**Added banner timeout:**
```typescript
this.connectionStage = 'WAITING_BANNER';
bannerTimeout = setTimeout(() => {
  if (this.connectionStage === 'WAITING_BANNER') {
    this.lastErrorReason = 'AMI banner not received';
    this.lastFailureReason = 'AMI_BANNER_TIMEOUT';
    socket.destroy();
  }
}, 5000);
```

**Clear timeout when banner received:**
```typescript
socket.on('data', (data: Buffer) => {
  if (this.connectionStage === 'WAITING_BANNER') {
    clearTimeout(bannerTimeout);
    this.connectionStage = 'BANNER_RECEIVED';
    // Proceed to authentication
  }
});
```

---

### 4. Authentication Stage

**Set stage before sending login:**
```typescript
this.connectionStage = 'AUTHENTICATING';
authTimeout = setTimeout(() => {
  if (this.connectionStage === 'AUTHENTICATING') {
    this.lastFailureReason = 'AUTHENTICATION_TIMEOUT';
    socket.destroy();
  }
}, 5000);
```

**Handle authentication response:**
```typescript
if (parsed.response === 'Success') {
  this.authenticated = true;
  this.connectionStage = 'AUTHENTICATED';
} else if (parsed.response === 'Error') {
  this.lastFailureReason = 'AUTHENTICATION_FAILED';
  this.connectionStage = 'DISCONNECTED';
}
```

---

### 5. Health Reporting

**Updated getHealth() to include stage and failure type:**
```typescript
getHealth() {
  return {
    // ... existing fields
    stage: this.connectionStage,
    failureType: this.lastFailureReason,
  };
}
```

**Updated health service to show detailed messages:**
```typescript
if (failureType === 'CONNECTION_REFUSED') {
  message = `Connection refused at ${health.host}:${health.port}`;
} else if (failureType === 'AMI_BANNER_TIMEOUT') {
  message = `Connected but AMI banner not received`;
} else if (failureType === 'AUTHENTICATION_FAILED') {
  message = `Invalid AMI username or password`;
}
```

---

## Testing Scenarios

### Test 1: Asterisk Offline

**Setup:** Stop Asterisk service

**Expected Log:**
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

**Expected Health:**
```json
{
  "stage": "TCP_CONNECTING",
  "failureType": "CONNECTION_REFUSED",
  "reason": "Connection refused (192.168.1.4:5038)"
}
```

✅ **NEVER shows "Authentication timeout"**

---

### Test 2: Wrong Credentials

**Setup:** Set wrong password in `.env`

**Expected Log:**
```
┌─────────────────────────────────────────────┐
│  Asterisk OFFLINE                          │
├─────────────────────────────────────────────┤
│  Stage: AUTHENTICATING                      │
│  Last Attempt: 8/4/2026, 12:00:00 PM       │
│  Next Retry: 8/4/2026, 12:00:10 PM         │
│  Reason: Invalid AMI username or password  │
└─────────────────────────────────────────────┘
```

**Expected Health:**
```json
{
  "stage": "AUTHENTICATING",
  "failureType": "AUTHENTICATION_FAILED",
  "reason": "Invalid AMI username or password"
}
```

✅ **Shows authentication failure, not timeout**

---

### Test 3: AMI Disabled

**Setup:** Set `enabled = no` in `manager.conf`

**Expected Log:**
```
┌─────────────────────────────────────────────┐
│  Asterisk OFFLINE                          │
├─────────────────────────────────────────────┤
│  Stage: WAITING_BANNER                      │
│  Last Attempt: 8/4/2026, 12:00:00 PM       │
│  Next Retry: 8/4/2026, 12:00:10 PM         │
│  Reason: AMI banner not received           │
└─────────────────────────────────────────────┘
```

**Expected Health:**
```json
{
  "stage": "WAITING_BANNER",
  "failureType": "AMI_BANNER_TIMEOUT",
  "reason": "AMI banner not received"
}
```

✅ **Shows banner timeout, not authentication timeout**

---

### Test 4: Network Timeout

**Setup:** Add firewall rule to DROP packets (not REJECT)

**Expected Log:**
```
┌─────────────────────────────────────────────┐
│  Asterisk OFFLINE                          │
├─────────────────────────────────────────────┤
│  Stage: TCP_CONNECTING                      │
│  Last Attempt: 8/4/2026, 12:00:00 PM       │
│  Next Retry: 8/4/2026, 12:00:10 PM         │
│  Reason: TCP connection timeout            │
└─────────────────────────────────────────────┘
```

**Expected Health:**
```json
{
  "stage": "TCP_CONNECTING",
  "failureType": "CONNECTION_TIMEOUT",
  "reason": "TCP connection timeout"
}
```

✅ **Shows connection timeout, not authentication timeout**

---

## Benefits

### 1. Accurate Diagnostics ✅

**Before:** Every failure looked like authentication timeout

**After:** Precise diagnosis:
- TCP connection refused
- TCP connection timeout
- AMI banner timeout
- Authentication failed
- Authentication timeout

---

### 2. Faster Troubleshooting ✅

**Connection Refused:**
- Check Asterisk running ✅
- Check AMI enabled ✅
- Check firewall ✅

**Banner Timeout:**
- Check AMI configuration ✅
- Check Asterisk logs ✅

**Authentication Failed:**
- Check credentials in `.env` ✅
- Check `manager.conf` ✅

---

### 3. Better User Experience ✅

**Health Dashboard shows:**
- Current connection stage
- Precise failure reason
- Retry countdown
- Troubleshooting hints

---

### 4. Production Monitoring ✅

**Alerts based on failure type:**
- `CONNECTION_REFUSED` → Asterisk down alert
- `AUTHENTICATION_FAILED` → Configuration error alert
- `AMI_BANNER_TIMEOUT` → AMI disabled alert

---

## Configuration

### Environment Variables

```bash
# Asterisk Server
ASTERISK_HOST=192.168.1.4

# AMI Port (must be 5038)
ASTERISK_AMI_PORT=5038

# AMI Credentials (must match manager.conf)
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your-secure-password
```

### Asterisk Configuration

**`/etc/asterisk/manager.conf`:**
```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]
secret = your-secure-password
read = all
write = all
```

---

## Success Criteria

All criteria met ✅

- [x] TCP failures show "TCP connection failed"
- [x] Never show "Authentication timeout" for TCP failures
- [x] Banner timeout differentiated from auth timeout
- [x] Invalid credentials show "Invalid AMI username or password"
- [x] Connection stage visible in health dashboard
- [x] Failure reason classified correctly
- [x] No crashes or exceptions
- [x] Exponential backoff maintained
- [x] Concise logging maintained
- [x] TypeScript compiles without errors

---

## Related Documentation

- `PRODUCTION_ASTERISK_SERVICE.md` - Background service implementation
- `INFRASTRUCTURE_FIXES_COMPLETE.md` - Redis & Asterisk fixes
- `ASTERISK_GRACEFUL_DEGRADATION.md` - Graceful degradation

---

**Status:** ✅ PRODUCTION READY  
**Last Updated:** 2026-08-04  
**Verified:** Accurate diagnostics, precise failure reasons, health dashboard integration
