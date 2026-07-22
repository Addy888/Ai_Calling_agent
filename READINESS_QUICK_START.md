# Training Readiness Checker - Quick Start Guide

## Overview
The Training Readiness Checker validates all requirements before creating AI training jobs.

## Access
**URL**: `/dashboard/training/readiness`

---

## Quick Actions

### 1. View Latest Report
Navigate to the readiness dashboard to see the most recent validation report.

### 2. Run New Check
Click **"Run Check"** button to execute a fresh validation.

### 3. Check Score
View the **Overall Score** (0-100) to determine training readiness.

### 4. Review Status
Check the **Status Badge**:
- 🟢 **READY** (≥90): Can create training job
- 🔵 **ALMOST_READY** (75-89): Minor fixes needed
- 🟡 **CONFIGURATION_REQUIRED** (60-74): Config updates needed
- 🟠 **VALIDATION_FAILED**: Dataset validation required
- 🔴 **BLOCKED**: Critical issues present
- ⚫ **NOT_READY** (<60): Multiple issues

---

## Component Scores

| Component | Weight | Check Focus |
|-----------|--------|-------------|
| 📊 Dataset | 30% | Validation, quality, records |
| 🤖 Model | 25% | Selection, status, license |
| ⚙️ Configuration | 20% | Parameters, settings |
| 🎯 Compatibility | 15% | Model-dataset match |
| 🔒 Security | 10% | Auth, permissions, ownership |

---

## Understanding Issues

### 🚨 Blockers (Critical)
**Must fix** before training can start.

Common blockers:
- No dataset selected
- No model selected
- Dataset not validated
- Model inactive
- No compatibility report

**Action**: Fix immediately to unblock training.

### ⚠️ Warnings (Non-Critical)
**Should address** but not blocking.

Common warnings:
- Duplicate samples in dataset
- Low validation score
- Workspace access unverified

**Action**: Improve quality but can proceed.

### 💡 Recommendations
**Nice to have** improvements.

Common recommendations:
- Optimize dataset quality
- Run compatibility check
- Update configuration

**Action**: Consider for better results.

---

## System Requirements

View estimated resources needed:

| Resource | Description |
|----------|-------------|
| 🖥️ GPU Memory | Min & recommended VRAM |
| 💾 RAM | System memory needed |
| 💿 Disk Space | Storage required |
| ⏱️ Training Time | Estimated duration |
| 📦 Checkpoints | Checkpoint file size |

---

## API Usage

### Run Check
```bash
curl -X POST http://localhost:3000/api/training/readiness/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetId": "dataset-uuid",
    "modelRegistryId": "model-uuid",
    "forceNew": true
  }'
```

### Get Latest
```bash
curl http://localhost:3000/api/training/readiness/latest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Summary
```bash
curl http://localhost:3000/api/training/readiness/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Issue: "No Dataset Selected"
**Solution**: Go to Dataset Manager and select/upload a dataset

### Issue: "Dataset Not Validated"
**Solution**: Navigate to Dataset Validation and run validation

### Issue: "No Model Selected"
**Solution**: Visit Model Registry and select a base model

### Issue: "Compatibility Report Missing"
**Solution**: Run Compatibility Check from Model Selection

### Issue: "Model Inactive"
**Solution**: Activate the model in Model Registry

### Issue: Low Score
**Actions**:
1. Check Blockers tab - fix critical issues
2. Review Warnings tab - address quality issues
3. Read Recommendations tab - follow suggestions
4. Re-run check after fixes

---

## Workflow

```
1. Upload Dataset
   ↓
2. Validate Dataset
   ↓
3. Select Base Model
   ↓
4. Run Compatibility Check
   ↓
5. Configure Training Parameters
   ↓
6. **Run Readiness Check** ← You are here
   ↓
7. Fix Any Blockers
   ↓
8. Create Training Job ✅
```

---

## Score Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 96-100 | Excellent | Create training job |
| 90-95 | Very Good | Create training job |
| 85-89 | Good | Consider minor improvements |
| 75-84 | Fair | Review warnings |
| 60-74 | Poor | Fix configuration issues |
| 0-59 | Fail | Fix critical blockers |

---

## Tips

✅ **DO**:
- Run check before creating training jobs
- Fix all critical blockers
- Review system requirements
- Check compatibility report exists
- Verify security settings

❌ **DON'T**:
- Skip validation to save time
- Ignore critical blockers
- Proceed with inactive models
- Use unvalidated datasets

---

## Next Steps After READY Status

1. ✅ Review final score and requirements
2. ✅ Export report (optional)
3. ✅ Click "Create Training Job"
4. ✅ Configure job parameters
5. ✅ Start training

---

## Support

- **Documentation**: See `READINESS_CHECKER_README.md`
- **API Docs**: Visit `/api/docs#/Training%20Readiness`
- **Dashboard**: `/dashboard/training/readiness`

---

## Quick Reference

```
High Score (>90)  → READY     → Can train
Medium Score (60-89) → CONFIG   → Need fixes
Low Score (<60)   → BLOCKED  → Critical issues

Blockers   → MUST FIX
Warnings   → SHOULD FIX  
Recommendations → NICE TO FIX
```

---

**Remember**: The readiness checker doesn't train models—it only validates that everything is ready for training to begin successfully.
