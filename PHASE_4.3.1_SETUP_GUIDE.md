# Phase 4.3.1 - Setup Guide
## Enterprise AI Dataset Processing Pipeline

**Date:** July 19, 2026  
**Status:** Implementation Complete - Ready for Prisma Generation

---

## 🚨 CRITICAL: PRISMA CLIENT FILE LOCK ISSUE

### Problem
The Prisma client cannot be regenerated because the query engine file is currently locked by running Node.js processes.

**Error:**
```
EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp' -> 'query_engine-windows.dll.node'
```

### Current Running Processes
8 Node.js processes detected running (backend and frontend dev servers).

---

## ✅ SOLUTION: STEP-BY-STEP SETUP

### Step 1: Stop All Running Processes

**Option A: Using Task Manager (Recommended for Windows)**
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Go to "Details" tab
3. Find all `node.exe` processes
4. Select each one and click "End Task"
5. Verify all Node.js processes are stopped

**Option B: Using PowerShell (Alternative)**
```powershell
# Run this command to stop all Node.js processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Verify processes are stopped
Get-Process node -ErrorAction SilentlyContinue
```

**Option C: Using Command Prompt**
```cmd
taskkill /F /IM node.exe
```

---

### Step 2: Generate Prisma Client

```bash
cd database
npx prisma generate
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (5.x.x | library) to ../../node_modules/.prisma/client in XXXms

Start using Prisma Client in Node.js (See: https://pris.ly/d/client)
```

---

### Step 3: Run Database Migration

```bash
cd database
npx prisma migrate dev --name add_dataset_processing_pipeline
```

**This will:**
- Create all 11 new database tables
- Generate migration SQL files
- Apply changes to your database

**Expected Tables Created:**
1. `dataset_records`
2. `recordings`
3. `transcripts`
4. `diarizations`
5. `conversations`
6. `extracted_entities`
7. `detected_intents`
8. `lead_classifications`
9. `dataset_jobs`
10. `processing_logs`
11. `dataset_exports`

---

### Step 4: Verify Database Schema

```bash
cd database
npx prisma studio
```

This opens Prisma Studio in your browser where you can verify all tables were created correctly.

---

### Step 5: Build Backend

```bash
cd apps/api
npm run build
```

**Expected Output:**
- Backend compiles successfully with 0 errors
- All TypeScript files compile
- Prisma client is properly recognized

**Previous Error (Before Prisma Generation):**
- 64 TypeScript errors related to PrismaService properties
- After Prisma generation, these errors will be resolved

---

### Step 6: Build Frontend

```bash
cd apps/web
npm run build
```

**Expected Output:**
- Frontend compiles successfully with 0 errors
- All Next.js pages build correctly
- Dataset Manager pages compile

---

### Step 7: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/api
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

**Verify Services Started:**
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`
- Swagger API Docs: `http://localhost:3001/api/docs`

---

### Step 8: Verify Dataset Folder Structure

Check that the following folder structure exists:

```
Ai_calling_agent/
└── Ai voice Dataset/
    ├── raw_calls/              ✅ Created
    ├── processed_audio/        ✅ Created
    ├── transcripts/            ✅ Created
    ├── diarization/            ✅ Created
    ├── conversation_json/      ✅ Created
    ├── datasets/               ✅ Created
    ├── exports/                ✅ Created
    ├── logs/                   ✅ Created
    └── temp/                   ✅ Created
```

---

### Step 9: Move Existing Recordings (Optional)

If you want to process existing recordings from the `Recording` folder:

```bash
# PowerShell
Move-Item -Path "Ai voice Dataset\Recording\*.mp3" -Destination "Ai voice Dataset\raw_calls\" -Force

# Or use File Explorer to move files manually
```

**Note:** This step is optional. The system will work with newly uploaded files in `raw_calls/`.

---

### Step 10: Test the System

#### Test Backend API:
```bash
# Check health
curl http://localhost:3001/api/v1/health

# Get dataset dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/dataset/dashboard

# List datasets
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/dataset
```

#### Test Frontend:
1. Open browser: `http://localhost:3000`
2. Login to your account
3. Navigate to: `AI Agents` → `Dataset Manager`
4. Verify the page loads correctly
5. Check dashboard statistics display

---

## 🧪 TESTING CHECKLIST

### Backend Testing
- [ ] Prisma client generated successfully
- [ ] Database migration applied
- [ ] Backend compiles without errors (0/64 errors)
- [ ] Backend starts successfully
- [ ] All 35+ API endpoints registered
- [ ] Swagger docs accessible at `/api/docs`
- [ ] WebSocket gateway starts
- [ ] Can access `/api/v1/dataset/dashboard`

### Frontend Testing
- [ ] Frontend compiles without errors
- [ ] Frontend starts successfully
- [ ] Can navigate to `/dashboard/dataset-manager`
- [ ] Dataset Manager page loads
- [ ] Dashboard statistics display
- [ ] Search and filters work
- [ ] Pagination works

