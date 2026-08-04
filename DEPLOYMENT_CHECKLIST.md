# Production Deployment Checklist

Use this checklist before deploying to production to ensure both issues are resolved.

## Pre-Deployment Checks

### 1. Environment Configuration

- [ ] `.env` file exists and is configured
- [ ] `REDIS_HOST` is set correctly
- [ ] `REDIS_PORT` is set to 6379 (or your Redis port)
- [ ] `ASTERISK_HOST` is set to Asterisk server IP
- [ ] `ASTERISK_AMI_PORT` is set to **5038** (not 5060/5061)
- [ ] `ASTERISK_AMI_USERNAME` matches manager.conf
- [ ] `ASTERISK_AMI_SECRET` matches manager.conf

### 2. Redis Setup

**Option A: Redis Installed (Recommended)**
- [ ] Redis installed on server
- [ ] Redis service is running
- [ ] Redis port 6379 is accessible
- [ ] Can connect with `redis-cli ping`
- [ ] Redis set to auto-start on boot

**Option B: No Redis (Acceptable)**
- [ ] Acknowledged that in-memory cache will be used
- [ ] Understood limitations:
  - No distributed caching
  - Queue features limited
  - Not suitable for multi-server setup
- [ ] Application tested without Redis

### 3. Asterisk AMI Setup

- [ ] Asterisk server is running
- [ ] AMI is enabled in manager.conf
- [ ] Port 5038 is open (not firewalled)
- [ ] manager.conf has correct user configuration
- [ ] User has `read = all` and `write = all` permissions
- [ ] Can connect with: `telnet <asterisk-ip> 5038`
- [ ] Greeter message appears: "Asterisk Call Manager/..."

### 4. Network Connectivity

- [ ] Can ping Asterisk server: `ping 192.168.1.4`
- [ ] Port 5038 is reachable: `Test-NetConnection -ComputerName 192.168.1.4 -Port 5038`
- [ ] No firewall blocking connections
- [ ] Network latency is acceptable (< 100ms)

### 5. Code Verification

- [ ] All modified files are committed
- [ ] No syntax errors in TypeScript files
- [ ] Dependencies installed: `npm install`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript compilation errors

Modified files to verify:
```
✅ apps/api/src/modules/telephony-engine/services/campaign-call-dispatcher.service.ts
✅ apps/api/src/modules/telephony-engine/services/asterisk-production-ami.service.ts
✅ apps/api/src/common/cache/cache.module.ts
```

## Testing Phase

### 1. Run Diagnostics

```bash
npm run diagnose
```

**Expected Output:**
```
✅ Redis connection successful! (or warning if not installed)
✅ Asterisk AMI is ready
🎉 All systems ready for production!
```

If diagnostics fail, **DO NOT DEPLOY**. Fix issues first.

### 2. Test Without Redis

```bash
# Stop Redis
sc stop Redis

# Start application
npm run dev

# Check logs
```

**Expected Behavior:**
- [ ] Application starts successfully
- [ ] Warning about Redis unavailable
- [ ] "Operating in degraded mode" message
- [ ] Falls back to in-memory cache
- [ ] No crashes or unhandled errors

### 3. Test With Redis

```bash
# Start Redis
redis-server

# Start application
npm run dev

# Check logs
```

**Expected Behavior:**
- [ ] Redis connection successful
- [ ] BullMQ queue initialized
- [ ] BullMQ worker initialized
- [ ] Cache using Redis store

### 4. Test Asterisk AMI Connection

```bash
# Start application
npm run dev

# Watch logs for AMI connection
```

**Expected Logs:**
```
🔌 Connecting to Asterisk AMI at 192.168.1.4:5038...
📡 Initiating TCP connection...
✅ TCP connected to 192.168.1.4:5038
📨 Received Asterisk greeter: Asterisk Call Manager/1.1
🔐 Sending login credentials...
📤 Login credentials sent, waiting for response...
✅ Authenticated to Asterisk AMI
✅ Asterisk Production AMI ready
   Successfully connected to AMI at 192.168.1.4:5038
```

