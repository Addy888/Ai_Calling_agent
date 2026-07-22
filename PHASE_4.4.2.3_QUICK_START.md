# Phase 4.4.2.3 - Base Model Selection Engine

## 🚀 Quick Start Guide

### Overview
Enterprise Base Model Selection Engine for choosing optimal base models for fine-tuning.

---

## 📋 Prerequisites

- ✅ Backend running (Port 3000)
- ✅ Frontend running (Port 3001)
- ✅ Database configured
- ✅ Prisma client generated
- ✅ User authenticated

---

## 🎯 Quick Access

### Frontend URL
```
http://localhost:3001/dashboard/training/model-selection
```

### API Endpoints
```
Base URL: http://localhost:3000/api/training/model-selection

GET    /available-models       # List all models
POST   /select                 # Select a model
GET    /selected               # Get selected model
PUT    /:selectionId           # Update selection
DELETE /:selectionId           # Remove selection
POST   /compare                # Compare models
POST   /recommend              # Get recommendation
GET    /audit-logs             # View audit trail
```

---

## 🏃 Getting Started

### 1. Start the Application

```bash
# Terminal 1 - Backend
cd apps/api
npm run dev

# Terminal 2 - Frontend
cd apps/web
npm run dev
```

### 2. Access the Dashboard

1. Open browser: `http://localhost:3001`
2. Login with admin credentials
3. Navigate to: **Dashboard → Training → Model Selection**

### 3. Browse Available Models

- View all registered base models
- Filter by provider, status
- Search by name or family
- See model specifications

### 4. Select a Model

**Option A: Manual Selection**
```
1. Browse models
2. Click "Select Model" on preferred model
3. Optionally link to dataset
4. Provide selection reason
5. Confirm selection
```

**Option B: Get AI Recommendation**
```
1. Click "Get Recommendation" button
2. Optionally select a dataset
3. Review recommendation with confidence score
4. See advantages and limitations
5. Click "Apply Recommendation"
```

### 5. View Selected Model

```
Tab: "Selected Model"
- Complete model specifications
- VRAM requirements
- Language support
- Selection reason
- Associated dataset
```

---

## 📡 API Usage Examples

### Get Available Models

```bash
curl -X GET http://localhost:3000/api/training/model-selection/available-models \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Select a Model

```bash
curl -X POST http://localhost:3000/api/training/model-selection/select \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelRegistryId": "model-uuid",
    "datasetId": "dataset-uuid",
    "selectionReason": "Best fit for our use case"
  }'
```

### Get Recommendation

```bash
curl -X POST http://localhost:3000/api/training/model-selection/recommend \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetId": "dataset-uuid"
  }'
```

### Compare Models

```bash
curl -X POST http://localhost:3000/api/training/model-selection/compare \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelIds": ["model-uuid-1", "model-uuid-2", "model-uuid-3"]
  }'
```

### Get Selected Model

```bash
curl -X GET "http://localhost:3000/api/training/model-selection/selected?trainingConfigId=config-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Remove Selection

```bash
curl -X DELETE http://localhost:3000/api/training/model-selection/selection-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧪 Testing

### Test the Flow

1. **Browse Models**
   - ✅ Models display correctly
   - ✅ Filters work
   - ✅ Search works
   - ✅ Status badges show

2. **Select Model**
   - ✅ Selection dialog opens
   - ✅ Datasets load
   - ✅ Selection saves
   - ✅ Toast notification shows
   - ✅ Selected badge appears

3. **Get Recommendation**
   - ✅ Recommendation dialog opens
   - ✅ Confidence score displays
   - ✅ Advantages/limitations show
   - ✅ Can apply recommendation

4. **View Selected**
   - ✅ Details display correctly
   - ✅ All specs shown
   - ✅ Can remove selection

### Verify Backend

```bash
# Check API health
curl http://localhost:3000/health

