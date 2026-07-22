# Troubleshooting Guide - AI Calling Agent

## Common Issues and Solutions

---

## Issue: Next.js `routes-manifest.json` Error

### Error Message
```
Error: ENOENT: no such file or directory, open 'C:\Users\...\apps\web\.next\routes-manifest.json'
```

### Cause
This is a Next.js build cache corruption issue. The `.next` directory cache became invalid or incomplete.

### Solution

**Step 1: Stop the Development Server**
```bash
# Press Ctrl+C in the terminal running the dev server
```

**Step 2: Clean the Next.js Cache**
```bash
cd apps/web
rm -rf .next
rm -rf node_modules/.cache
```

**Step 3: Restart the Development Server**
```bash
npm run dev
```

### Prevention
- Always stop the dev server before switching branches
- Don't manually edit files in `.next` directory
- Run cache cleanup after pulling major changes

---

## Issue: Module Not Found Errors

### Error Message
```
Module not found: Can't resolve '@/components/ui/alert'
Module not found: Can't resolve 'sonner'
```

### Cause
Missing dependencies or uninstalled shadcn/ui components.

### Solution

**Option 1: Install Missing Component**
```bash
cd apps/web
npx shadcn-ui@latest add alert
npm install sonner
```

**Option 2: Reinstall All Dependencies**
```bash
cd apps/web
rm -rf node_modules
npm install
```

---

## Issue: TypeScript Decorator Warnings (TS1240)

### Warning Message
```
TS1240: Unable to resolve signature of parameter decorator when called as an expression.
```

### Cause
Known issue with TypeScript 5.x and class-validator decorators.

### Status
⚠️ **Non-blocking warning** - Does not affect functionality

### Solution
Can be safely ignored. If you want to suppress:

**Option 1: Add to tsconfig.json**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Option 2: Downgrade TypeScript**
```bash
npm install --save-dev typescript@4.9.5
```

---

## Issue: Port Already in Use

### Error Message
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solution

**Option 1: Kill Process on Port 3000**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**Option 2: Use Different Port**
```bash
# Set PORT environment variable
PORT=3001 npm run dev
```

---

## Issue: Prisma Client Not Generated

### Error Message
```
Cannot find module '@prisma/client'
```

### Solution
```bash
# Navigate to API directory
cd apps/api

# Generate Prisma Client
npx prisma generate

# If schema changed, also run migration
npx prisma migrate dev
```

---

## Issue: Environment Variables Not Loaded

### Error Message
```
undefined is not an object
DATABASE_URL is undefined
```

### Solution

**Step 1: Check .env File Exists**
```bash
# Copy example if needed
cp .env.example .env
```

**Step 2: Verify Variables**
```bash
# Check .env file has required variables
cat .env
```

**Step 3: Restart Server**
```bash
# Environment variables are loaded on server start
# Stop and restart the server
```

---

## Issue: Build Fails with Webpack Errors

### Cause
Usually dependency issues or syntax errors.

### Solution

**Step 1: Check for Syntax Errors**
```bash
# Run TypeScript compiler
npm run build
```

**Step 2: Clear All Caches**
```bash
# Frontend
cd apps/web
rm -rf .next node_modules/.cache
npm install

# Backend
cd apps/api
rm -rf dist node_modules/.cache
npm install
```

**Step 3: Rebuild**
```bash
npm run build
```

---

## Issue: API Endpoints Return 401 Unauthorized

### Cause
Missing or invalid JWT token.

### Solution

**Step 1: Verify JWT Secret**
```bash
# Check .env has JWT_SECRET
JWT_SECRET=your-secret-key-here
```

**Step 2: Get Valid Token**
```bash
# Login to get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

**Step 3: Use Token in Requests**
```bash
# Add Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3001/api/training-manager/packages
```

---

## Issue: Database Connection Failed

### Error Message
```
Can't reach database server
Error: P1001: Can't reach database server
```

### Solution

**Step 1: Check Database Running**
```bash
# PostgreSQL
pg_isready

# MySQL
mysqladmin ping

# MongoDB
mongo --eval "db.adminCommand('ping')"
```

**Step 2: Verify Connection String**
```bash
# Check DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

