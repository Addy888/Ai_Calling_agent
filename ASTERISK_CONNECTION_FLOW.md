# Asterisk AMI Connection Flow

Visual representation of the connection stages and failure points.

---

## Complete Connection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION STARTUP                          │
│  ✅ Non-blocking - app starts immediately                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE: DISCONNECTED                                            │
│  Status: OFFLINE                                                │
│  Action: Prepare to connect                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE: TCP_CONNECTING                                          │
│  Status: CONNECTING                                             │
│  Action: socket.connect(5038, '192.168.1.4')                    │
│  Timeout: 10 seconds                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ✅ SUCCESS                    ❌ FAILURE
                │                           │
                ▼                           ▼
┌───────────────────────────┐    ┌─────────────────────────────┐
│  TCP Connected            │    │  FAILURE TYPES:             │
│  on('connect')            │    │                             │
└───────────────────────────┘    │  • ECONNREFUSED             │
                │                │    → CONNECTION_REFUSED     │
                ▼                │                             │
┌───────────────────────────────┐│  • ETIMEDOUT                │
│  STAGE: TCP_CONNECTED         ││    → CONNECTION_TIMEOUT     │
│  Status: CONNECTING           ││                             │
│  connected = true             ││  • EHOSTUNREACH             │
└───────────────────────────────┘│    → TCP_CONNECTION_FAILED  │
                │                │                             │
                ▼                └─────────────────────────────┘
┌───────────────────────────────┐              │
│  STAGE: WAITING_BANNER        │              │
│  Status: CONNECTING           │              │
│  Timeout: 5 seconds           │              ▼
└───────────────────────────────┐    ┌─────────────────────────┐
                │                    │  LOG ERROR & RETRY      │
                │                    │  Exponential backoff:   │
         ┌──────┴──────┐            │  10s → 30s → 60s        │
         │             │             └─────────────────────────┘
   ✅ BANNER      ❌ TIMEOUT
    RECEIVED        (5s)
         │             │
         ▼             ▼
┌───────────────┐  ┌────────────────────────────┐
│ Banner Data   │  │  FAILURE TYPE:             │
│ Received      │  │  AMI_BANNER_TIMEOUT        │
└───────────────┘  │                            │
         │         │  Reason:                   │
         ▼         │  "AMI banner not received" │
┌───────────────────────────────┐              │
│  STAGE: BANNER_RECEIVED       │              │
│  Status: CONNECTING           │              ▼
│  Action: Clear banner timeout │    ┌─────────────────────────┐
└───────────────────────────────┘    │  LOG ERROR & RETRY      │
         │                            └─────────────────────────┘
         ▼
┌───────────────────────────────┐
│  STAGE: AUTHENTICATING        │
│  Status: CONNECTING           │
│  Action: Send Login message   │
│  Timeout: 5 seconds           │
└───────────────────────────────┘
         │
         │  Login message format:
         │  Action: Login
         │  Username: admin
         │  Secret: password
         │  Events: on
         │
         ▼
┌─────────────────────────────────────────────┐
│  WAIT FOR AUTHENTICATION RESPONSE           │
└─────────────────────────────────────────────┘
         │
         │  Response types:
         │  • Response: Success → AUTHENTICATED
         │  • Response: Error → AUTH_FAILED
         │  • No response (5s) → AUTH_TIMEOUT
         │
    ┌────┴────────────┬────────────┐
    │                 │            │
✅ SUCCESS      ❌ ERROR      ❌ TIMEOUT
    │                 │            │
    ▼                 ▼            ▼
┌────────────┐  ┌──────────┐  ┌──────────┐
│ Response:  │  │Response: │  │ 5 second │
│ Success    │  │ Error    │  │ timeout  │
└────────────┘  └──────────┘  └──────────┘
    │                 │            │
    ▼                 ▼            ▼
┌────────────────┐  ┌──────────────────────┐
│  AUTHENTICATED │  │  AUTHENTICATION_     │
│                │  │  FAILED / TIMEOUT    │
└────────────────┘  └──────────────────────┘
    │                        │
    ▼                        ▼
