# Phase 4.3.1 - Quick Start Guide

## 🚀 Setup in 3 Steps

### Option A: Automated Setup (Recommended)

```powershell
# Run the setup script
.\setup-dataset-pipeline.ps1
```

The script will:
1. Stop all Node.js processes
2. Generate Prisma client
3. Run database migration
4. Build backend
5. Verify folder structure

---

### Option B: Manual Setup

```bash
# Step 1: Stop all Node.js processes
# Use Task Manager (Ctrl+Shift+Esc) or PowerShell:
Get-Process node | Stop-Process -Force

# Step 2: Generate Prisma client
cd database
npx prisma generate

# Step 3: Run migration
npx prisma migrate dev --name add_dataset_processing_pipeline

# Step 4: Build backend
cd ..\apps\api
npm run build

# Step 5: Start servers
npm run start:dev    # Terminal 1
cd ..\web
npm run dev          # Terminal 2
```

---

## 🎯 Access the System

After setup:

1. **Backend API:** http://localhost:3001
2. **Frontend UI:** http://localhost:3000
3. **API Docs:** http://localhost:3001/api/docs
4. **Dataset Manager:** http://localhost:3000/dashboard/dataset-manager

---

## 📋 Key Features

### Upload Manager
- Single file upload
- Bulk upload
- Drag & drop support
- Duplicate detection (MD5 hash)
- Progress tracking

### Processing Pipeline (8 Stages)
1. **Validation** - Audio quality checks
2. **Transcription** - Speech-to-text (Faster Whisper)
3. **Diarization** - Speaker separation
4. **Conversation Parsing** - Structured conversation
5. **Entity Extraction** - Extract budget, location, property, etc.
6. **Intent Detection** - Detect customer intent
7. **Lead Classification** - Hot/Warm/Cold scoring
8. **PII Masking** - Protect sensitive data

### Dashboard Statistics
- Total files, processed, pending, failed
- Languages detected (Hindi, English, Marathi)
- Total audio duration
- Storage used
- Average noise level
- Processing statistics by stage

### Export Formats
- JSON (structured)
- JSONL (line-delimited)
- CSV (tabular)
- SQLite (database)

Ready for Google Colab AI training.

---

## 🔧 Quick API Tests

```bash
# Get dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/dataset/dashboard

# List datasets
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/dataset

# Upload file
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@recording.mp3" \
  http://localhost:3001/api/v1/dataset/upload

# Process full pipeline
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/dataset/{id}/process-all
```

---

## 📁 Folder Structure

```
Ai voice Dataset/
├── raw_calls/              # Upload recordings here
├── processed_audio/        # Processed audio files
├── transcripts/            # Generated transcripts (.txt)
├── diarization/            # Speaker diarization (.json)
├── conversation_json/      # Structured conversations (.json)
├── datasets/               # Prepared datasets
├── exports/                # Export files (JSON, CSV, SQLite)
├── logs/                   # Processing logs
└── temp/                   # Temporary files
```

---

## 🐛 Troubleshooting

### Prisma Generation Fails
**Error:** `EPERM: operation not permitted`  
**Solution:** Stop all Node.js processes using Task Manager

### Backend Build Fails
**Error:** `Property does not exist on PrismaService`  
**Solution:** Run `npx prisma generate` in database folder

### Migration Fails
**Error:** `Can't reach database server`  
**Solution:** Check DATABASE_URL in .env file

### Port Already in Use
**Error:** `Port 3001 is already in use`  
**Solution:** Stop existing server or change PORT in .env

---

## 📚 Documentation

- **Complete Documentation:** [PHASE_4.3.1_DATASET_PIPELINE_COMPLETE.md](./PHASE_4.3.1_DATASET_PIPELINE_COMPLETE.md)
- **Detailed Setup Guide:** [PHASE_4.3.1_SETUP_GUIDE.md](./PHASE_4.3.1_SETUP_GUIDE.md)
- **Phase 4.2 (Voice Studio):** [PHASE_4.2_VOICE_STUDIO_COMPLETE.md](./PHASE_4.2_VOICE_STUDIO_COMPLETE.md)

---

## ✅ Success Checklist

- [ ] Prisma client generated
- [ ] Database migration applied
- [ ] Backend compiles (0 errors)
- [ ] Backend starts successfully
- [ ] Frontend compiles (0 errors)
- [ ] Frontend starts successfully
- [ ] Can access Dataset Manager UI
- [ ] Dashboard shows statistics
- [ ] Can upload a test file
- [ ] Jobs are created
- [ ] Real-time updates work

---

## 💡 Tips

1. **Test with Small Files First**  
   Upload 1-2 small audio files to test the pipeline before bulk processing.

2. **Monitor Processing Logs**  
   Check the logs tab in Dataset Manager to see detailed processing steps.

3. **Use WebSocket for Real-time Updates**  
   Connect to Socket.IO to see live progress updates.

4. **Export Without PII**  
   When exporting for AI training, set `includePII: false` to mask sensitive data.

5. **Existing Recordings**  
   Move files from `Ai voice Dataset/Recording/` to `raw_calls/` to process existing 600+ recordings.

---

## 🆘 Need Help?

1. Read [PHASE_4.3.1_SETUP_GUIDE.md](./PHASE_4.3.1_SETUP_GUIDE.md) for detailed instructions
2. Check the troubleshooting section above
3. Review console logs for specific errors
4. Check Prisma Studio: `npx prisma studio`

---

*Last Updated: July 19, 2026*  
*Version: 1.0*  
*Phase: 4.3.1 Quick Start*