**Step 3: Test Connection**
```bash
cd apps/api
npx prisma db pull
```

---

## Issue: Hot Reload Not Working

### Cause
File watcher limits or configuration issues.

### Solution

**Option 1: Increase File Watchers (Linux/Mac)**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Option 2: Restart Dev Server**
```bash
# Stop and restart
npm run dev
```

**Option 3: Use Polling (Slower)**
```bash
# Add to next.config.js
module.exports = {
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  }
}
```

---

## Issue: Package Not Found in Package List

### Cause
Mock data or database query issue.

### Solution

**Step 1: Check API Response**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/training-manager/packages
```

**Step 2: Verify Filters**
- Clear all search filters
- Check status filter is not hiding packages
- Verify pagination settings

**Step 3: Check Console**
```
Open browser DevTools > Console
Look for API errors
```

---

## Quick Fixes Checklist

When things go wrong, try these in order:

### Level 1: Quick Fixes (5 minutes)
- [ ] Clear Next.js cache: `rm -rf apps/web/.next`
- [ ] Restart dev server
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check browser console for errors

### Level 2: Cache Cleanup (10 minutes)
- [ ] Clear all caches: `rm -rf apps/web/.next apps/web/node_modules/.cache apps/api/dist`
- [ ] Reinstall dependencies: `npm install`
- [ ] Restart all servers
- [ ] Clear browser cache

### Level 3: Full Reset (20 minutes)
- [ ] Delete all node_modules: `rm -rf node_modules apps/*/node_modules`
- [ ] Delete package-lock files: `rm -rf package-lock.json apps/*/package-lock.json`
- [ ] Clean install: `npm install`
- [ ] Regenerate Prisma: `cd apps/api && npx prisma generate`
- [ ] Rebuild: `npm run build`

---

## Getting Help

### Check Documentation
1. `PHASE_4.4.3.7_COMPLETION_REPORT.md` - Technical details
2. `MODEL_PACKAGING_QUICK_START.md` - Usage guide
3. `PHASE_4.4.3.7_FINAL_SUMMARY.md` - Overview

### Debug Mode

**Enable Verbose Logging**
```bash
# Frontend
DEBUG=* npm run dev

# Backend
npm run start:dev
```

**Check Logs**
```bash
# Frontend logs
tail -f apps/web/.next/trace

# Backend logs
tail -f apps/api/logs/error.log
```

---

## Preventive Measures

### Before Making Changes
1. ✅ Commit working code
2. ✅ Create a branch
3. ✅ Stop dev servers
4. ✅ Pull latest changes

### After Making Changes
1. ✅ Run TypeScript check: `npm run build`
2. ✅ Test in browser
3. ✅ Check console for errors
4. ✅ Commit changes

### Regular Maintenance
1. ✅ Clear caches weekly
2. ✅ Update dependencies monthly
3. ✅ Review logs regularly
4. ✅ Backup database

---

## System Requirements

### Minimum Requirements
- Node.js: v18.17.0 or higher
- NPM: v9.0.0 or higher
- RAM: 8GB
- Disk Space: 5GB free

### Recommended
- Node.js: v20.x (LTS)
- NPM: v10.x
- RAM: 16GB
- Disk Space: 10GB free
- SSD for faster builds

---

## Common Command Reference

### Development
```bash
# Start frontend dev server
cd apps/web && npm run dev

# Start backend dev server
cd apps/api && npm run start:dev

# Start both (from root)
npm run dev
```

### Building
```bash
# Build frontend
cd apps/web && npm run build

# Build backend
cd apps/api && npm run build

# Build all (from root)
npm run build
```

### Database
```bash
# Generate Prisma Client
cd apps/api && npx prisma generate

# Run migrations
cd apps/api && npx prisma migrate dev

# Reset database
cd apps/api && npx prisma migrate reset
```

### Testing
```bash
# Run tests
npm test

# Run specific test
npm test -- model-package.service.spec.ts

# Run with coverage
npm run test:cov
```

---

## Support Contacts

- **Technical Issues**: Check GitHub Issues
- **Documentation**: See `/docs` folder
- **API Documentation**: http://localhost:3001/api/docs

---

**Last Updated**: January 2025  
**Version**: 1.0.0