┌────────────────┐  ┌──────────────────────┐
│  STAGE:        │  │  LOG ERROR & RETRY   │
│  AUTHENTICATED │  └──────────────────────┘
│  Status: ONLINE│
│  Start ping    │
└────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│  ✅ CONNECTED                          │
│  Telephony features available          │
│  Start 30s ping keepalive              │
└────────────────────────────────────────┘
```

---

## Error Handling Flow

```
                    CONNECTION ATTEMPT
                            │
                            ▼
                    ┌──────────────┐
                    │  Try Connect │
                    └──────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
              ✅ SUCCESS         ❌ FAILURE
                   │                 │
                   ▼                 ▼
         ┌─────────────────┐  ┌──────────────────┐
         │ Continue to     │  │ Capture:         │
         │ next stage      │  │ • Error code     │
         └─────────────────┘  │ • Error message  │
                              │ • Connection     │
                              │   stage          │
                              └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Determine        │
                              │ FailureReason    │
                              └──────────────────┘
                                       │
                 ┌─────────────────────┼──────────────────────┐
                 │                     │                      │
                 ▼                     ▼                      ▼
        ┌────────────────┐   ┌────────────────┐   ┌─────────────────┐
        │ TCP Stage      │   │ Banner Stage   │   │ Auth Stage      │
        │                │   │                │   │                 │
        │ ECONNREFUSED   │   │ Timeout (5s)   │   │ Response: Error │
        │ ETIMEDOUT      │   │ → BANNER_      │   │ → AUTH_FAILED   │
        │ EHOSTUNREACH   │   │   TIMEOUT      │   │                 │
        │                │   │                │   │ Timeout (5s)    │
        │ → CONNECTION_  │   └────────────────┘   │ → AUTH_TIMEOUT  │
        │   REFUSED /    │                        │                 │
        │   TIMEOUT /    │                        └─────────────────┘
        │   FAILED       │
        └────────────────┘
                 │
                 └─────────────────────┼──────────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Log Concise Box  │
                              │ ┌──────────────┐ │
                              │ │ Asterisk OFF │ │
                              │ │ Stage: ...   │ │
                              │ │ Reason: ...  │ │
                              │ └──────────────┘ │
                              └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Schedule Retry   │
                              │ • Attempt 1: 10s │
                              │ • Attempt 2: 30s │
                              │ • Attempt 3+: 60s│
                              └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Wait for Timer   │
                              └──────────────────┘
                                       │
                                       ▼
                                  TRY AGAIN
```

---

## Health Dashboard States

```
┌─────────────────────────────────────────────────────────┐
│                    HEALTH DASHBOARD                     │
└─────────────────────────────────────────────────────────┘

STATE 1: ONLINE
┌──────────────────────────────────────────────┐
│ Status: ONLINE                               │
│ Stage: AUTHENTICATED                         │
│ Message: Connected and authenticated         │
│ Color: 🟢 Green                              │
│                                              │
│ Details:                                     │
│ • TCP Connected: true                        │
│ • Authenticated: true                        │
│ • Active Channels: 0                         │
│ • Last Ping: 2s ago                          │
└──────────────────────────────────────────────┘

STATE 2: CONNECTING
┌──────────────────────────────────────────────┐
│ Status: CONNECTING                           │
│ Stage: TCP_CONNECTING                        │
│ Message: Connecting (TCP_CONNECTING)         │
│ Color: 🔵 Blue                               │
│                                              │
│ Details:                                     │
│ • TCP Connected: false                       │
│ • Authenticated: false                       │
│ • Retry Attempt: 1/10                        │
└──────────────────────────────────────────────┘

STATE 3: OFFLINE - Connection Refused
┌──────────────────────────────────────────────┐
│ Status: OFFLINE                              │
│ Stage: TCP_CONNECTING                        │
│ Message: Connection refused at               │
│          192.168.1.4:5038 - attempt 2/10     │
│ Color: 🔴 Red                                │
│                                              │
│ Details:                                     │
│ • Failure Type: CONNECTION_REFUSED           │
│ • Reason: Connection refused                 │
│ • Next Retry: 30 seconds                     │
│ • Troubleshooting: Check if Asterisk running │
└──────────────────────────────────────────────┘

STATE 4: OFFLINE - Banner Timeout
┌──────────────────────────────────────────────┐
│ Status: OFFLINE                              │
│ Stage: WAITING_BANNER                        │
│ Message: Connected but AMI banner not        │
│          received - attempt 2/10             │
│ Color: 🟡 Yellow                             │
│                                              │
│ Details:                                     │
│ • Failure Type: AMI_BANNER_TIMEOUT           │
│ • Reason: AMI banner not received            │
│ • TCP Connected: true (but AMI not working)  │
│ • Troubleshooting: Check AMI enabled in      │
│   manager.conf                               │
└──────────────────────────────────────────────┘

STATE 5: OFFLINE - Auth Failed
┌──────────────────────────────────────────────┐
│ Status: OFFLINE                              │
│ Stage: AUTHENTICATING                        │
│ Message: Invalid AMI username or password    │
│          - attempt 2/10                      │
│ Color: 🔴 Red                                │
│                                              │
│ Details:                                     │
│ • Failure Type: AUTHENTICATION_FAILED        │
│ • Reason: Invalid credentials                │
│ • TCP Connected: true                        │
│ • Banner Received: true                      │
│ • Troubleshooting: Check ASTERISK_AMI_       │
│   USERNAME and ASTERISK_AMI_SECRET in .env   │
└──────────────────────────────────────────────┘