# Check Swagger docs
open http://localhost:3000/api/docs
```

---

## 🔧 Configuration

### Environment Variables

Already configured in your `.env` file:
```env
DATABASE_URL="your-database-url"
JWT_SECRET="your-jwt-secret"
```

No additional configuration needed for Model Selection.

---

## 📊 Database Operations

### Check Data

```bash
# Open Prisma Studio
npm run db:studio
```

Navigate to:
- `TrainingModelSelection` - See selections
- `ModelRegistry` - View available models
- `AIModel` - Base model library
- `ModelAuditLog` - Audit trail

---

## 🎨 UI Components Used

- **shadcn/ui** components
- **Tailwind CSS** styling
- **Lucide Icons**
- **React hooks**
- **Next.js 14** App Router

---

## 🔍 Troubleshooting

### Models Not Showing

**Problem**: No models available  
**Solution**:
```bash
# Check if models exist in database
# Open Prisma Studio and verify ModelRegistry table has data
npm run db:studio
```

### Selection Fails

**Problem**: Cannot select model  
**Solution**:
1. Verify model is active
2. Check model status (not ARCHIVED)
3. Ensure valid JWT token
4. Check browser console for errors

### Recommendation Not Working

**Problem**: Recommendation returns error  
**Solution**:
1. Verify at least one active model exists
2. Check dataset exists (if providing datasetId)
3. Review backend logs

### Frontend Not Loading

**Problem**: Page shows error  
**Solution**:
```bash
# Rebuild frontend
cd apps/web
npm run build
npm run dev
```

### API Errors

**Problem**: API returns 401/403  
**Solution**:
1. Check JWT token is valid
2. Verify user has correct permissions
3. Check authentication middleware

---

## 📝 Common Operations

### Change Selected Model

```
Method 1: Remove and reselect
1. Go to "Selected Model" tab
2. Click "Remove Selection"
3. Browse and select new model

Method 2: Update directly (via API)
1. Use PUT /model-selection/:selectionId
2. Provide new modelRegistryId
```

### Compare Multiple Models

```
1. Note model IDs from browse view
2. Use Compare API endpoint
3. Review comparison results
4. Select best model based on criteria
```

### Track Selection History

```
1. Use GET /audit-logs endpoint
2. Filter by modelId if needed
3. Review all selection events
4. Track who made changes
```

---

## 🎯 Next Steps

After selecting a base model:

1. **Configure Fine-tuning** (Phase 4.4.3)
   - Set hyperparameters
   - Configure training settings
   - Start training job

2. **Monitor Training**
   - Track training progress
   - View metrics
   - Evaluate results

3. **Deploy Model**
   - Test trained model
   - Deploy to production
   - Monitor performance

---

## 📖 Additional Resources

- **Full Documentation**: `PHASE_4.4.2.3_COMPLETE.md`
- **API Docs**: `http://localhost:3000/api/docs`
- **Project README**: `README.md`
- **Database Schema**: `database/prisma/schema.prisma`

---

## 💡 Tips

- **Use Recommendations**: The AI recommendation engine analyzes your dataset and requirements
- **Check VRAM**: Ensure selected model fits your hardware
- **Review Languages**: Verify language support matches your needs
- **Track Reasons**: Always document why you selected a model
- **Monitor Performance**: Use audit logs to track selection patterns

---

## ✅ Success Checklist

Before proceeding to training:

- [ ] At least one model available
- [ ] Model selected successfully
- [ ] Selection reason documented
- [ ] Dataset linked (if applicable)
- [ ] Selected model is active
- [ ] VRAM requirements understood
- [ ] Language support confirmed
- [ ] Audit trail visible

---

## 🆘 Support

### Need Help?

1. Check **Troubleshooting** section above
2. Review **API Documentation** at `/api/docs`
3. Check backend logs for errors
4. Review browser console for frontend issues

### Report Issues

Document:
- Steps to reproduce
- Error messages
- Browser/environment info
- Screenshots if UI issue

---

## 🎉 You're Ready!

Your Base Model Selection Engine is now operational. Start selecting the perfect model for your fine-tuning needs!

**Happy Training! 🚀**
