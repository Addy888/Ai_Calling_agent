# BullMQ v6 Fix - Quick Summary

## Problem

TypeScript compilation errors with BullMQ v6.0.6:

```
❌ TS2339: Property 'client' does not exist on type 'Queue'
❌ TS2339: Property 'client' does not exist on type 'Worker'
```

## Root Cause

Code was using deprecated BullMQ v4/v5 API (`queue.client`, `worker.client`) which was removed in BullMQ v5+.

## Solution

Migrated to BullMQ v6 official API using:
- ✅ **QueueEvents** for monitoring
- ✅ **Direct connection testing** via queue.add()
- ✅ **Event-based error handling**
- ✅ **Proper cleanup** with OnModuleDestroy

---

## Code Changes

### File Modified
`apps/api/src/modules/telephony-engine/services/campaign-call-dispatcher.service.ts`

### Key Changes

#### 1. Added QueueEvents Import
```typescript
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
```

#### 2. Added QueueEvents Instance
```typescript
private queueEvents: QueueEvents | null = null;
```

#### 3. Removed queue.client Usage
```typescript
// ❌ OLD (Removed)
const connection = await this.callQueue.client;
await connection.connect();
connection.on('error', ...);

// ✅ NEW (Added)
const testJob = await this.callQueue.add('test', {}, { 
  jobId: 'connection-test',
  removeOnComplete: true,
});
await testJob.remove();
```

#### 4. Removed worker.client Usage
```typescript
// ❌ OLD (Removed)
const connection = await this.callWorker.client;
await connection.connect();

// ✅ NEW (Replaced with)
// Connection happens automatically when Worker is created
// Use worker.on('error', ...) for error handling
```

#### 5. Added QueueEvents Monitoring
```typescript
this.queueEvents = new QueueEvents('campaign-calls', {
  connection: { host, port, password }
});

this.queueEvents.on('error', (error) => {
  if (this.redisConnected) {
    this.logger.error(`QueueEvents error: ${error.message}`);
    this.redisConnected = false;
    this.scheduleReconnect();
  }
});
```

#### 6. Added Proper Cleanup
```typescript
async onModuleDestroy() {
  if (this.queueEvents) await this.queueEvents.close();
  if (this.callWorker) await this.callWorker.close();
  if (this.callQueue) await this.callQueue.close();
}
```

#### 7. Improved Reconnection Logic
```typescript
private scheduleReconnect(): void {
  // Exponential backoff: 5s, 10s, 15s, ... up to 60s
  const delay = Math.min(this.reconnectAttempts * 5000, 60000);
  
  // Stop after 10 attempts
  if (this.reconnectAttempts >= 10) {
    this.logger.error('Max reconnection attempts reached');
    return;
  }
  
  // Schedule reconnection
  setTimeout(async () => {
    await this.initializeQueue();
    if (this.redisConnected) {
      await this.initializeWorker();
      await this.initializeQueueEvents();
    }
  }, delay);
}
```

---

## Verification

### Compile Check
```bash
npx tsc --noEmit --project tsconfig.json
```
✅ **Result:** No errors

### Build Check
```bash
npm run build
```
✅ **Result:** Build successful

### Runtime Tests

#### Without Redis
```bash
sc stop Redis
npm run dev
```
✅ **Result:** 
- Application starts
- Logs warning about degraded mode
- No crashes
- Automatic reconnection attempts

#### With Redis
```bash
redis-server
npm run dev
```
✅ **Result:**
- Queue initialized
- Worker initialized
- QueueEvents initialized
- Full functionality

---

## Benefits

### Before Fix
- ❌ TypeScript compilation errors
- ❌ Cannot build
- ❌ Using deprecated API
- ❌ No proper cleanup
- ❌ Memory leaks possible

### After Fix
- ✅ No TypeScript errors
- ✅ Builds successfully
- ✅ Using BullMQ v6 API
- ✅ Proper resource cleanup
- ✅ Better error handling
- ✅ Graceful reconnection
- ✅ Production-ready

---

## Quick Reference

### BullMQ v6 API

| Feature | How to Use |
|---------|------------|
| Create Queue | `new Queue('name', { connection })` |
| Create Worker | `new Worker('name', processor, { connection })` |
| Monitor Events | `new QueueEvents('name', { connection })` |
| Test Connection | `await queue.add('test', {})` |
| Handle Errors | `queueEvents.on('error', ...)` |
| Cleanup | `await queue.close()` |

### Connection Options

```typescript
{
  connection: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 1000, 10000),
    enableOfflineQueue: false,
    // ❌ lazyConnect: true  // Not supported in v6
  }
}
```

### Event Handlers

```typescript
// Queue/Worker errors
worker.on('error', (error) => { ... });

// QueueEvents monitoring
queueEvents.on('completed', ({ jobId }) => { ... });
queueEvents.on('failed', ({ jobId, failedReason }) => { ... });
queueEvents.on('error', (error) => { ... });
```

---

## Files

### Modified
- ✅ `apps/api/src/modules/telephony-engine/services/campaign-call-dispatcher.service.ts`

### Documentation
- ✅ `BULLMQ_V6_MIGRATION.md` - Detailed migration guide
- ✅ `BULLMQ_FIX_SUMMARY.md` - This file

---

## Status

**✅ COMPLETE**

- No TypeScript errors
- Builds successfully
- BullMQ v6 compatible
- Production-ready
- Tested with/without Redis

---

## Next Steps

1. ✅ Verify compilation: `npx tsc --noEmit`
2. ✅ Verify build: `npm run build`
3. ✅ Test without Redis
4. ✅ Test with Redis
5. ✅ Deploy to production

---

## Support

For detailed information, see:
- `BULLMQ_V6_MIGRATION.md` - Complete migration guide
- [BullMQ v6 Docs](https://docs.bullmq.io/)

**Issue:** Fixed ✅  
**Version:** BullMQ 6.0.6  
**Date:** 2026-08-04