STATE 6: ERROR - Max Retries
┌──────────────────────────────────────────────┐
│ Status: ERROR                                │
│ Stage: TCP_CONNECTING                        │
│ Message: Connection refused at               │
│          192.168.1.4:5038 - max attempts     │
│ Color: 🔴 Red                                │
│                                              │
│ Details:                                     │
│ • Failure Type: CONNECTION_REFUSED           │
│ • Retry Attempt: 10/10 (max reached)         │
│ • Will retry every 60 seconds                │
│ • Troubleshooting: Check Asterisk server     │
│   and network connectivity                   │
└──────────────────────────────────────────────┘
```

---

## Failure Point Summary

| Stage | Failure Type | Cause | User Message |
|-------|-------------|-------|--------------|
| `TCP_CONNECTING` | `CONNECTION_REFUSED` | Port closed | Connection refused at host:port |
| `TCP_CONNECTING` | `CONNECTION_TIMEOUT` | Network issue | TCP connection timeout |
| `TCP_CONNECTING` | `TCP_CONNECTION_FAILED` | Network error | TCP connection failed: reason |
| `WAITING_BANNER` | `AMI_BANNER_TIMEOUT` | AMI disabled | Connected but AMI banner not received |
| `AUTHENTICATING` | `AUTHENTICATION_FAILED` | Wrong credentials | Invalid AMI username or password |
| `AUTHENTICATING` | `AUTHENTICATION_TIMEOUT` | No response | Authentication timeout |
| Any | `CONNECTION_CLOSED` | Connection dropped | Connection closed: reason |

---

## Timeout Configuration

```typescript
┌────────────────────────────────────────────────┐
│  TCP Connection Timeout: 10 seconds            │
│  Banner Timeout: 5 seconds                     │
│  Authentication Timeout: 5 seconds             │
│  Total Max Time: ~20 seconds per attempt       │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  Retry Delays:                                 │
│  • Attempt 1 → 10 seconds                      │
│  • Attempt 2 → 30 seconds                      │
│  • Attempt 3+ → 60 seconds                     │
│  • Max Attempts: 10                            │
│  • Continue after max: 60 seconds              │
└────────────────────────────────────────────────┘
```

---

## Key Features

### ✅ Non-Blocking Startup

```
Application Startup (< 1 second)
    │
    ├─ Load Configuration ✅
    ├─ Initialize Services ✅
    ├─ Start HTTP Server ✅
    │
    └─ Background: Asterisk Connection (async)
           │
           └─ Does NOT block startup
```

### ✅ Precise Error Diagnosis

```
Old Way:
❌ "Authentication timeout" for everything

New Way:
✅ "Connection refused" → Asterisk down
✅ "AMI banner not received" → AMI disabled
✅ "Invalid credentials" → Wrong username/password
✅ "Authentication timeout" → Only when appropriate
```

### ✅ Graceful Degradation

```
Asterisk Offline:
├─ ✅ Dashboard accessible
├─ ✅ Authentication works
├─ ✅ Campaigns viewable
├─ ✅ Analytics available
└─ ❌ Cannot make calls (expected)

Asterisk Online:
└─ ✅ All features available
```

---

## Success Indicators

### Application Logs (Good)

```
🚀 Asterisk Production AMI Service starting...
📋 Configuration loaded:
   Asterisk: 192.168.1.4:5038
   Username: admin
   Context: ai-calling

┌─────────────────────────────────────────────┐
│  Asterisk OFFLINE                          │
├─────────────────────────────────────────────┤
│  Stage: TCP_CONNECTING                      │
│  Last Attempt: 8/4/2026, 12:00:00 PM       │
│  Next Retry: 8/4/2026, 12:00:10 PM         │
│  Reason: Connection refused                 │
└─────────────────────────────────────────────┘

✅ Application listening on port 3001
```

**Good Signs:**
- Single concise error box
- Clear stage indication
- Specific failure reason
- Application continues running

---

## Related Documentation

- **ASTERISK_DIAGNOSTICS_COMPLETE.md** - Full implementation
- **ASTERISK_TROUBLESHOOTING_GUIDE.md** - Quick fixes
- **ASTERISK_DIAGNOSTICS_SUMMARY.md** - Overview
- **PRODUCTION_ASTERISK_SERVICE.md** - Service details

---

**Status:** ✅ PRODUCTION READY  
**Visual Guide:** Complete connection flow and error handling
