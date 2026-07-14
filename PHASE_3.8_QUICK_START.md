# Phase 3.8: Quick Start Guide

## Getting Started with AI Training & Validation Platform

### Step 1: Access the Training Dashboard
Navigate to: `http://localhost:3000/dashboard/training`

### Step 2: Create Your First Dataset

#### Option A: Manual Creation
1. Click "New Dataset" button
2. Fill in dataset details:
   - Name: e.g., "Production Knowledge Base"
   - Type: Select from dropdown (KNOWLEDGE, CONVERSATION, etc.)
   - Description: Optional
3. Click "Create"

#### Option B: Automated Building
1. Create an empty dataset first
2. Navigate to dataset details
3. Click "Build from Source"
4. Select data source type
5. Configure filters (date range, categories, etc.)
6. Click "Build Dataset"

### Step 3: Validate Dataset Quality
1. Go to dataset details page
2. Click "Validate" button
3. Select validation type:
   - STRUCTURE - Check data format
   - CONTENT - Verify content quality
   - DUPLICATE - Find duplicates
   - REFERENCE - Check broken links
4. Review validation results
5. Fix any issues identified

### Step 4: Calculate Coverage
1. Navigate to Coverage Dashboard
2. Click "Calculate Coverage" for a dataset
3. Review coverage by:
   - Dataset type
   - Category
   - Expected vs. actual counts
4. Address coverage gaps

### Step 5: Check AI Readiness
1. Go to Readiness Dashboard
2. View overall readiness score (target: ≥85%)
3. Review component scores:
   - Knowledge Readiness
   - Conversation Readiness
   - Prompt Readiness
   - Script Readiness
   - Decision Engine Readiness
4. Address any blockers
5. Follow recommendations

### Step 6: Create Training Version
1. Go to Version Manager
2. Click "Create Version"
3. Fill in version details:
   - Version number: e.g., "1.0.0"
   - Name: e.g., "Production Release v1"
   - Description
4. Select datasets to include
5. Click "Create"
6. Review readiness report

### Step 7: Deploy to Production
Once readiness score ≥ 85%:
1. Review final readiness report
2. Ensure no critical blockers
3. Click "Deploy to Production"
4. Monitor deployment status

## API Quick Reference

### Create Dataset
```bash
POST /api/training/datasets
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Dataset",
  "datasetType": "KNOWLEDGE",
  "description": "Training data for knowledge base"
}
```

### Build Knowledge Dataset
```bash
POST /api/dataset-builder/:datasetId/build-knowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "categories": ["FAQ", "Documentation"],
  "filters": {}
}
```

### Validate Dataset
```bash
POST /api/training/datasets/:datasetId/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "validationType": "COMPREHENSIVE"
}
```

### Get Readiness Score
```bash
GET /api/training/readiness
Authorization: Bearer <token>
```

### Calculate Coverage
```bash
POST /api/validation/datasets/:datasetId/coverage
Authorization: Bearer <token>
```

## Common Workflows

### Workflow 1: Complete Training Pipeline
1. Create datasets for each type
2. Build datasets from existing data
3. Validate all datasets
4. Calculate coverage
5. Review readiness score
6. Fix blockers
7. Create training version
8. Deploy

### Workflow 2: Quick Quality Check
1. Select existing dataset
2. Run validation
3. Review results
4. Fix issues
5. Re-validate

### Workflow 3: Coverage Analysis
1. Navigate to Coverage Dashboard
2. Review overall coverage
3. Identify gaps
4. Add missing data
5. Re-calculate coverage

### Workflow 4: Version Management
1. Create new version
2. Include validated datasets
3. Review readiness
4. Compare with previous versions
5. Activate if ready

## Troubleshooting

### Low Readiness Score
- Check individual component scores
- Review blockers and warnings
- Add more training data
- Improve data quality
- Fill coverage gaps

### Validation Failures
- Check error messages in validation report
- Fix data format issues
- Remove duplicates
- Update broken references
- Re-run validation

### Low Coverage
- Review missing items in coverage report
- Add more data sources
- Expand dataset scope
- Use automated builders
- Re-calculate coverage

### Build Errors
- Ensure database is running
- Check Prisma schema is up to date
- Verify all environment variables
- Run `npm run db:generate`
- Clear node_modules and reinstall

## Best Practices

### Dataset Management
- Use descriptive names
- Add detailed descriptions
- Tag datasets appropriately
- Version datasets regularly
- Archive old datasets

### Data Quality
- Run validations before deployment
- Aim for ≥90% quality score
- Remove duplicates promptly
- Fix broken references
- Maintain data consistency

### Coverage
- Target ≥85% coverage per type
- Review coverage regularly
- Address critical gaps first
- Use automated builders
- Monitor trends over time

### Version Control
- Create versions for major changes
- Document version changes
- Test versions before activation
- Keep version history
- Enable rollback capability

### Security
- Never commit API keys
- Use environment variables
- Rotate JWT secrets regularly
- Review permissions regularly
- Monitor access logs

## Performance Tips

### Large Datasets
- Use pagination
- Enable caching
- Index frequently queried fields
- Batch operations when possible
- Monitor database performance

### Validation
- Schedule during off-peak hours
- Run incremental validations
- Cache validation results
- Parallelize where possible
- Set appropriate timeouts

### Coverage Calculation
- Cache results
- Update incrementally
- Use background jobs
- Set refresh intervals
- Monitor execution time

## Support & Resources

### Documentation
- Full API docs: `/api/docs`
- Database schema: `database/prisma/schema.prisma`
- Implementation details: `PHASE_3.8_IMPLEMENTATION.md`

### Monitoring
- Training Dashboard: Real-time status
- Validation Dashboard: Quality metrics
- Coverage Dashboard: Gap analysis
- Readiness Dashboard: Deployment status

### Key Metrics to Monitor
- Overall readiness score (target: ≥85%)
- Dataset quality scores (target: ≥90%)
- Coverage percentages (target: ≥85%)
- Validation success rate (target: ≥95%)
- Training job completion rate (target: ≥98%)

## Next Phase Preview

### Phase 4 will focus on:
- Live AI deployment
- Real-time inference
- Performance optimization
- Monitoring and analytics
- Continuous learning
- A/B testing
- Model serving

The training platform provides the foundation for Phase 4 by ensuring all AI components are properly trained, validated, and ready for production deployment.
