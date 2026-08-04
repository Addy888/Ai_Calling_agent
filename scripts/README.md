# Production Diagnostic Scripts

This folder contains scripts for testing and diagnosing production connectivity issues.

## Available Scripts

### `diagnose-production.js`

Node.js script that tests connectivity to:
- Redis (port 6379)
- Asterisk AMI (port 5038)

**Usage:**
```bash
# Using npm
npm run diagnose

# Direct execution
node scripts/diagnose-production.js

# Windows batch wrapper
scripts\diagnose-production.bat
```

**What it checks:**
- ✅ Redis TCP connection
- ✅ Redis ping/pong
- ✅ Redis version info
- ✅ Asterisk TCP connection
- ✅ Asterisk greeter message
- ✅ AMI authentication
- ✅ Proper port usage (AMI vs SIP)

**Output:**
```
═══════════════════════════════════════
Testing Redis Connection
═══════════════════════════════════════
ℹ️  Host: localhost
ℹ️  Port: 6379
✅ Redis connection successful!
✅ Redis is healthy and ready
✅ Redis version: 7.2.3

═══════════════════════════════════════
Testing Asterisk AMI Connection
═══════════════════════════════════════
ℹ️  Host: 192.168.1.4
ℹ️  Port: 5038
✅ TCP connection established
✅ Received greeter: Asterisk Call Manager/1.1
✅ Authentication successful!
✅ Asterisk AMI is ready

═══════════════════════════════════════
Summary
═══════════════════════════════════════
Redis:    ✅ Ready
Asterisk: ✅ Ready

🎉 All systems ready for production!
```

### `diagnose-production.bat`

Windows batch wrapper for the Node.js diagnostic script.

**Usage:**
```bash
# Double-click in Windows Explorer
# or run from command line:
scripts\diagnose-production.bat
```

## Requirements

- Node.js 18 or higher
- `dotenv` package (automatically installed)
- Access to Redis server (optional)
- Access to Asterisk AMI server

## Configuration

The scripts read configuration from your `.env` file:

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Asterisk AMI
ASTERISK_HOST=192.168.1.4
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=your-password
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Troubleshooting

### Redis Connection Failed

**Error:**
```
❌ Redis connection failed: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
1. Install Redis: `choco install redis-64`
2. Start Redis: `redis-server`
3. Or use in-memory cache (Redis optional)

### Asterisk Connection Timeout

**Error:**
```
❌ Connection failed: connect ETIMEDOUT
```

**Solution:**
1. Check network connectivity: `ping 192.168.1.4`
2. Test port: `Test-NetConnection -ComputerName 192.168.1.4 -Port 5038`
3. Check firewall rules
4. Verify Asterisk is running

### No Greeter Message

**Error:**
```
⚠️  No greeter message received
⚠️  This is NOT an AMI port!
```

**Solution:**
1. Check port number (should be 5038, not 5060/5061)
2. Update `ASTERISK_AMI_PORT=5038` in .env
3. Verify AMI enabled in manager.conf

### Authentication Failed

**Error:**
```
❌ Authentication failed!
❌ Check username and password in manager.conf
```

**Solution:**
1. Verify credentials in manager.conf
2. Update ASTERISK_AMI_USERNAME and ASTERISK_AMI_SECRET
3. Reload Asterisk: `asterisk -rx "manager reload"`

## Related Documentation

- `../PRODUCTION_ISSUES_FIXED.md` - Detailed technical documentation
- `../QUICK_FIX_GUIDE.md` - Quick reference for fixes
- `../PRODUCTION_FIX_SUMMARY.md` - Executive summary

## Adding New Diagnostics

To add new diagnostic checks:

1. Add test function in `diagnose-production.js`:
   ```javascript
   async function testNewService() {
     log('\n═══════════════════', 'bright');
     log('Testing New Service', 'bright');
     // ... test logic
     return true/false;
   }
   ```

2. Call in `main()`:
   ```javascript
   results.newService = await testNewService();
   ```

3. Add to summary:
   ```javascript
   log(`New Service: ${results.newService ? '✅ Ready' : '❌ Not Available'}`);
   ```

## Support

For issues with the diagnostic scripts:
1. Check Node.js version: `node --version` (should be 18+)
2. Check dependencies: `npm install`
3. Review configuration in `.env`
4. Run with verbose output: `node scripts/diagnose-production.js`

## License

Part of the AI Calling Agent Platform.