If any step fails, check:
- [ ] Port number (5038 not 5060)
- [ ] Credentials match manager.conf
- [ ] Network connectivity
- [ ] Asterisk is running

### 5. Test Call Origination

```bash
# Through API or UI, attempt to originate a test call
```

**Verification:**
- [ ] Call is queued successfully
- [ ] SIM card is selected
- [ ] Call is originated via Asterisk
- [ ] Call status updates properly
- [ ] No errors in logs

## Deployment

### 1. Pre-Deployment

- [ ] All tests passed
- [ ] Diagnostics show all green
- [ ] Documentation reviewed
- [ ] Team notified of deployment
- [ ] Rollback plan prepared

### 2. Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build application
npm run build

# 4. Run database migrations (if any)
npm run db:migrate

# 5. Run diagnostics
npm run diagnose

# 6. Start application
npm run start
```

### 3. Post-Deployment Verification

**Within 5 Minutes:**
- [ ] Application started successfully
- [ ] No errors in logs
- [ ] Redis connected (or gracefully degraded)
- [ ] Asterisk AMI authenticated
- [ ] Health endpoints responding

**Within 1 Hour:**
- [ ] Test calls successful
- [ ] Queue processing calls
- [ ] No memory leaks
- [ ] Performance acceptable
- [ ] Error rate normal

**Within 24 Hours:**
- [ ] Monitor for unexpected errors
- [ ] Check queue depth
- [ ] Verify call success rate
- [ ] Review system resources
- [ ] Check Redis memory usage

## Monitoring

### Key Metrics to Watch

1. **Redis Health**
   - Connection status
   - Memory usage
   - Command latency
   - Eviction rate

2. **Asterisk AMI**
   - Connection uptime
   - Authentication success rate
   - Active channels
   - Call origination success rate

3. **Queue Performance**
   - Jobs waiting
   - Jobs active
   - Jobs completed
   - Jobs failed
   - Processing time

4. **Application Health**
   - Response time
   - Error rate
   - Memory usage
   - CPU usage

### Alert Thresholds

- [ ] Alert if Redis down > 5 minutes
- [ ] Alert if AMI disconnected > 1 minute
- [ ] Alert if queue depth > 100
- [ ] Alert if error rate > 5%
- [ ] Alert if response time > 2 seconds

## Rollback Plan

If issues occur after deployment:

### Immediate Actions
1. Check application logs
2. Run diagnostics: `npm run diagnose`
3. Verify Redis status
4. Verify Asterisk connectivity

### Rollback Procedure
```bash
# 1. Stop application
npm run stop

# 2. Revert to previous version
git checkout <previous-commit>

# 3. Reinstall dependencies
npm install

# 4. Rebuild
npm run build

# 5. Restart
npm run start
```

### Communication
- [ ] Notify team of rollback
- [ ] Document issues encountered
- [ ] Create post-mortem
- [ ] Schedule fix deployment

## Success Criteria

Deployment is successful if:

✅ All diagnostic tests pass
✅ Application starts without errors
✅ Redis connected or gracefully degraded
✅ Asterisk AMI authenticated
✅ Test calls complete successfully
✅ No critical errors in logs
✅ Performance within acceptable range
✅ Monitoring shows healthy metrics

## Post-Deployment Tasks

- [ ] Document any issues encountered
- [ ] Update runbooks if needed
- [ ] Review logs for warnings
- [ ] Update monitoring dashboards
- [ ] Schedule performance review
- [ ] Conduct team retrospective

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| DevOps | | | |
| Manager | | | |

---

**Deployment Date:** _____________
**Deployment Time:** _____________
**Deployed By:** _____________
**Status:** ⬜ Success ⬜ Failed ⬜ Rolled Back

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