### Database Testing
- [ ] All 11 tables created in database
- [ ] Tables have correct schema
- [ ] Indexes created properly
- [ ] Relations work correctly

### Processing Pipeline Testing (After Backend/Frontend Running)
- [ ] File upload endpoint works
- [ ] Duplicate detection works
- [ ] Audio validation creates Recording record
- [ ] Jobs are created correctly
- [ ] Real-time WebSocket events fire
- [ ] Processing logs are created

---

## 📊 API ENDPOINTS TO TEST

### Dashboard
```bash
GET /api/v1/dataset/dashboard
```

### Upload
```bash
POST /api/v1/dataset/upload
Content-Type: multipart/form-data
Body: file=<audio-file>
```

### List Datasets
```bash
GET /api/v1/dataset?page=1&limit=20
```

### Get Dataset Details
```bash
GET /api/v1/dataset/:id
```

### Process Dataset
```bash
POST /api/v1/dataset/:id/process-all
```

### Get Jobs
```bash
GET /api/v1/dataset/jobs/list
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Property does not exist on PrismaService"
**Cause:** Prisma client not generated  
**Solution:** Follow Step 1 and Step 2 above

### Issue: "EPERM: operation not permitted"
**Cause:** Node.js processes still running  
**Solution:** Stop all Node.js processes using Task Manager or PowerShell

### Issue: "Cannot find module '@prisma/client'"
**Cause:** Prisma client not installed or generated  
**Solution:** 
```bash
cd database
npm install @prisma/client
npx prisma generate
```

### Issue: "Migration failed"
**Cause:** Database connection issue or schema error  
**Solution:** 
1. Check `.env` file has correct `DATABASE_URL`
2. Verify database server is running
3. Check Prisma schema for syntax errors

### Issue: "Port already in use"
**Cause:** Previous server instances still running  
**Solution:** 
1. Stop all Node.js processes
2. Or change port in environment variables

---

## 📝 ENVIRONMENT VARIABLES

Verify these are set in your `.env` file:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/database_name"

# API
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🎯 WHAT'S NEXT AFTER SETUP?

Once all steps are complete:

1. **Upload Test Recording**
   - Use the Upload endpoint or Frontend UI
   - Upload a sample audio file from `Ai voice Dataset/Recording/`

2. **Verify Processing Pipeline**
   - Check that validation job is created
   - Monitor job status
   - Verify logs are generated

3. **Test Each Processing Stage**
   - Validation: `/api/v1/dataset/:id/validate`
   - Transcription: `/api/v1/dataset/:id/transcribe`
   - Diarization: `/api/v1/dataset/:id/diarize`
   - Full Pipeline: `/api/v1/dataset/:id/process-all`

4. **Export Dataset**
   - Create export: `POST /api/v1/dataset/export`
   - Check export status
   - Download generated file

5. **Monitor Real-time Updates**
   - Connect WebSocket client
   - Subscribe to company datasets
   - Watch progress updates

---

## 🚀 PRODUCTION DEPLOYMENT NOTES

Before deploying to production:

1. **Replace Mock Implementations**
   - Implement actual Faster Whisper integration
   - Add ffmpeg/ffprobe for audio metadata
   - Integrate job queue worker (Bull/BullMQ)

2. **Configure File Storage**
   - Set up S3/Azure Blob Storage
   - Update file paths in services
   - Implement file cleanup policies

3. **Performance Optimization**
   - Add database connection pooling
   - Implement caching (Redis)
   - Set up CDN for audio files
   - Configure load balancing

4. **Security Hardening**
   - Implement rate limiting
   - Add file upload validation
   - Secure WebSocket connections
   - Implement audit logging

5. **Monitoring & Logging**
   - Set up application monitoring (Datadog, New Relic)
   - Configure error tracking (Sentry)
   - Implement performance monitoring
   - Set up alerting

---

## 📚 ADDITIONAL RESOURCES

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Socket.IO Documentation](https://socket.io/docs)
- [Phase 4.3.1 Complete Documentation](./PHASE_4.3.1_DATASET_PIPELINE_COMPLETE.md)

---

## ✅ SUCCESS CRITERIA

You'll know the setup is complete when:

- ✅ Prisma client generates without errors
- ✅ Backend compiles with 0 TypeScript errors
- ✅ Frontend compiles with 0 errors
- ✅ Both servers start successfully
- ✅ Can access Dataset Manager UI
- ✅ Dashboard shows statistics (even if 0)
- ✅ Can upload a test file
- ✅ Jobs are created and tracked
- ✅ Real-time updates work via WebSocket

---

*Last Updated: July 19, 2026*  
*Version: 1.0*  
*Phase: 4.3.1 Setup Guide*
