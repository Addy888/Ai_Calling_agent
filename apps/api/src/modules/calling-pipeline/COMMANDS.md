# Calling Pipeline - Command Reference

## 🚀 Installation & Setup

```bash
# Navigate to API directory
cd apps/api

# Install dependencies
npm install

# Generate Prisma client (if needed)
npm run db:generate

# Build the project
npm run build
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run calling pipeline tests only
npm test calling-pipeline

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm test -- --watch
```

## 🏃 Running the Application

```bash
# Development mode (hot reload)
npm run dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

## 🔍 Verification Commands

```bash
# Check TypeScript compilation
npm run build

# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint -- --fix

# Format code
npm run format
```

## 📡 API Testing

### Health Check
```bash
curl http://localhost:3001/api/v1/calling/health
```

Expected Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-23T..."
}
```

### Pipeline Status
```bash
curl http://localhost:3001/api/v1/calling/pipeline
```

Expected Response:
```json
{
  "status": "operational",
  "activeCampaigns": 0,
  "activeCalls": 0,
  "queuedCalls": 0,
  "totalCallsToday": 0,
  "successfulCallsToday": 0,
  "health": {
    "stt": "available",
    "tts": "available",
    "telephony": "available",
    "llm": "available"
  }
}
```

### Start Campaign
```bash
curl -X POST http://localhost:3001/api/v1/calling/start-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "campaignId": "campaign-123",
    "companyId": "company-456",
    "concurrentCalls": 5,
    "autoStart": true
  }'
```

### Start Call
```bash
curl -X POST http://localhost:3001/api/v1/calling/start-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "contactId": "contact-789",
    "campaignId": "campaign-123",
    "agentId": "agent-001",
    "phoneNumber": "+1234567890"
  }'
```

### Get Active Calls
```bash
curl http://localhost:3001/api/v1/calling/active-calls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Pause Campaign
```bash
curl -X POST http://localhost:3001/api/v1/calling/pause-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "executionId": "exec-123",
    "reason": "Lunch break"
  }'
```

### Resume Campaign
```bash
curl -X POST http://localhost:3001/api/v1/calling/resume-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "executionId": "exec-123"
  }'
```

### Stop Campaign
```bash
curl -X POST http://localhost:3001/api/v1/calling/stop-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "executionId": "exec-123",
    "force": false,
    "reason": "End of day"
  }'
```

### End Call
```bash
curl -X POST http://localhost:3001/api/v1/calling/end-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sessionId": "session-456",
    "reason": "Call completed"
  }'
```

## 🗄️ Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Create migration
npm run db:migrate:dev

# Deploy migrations
npm run db:migrate:deploy

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed

# Reset database
npm run db:reset
```

## 📊 Monitoring Commands

### View Logs
```bash
# All logs
tail -f logs/api.log

# Error logs only
tail -f logs/error.log

# Follow logs in development
npm run dev | grep "calling"
```

### Check Process
```bash
# Check if API is running
ps aux | grep "nest"

# Check port usage
lsof -i :3001

# On Windows
netstat -ano | findstr :3001
```

## 🔧 Development Commands

### Generate New Service
```bash
nest g service calling-pipeline/services/my-service --no-spec
```

### Generate New Controller
```bash
nest g controller calling-pipeline/my-controller --no-spec
```

### Generate New Module
```bash
nest g module calling-pipeline/my-module
```

### Generate DTO
```bash
nest g class calling-pipeline/dto/my.dto --no-spec
```

## 📝 Documentation Commands

### Generate Swagger JSON
```bash
# Start the server and visit
curl http://localhost:3001/api/docs-json > swagger.json
```

### View Swagger UI
```
Open: http://localhost:3001/api/docs
```

## 🐳 Docker Commands (Optional)

```bash
# Build Docker image
docker build -t ai-calling-agent-api .

# Run container
docker run -p 3001:3001 ai-calling-agent-api

# Run with docker-compose
docker-compose up -d api

# View logs
docker-compose logs -f api

# Stop containers
docker-compose down
```

## 🔐 Environment Setup

```bash
# Copy example env
cp .env.example .env

# Edit environment variables
nano .env

# Or on Windows
notepad .env
```

## 📦 Package Management

```bash
# Install new package
npm install package-name

# Install dev dependency
npm install -D package-name

# Update packages
npm update

# Check for outdated packages
npm outdated

# Audit packages
npm audit

# Fix vulnerabilities
npm audit fix
```

## 🧹 Cleanup Commands

```bash
# Remove node_modules
rm -rf node_modules

# Remove build artifacts
rm -rf dist

# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

## 🎯 Quick Start Sequence

```bash
# 1. Install
npm install

# 2. Setup environment
cp .env.example .env

# 3. Generate Prisma
npm run db:generate

# 4. Build
npm run build

# 5. Run tests
npm test calling-pipeline

# 6. Start development server
npm run dev

# 7. Test API
curl http://localhost:3001/api/v1/calling/health

# 8. View docs
open http://localhost:3001/api/docs
```

## 🔥 Troubleshooting Commands

### Clear Everything and Restart
```bash
# Full reset
rm -rf node_modules dist
npm cache clean --force
npm install
npm run build
npm run dev
```

### Check Port Conflicts
```bash
# Kill process on port 3001
# On Linux/Mac
lsof -ti:3001 | xargs kill -9

# On Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Check TypeScript Errors
```bash
# Compile without running
npx tsc --noEmit
```

### Verify Module Loading
```bash
# Add debug logging
NODE_ENV=development DEBUG=* npm run dev
```

## 📈 Performance Monitoring

```bash
# Start with performance profiling
node --inspect dist/main.js

# Open Chrome DevTools
chrome://inspect

# Memory usage
node --max-old-space-size=4096 dist/main.js
```

## 🚀 Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start:prod

# Use PM2 (recommended)
npm install -g pm2
pm2 start dist/main.js --name ai-calling-api
pm2 save
pm2 startup
```

---

**Quick Reference:** Keep this document handy for daily development tasks!
