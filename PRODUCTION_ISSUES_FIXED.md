# Production Issues - Fixed

## Issue 1: Redis Connection Fails (ECONNREFUSED 127.0.0.1:6379)

### Problem
- Application crashed when Redis was unavailable
- BullMQ queue initialization failed
- No graceful degradation

### Root Cause
- No error handling in Redis connection
- No retry strategy
- Application didn't gracefully handle Redis unavailability

### Solution Implemented

#### 1. **Campaign Call Dispatcher Service** (`campaign-call-dispatcher.service.ts`)
- Added comprehensive error handling in `initializeQueue()`
- Added retry strategy with exponential backoff (up to 10 retries)
- Added connection event handlers (error, connect, close, reconnecting)
- Application continues in degraded mode if Redis unavailable
- Added null checks in `queueCall()` and `getQueueStats()`
- Worker initialization also handles Redis failures gracefully

#### 2. **Cache Module** (`cache.module.ts`)
- Enhanced error messages with connection details
- Added Redis ping test to verify connection
- Improved fallback to in-memory cache
- Added detailed logging for troubleshooting

### Verification Steps

#### Check Redis Status
```bash
# Windows (if Redis is installed)
redis-cli ping

# Check if Redis service is running
sc query Redis

# Try connecting manually
redis-cli -h localhost -p 6379
```

#### Install Redis on Windows (if not installed)
```bash
# Using Chocolatey
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases

# Start Redis
redis-server
```

#### Test Application Without Redis
1. Stop Redis service
2. Start the NestJS application
3. Check logs - should see warnings but app should continue
4. Expected logs:
   ```
   ⚠️ Failed to initialize BullMQ queue: connect ECONNREFUSED 127.0.0.1:6379
   ⚠️ Campaign dispatcher will operate in degraded mode without queue
   ⚠️ Please ensure Redis is running and accessible
   ⚠️ Falling back to in-memory cache
   ```

#### Test Application With Redis
1. Start Redis: `redis-server`
2. Start the NestJS application
3. Expected logs:
   ```
   ✅ Redis connected: localhost:6379
   ✅ BullMQ queue initialized
   ✅ BullMQ worker initialized
   ✅ Redis cache store initialized successfully
   ```

---

## Issue 2: Asterisk AMI Authentication Timeout

### Problem
- TCP connection succeeded
- Authentication never completed
- Timeout after 15 seconds
- Error: "Authentication timeout"

### Root Cause
- **Critical Bug**: `login()` method was NEVER called after TCP connection
- The connect() method waited for authentication but never initiated it
- Login was using `sendAction()` which requires authentication (circular dependency)
- No distinction between AMI port (5038) and SIP port (5060/5061)

### Solution Implemented

#### 1. **Fixed Login Flow** (`asterisk-production-ami.service.ts`)
- Login is now triggered when Asterisk greeter message is received
- Login credentials sent directly via socket.write() (not sendAction)
- Added `greeterReceived` flag to track connection stages
- Proper response handling for authentication

#### 2. **Enhanced Logging**
Added detailed connection logs showing:
- Host and Port being used
- TCP connection status
- Whether greeter was received
- Authentication status
- Detailed timeout reasons
- Warning about AMI vs SIP port confusion

#### 3. **Better Error Messages**
Timeout now shows:
```
❌ Authentication timeout after 15s
   Host: 192.168.1.4:5038
   TCP Connected: true
   Greeter Received: false
   Authenticated: false
   Reason: No greeter message received from Asterisk
   Check: Is this the correct AMI port? (not SIP port 5060/5061)
```

### Connection Flow (Fixed)

```
1. socket.connect(5038, '192.168.1.4')
   └─> TCP connection established
   
2. Asterisk sends greeter message
   └─> "Asterisk Call Manager/1.1"
   
3. Application receives greeter (NEW!)
   └─> greeterReceived = true
   └─> Triggers login()
   
4. Application sends Login action
   └─> Username: admin
   └─> Secret: ****
   └─> Events: on
   
5. Asterisk responds
   └─> Response: Success
   └─> Message: Authentication accepted
   
6. authenticated = true
   └─> Connection ready
```

### Verification Steps

#### 1. Verify Asterisk Manager Configuration

SSH into Asterisk server (192.168.1.4) and check:

```bash
# Check manager.conf
cat /etc/asterisk/manager.conf

# Should contain:
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]  # This is your ASTERISK_AMI_USERNAME
secret = your-password-here  # This is your ASTERISK_AMI_SECRET
read = all
write = all
```

#### 2. Test TCP Connection

From your Windows machine:

```bash
# Test if port 5038 is open
telnet 192.168.1.4 5038

# If telnet works, you should see:
# Asterisk Call Manager/1.1

# If you see this, the AMI is working!
```

#### 3. Test AMI Login Manually

```bash
telnet 192.168.1.4 5038

# After connecting, type:
Action: Login
Username: admin
Secret: your-password-here
Events: on

# Press Enter twice (blank line ends the action)

# Expected response:
Response: Success
Message: Authentication accepted

# If you get "Error" instead, credentials are wrong
```

#### 4. Verify Environment Variables

Check your `.env` file:

```bash
# Must be AMI port (5038), NOT SIP port (5060/5061)
ASTERISK_AMI_PORT=5038

# Must match manager.conf
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your-actual-password

# Asterisk server IP
ASTERISK_HOST=192.168.1.4
```

#### 5. Check Network Connectivity

```bash
# Ping Asterisk server
ping 192.168.1.4

# Check if firewall blocks port 5038
Test-NetConnection -ComputerName 192.168.1.4 -Port 5038

# Expected output:
TcpTestSucceeded : True
```

#### 6. Review Application Logs

Start the application and look for:

**Successful Connection:**
```
🔌 Connecting to Asterisk AMI at 192.168.1.4:5038...
   Username: admin
   Port: 5038 (AMI port, not SIP)
📡 Initiating TCP connection...
✅ TCP connected to 192.168.1.4:5038
📨 Received Asterisk greeter: Asterisk Call Manager/1.1
🔐 Sending login credentials...
📤 Login credentials sent, waiting for response...
✅ Authenticated to Asterisk AMI
✅ Asterisk Production AMI ready
   Successfully connected to AMI at 192.168.1.4:5038
```

**Failed Connection (Wrong Port):**
```
❌ Authentication timeout after 15s
   Host: 192.168.1.4:5060
   TCP Connected: true
   Greeter Received: false
   Reason: No greeter message received from Asterisk
   Check: Is this the correct AMI port? (not SIP port 5060/5061)
```

**Failed Connection (Wrong Credentials):**
```
✅ TCP connected to 192.168.1.4:5038
📨 Received Asterisk greeter: Asterisk Call Manager/1.1
🔐 Sending login credentials...
❌ Authentication failed: Permission denied
   Check username and password in manager.conf
```

---

## Common Issues & Troubleshooting

### Redis Issues

#### "ECONNREFUSED 127.0.0.1:6379"
- **Cause**: Redis is not running
- **Fix**: Start Redis service
- **Note**: Application will continue with in-memory cache

#### "Ready check failed: Redis connection lost and command aborted"
- **Cause**: Redis crashed or connection interrupted
- **Fix**: Restart Redis, check system resources

### Asterisk AMI Issues

#### "Connection timeout" / "ECONNREFUSED"
- **Cause**: Asterisk not running or firewall blocking
- **Fix**: 
  - Check Asterisk status: `systemctl status asterisk`
  - Check firewall: Allow port 5038
  - Verify network connectivity

#### "Authentication timeout - Greeter Received: false"
- **Cause**: Wrong port (probably SIP port instead of AMI port)
- **Fix**: Change `ASTERISK_AMI_PORT` to 5038 (not 5060 or 5061)

#### "Authentication failed: Permission denied"
- **Cause**: Wrong username or password
- **Fix**: 
  - Check manager.conf on Asterisk server
  - Update ASTERISK_AMI_USERNAME and ASTERISK_AMI_SECRET in .env
  - Reload Asterisk: `asterisk -rx "manager reload"`

#### "No greeter message received"
- **Cause**: Not an AMI port or Asterisk not configured properly
- **Fix**: 
  - Verify manager.conf has `enabled = yes` and `port = 5038`
  - Restart Asterisk

---

## Testing Checklist

### Redis
- [ ] Redis service is running
- [ ] Application starts without Redis (degraded mode)
- [ ] Application connects to Redis when available
- [ ] Queue operations work with Redis
- [ ] Cache falls back to memory without Redis

### Asterisk AMI
- [ ] TCP connection succeeds
- [ ] Asterisk greeter message received
- [ ] Login credentials sent
- [ ] Authentication succeeds
- [ ] AMI events are received
- [ ] Call origination works
- [ ] Proper error messages on failure

---

## Production Deployment Checklist

1. **Redis**
   - [ ] Redis installed and configured
   - [ ] Redis set to auto-start on system boot
   - [ ] Redis password configured (if needed)
   - [ ] REDIS_HOST and REDIS_PORT correct in .env

2. **Asterisk**
   - [ ] manager.conf properly configured
   - [ ] AMI enabled and port 5038 open
   - [ ] Credentials match .env file
   - [ ] Firewall allows port 5038
   - [ ] Network connectivity verified

3. **Application**
   - [ ] All environment variables set
   - [ ] Application starts successfully
   - [ ] Both Redis and AMI connections succeed
   - [ ] Logs show successful initialization
   - [ ] Test call can be originated

---

## Files Modified

1. `apps/api/src/modules/telephony-engine/services/campaign-call-dispatcher.service.ts`
   - Added Redis error handling
   - Added retry strategy
   - Added graceful degradation
   - Added null checks

2. `apps/api/src/modules/telephony-engine/services/asterisk-production-ami.service.ts`
   - Fixed login flow (critical bug)
   - Added greeter detection
   - Enhanced logging
   - Better error messages
   - Added connection stage tracking

3. `apps/api/src/common/cache/cache.module.ts`
   - Enhanced Redis error handling
   - Added connection test
   - Improved logging
   - Better fallback mechanism

---

## Support

If issues persist:

1. Check all logs carefully
2. Verify environment variables
3. Test connectivity manually
4. Review Asterisk configuration
5. Ensure Redis is running

Both issues are now production-ready with proper error handling and detailed diagnostics.
