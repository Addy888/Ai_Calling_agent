# AI Evaluation Engine - Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: Toast Notifications Not Working

**Symptoms**:
- Runtime error: "useToast is not a function"
- Error: "Element type is invalid"
- Toast doesn't appear

**Solution**:
All toast issues have been fixed. If you encounter them:

1. Verify imports are correct:
```typescript
// Correct
import { useToast, toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

// Wrong
import { useToast } from '@/components/ui/toast'; // ❌
import { Toaster } from '@/components/ui/toast'; // ❌
```

2. Use toast correctly:
```typescript
// Correct
const { toast } = useToast();
toast({
  title: 'Success',
  description: 'Operation completed'
});

// Wrong
toast.success('Message'); // ❌
toast.error('Message'); // ❌
```

3. Clear Next.js cache:
```bash
cd apps/web
Remove-Item -Recurse -Force .next
npm run dev
```

---

### Issue 2: Build Errors

**Symptoms**:
- TypeScript compilation errors
- "Property does not exist" errors
- Module not found errors

**Solution**:

1. Check all imports are correct
2. Clear cache and rebuild:
```bash
cd apps/web
Remove-Item -Recurse -Force .next
npm run build
```

3. If using development server:
```bash
npm run dev
```

---

### Issue 3: API Connection Errors

**Symptoms**:
- "Failed to fetch" errors
- 404 Not Found
- CORS errors

**Solution**:

1. Ensure backend is running:
```bash
cd apps/api
npm run start:dev
```

2. Check API URL in environment:
```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

3. Verify CORS settings in backend:
```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: 'http://localhost:3002',
  credentials: true,
});
```

---

### Issue 4: Authentication Errors

**Symptoms**:
- 401 Unauthorized
- Token expired
- Access denied

**Solution**:

1. Ensure you're logged in:
```
Navigate to /login
Enter credentials
```

2. Check token is being sent:
```typescript
// Verify Authorization header
headers: {
  'Authorization': `Bearer ${token}`
}
```

3. Token might be expired - log in again

---

### Issue 5: Evaluation Not Running

**Symptoms**:
- No evaluation data
- Empty dashboard
- API returns no results

**Solution**:

1. Verify conversation exists:
```bash
# Check if conversation is in database
```

2. Manually trigger evaluation:
```bash
curl -X POST http://localhost:4000/api/evaluation/evaluate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "uuid",
    "companyId": "uuid"
  }'
```

3. Check backend logs for errors

4. Ensure all required data exists:
- Conversation must exist
- Company must exist
- User must have permissions

---

### Issue 6: Configuration Not Saving

**Symptoms**:
- Configuration reverts to default
- Changes not persisting
- Save button not working

**Solution**:

1. Verify weight sum equals 1.0:
```typescript
const sum = Object.values(weights).reduce((a, b) => a + b, 0);
if (sum !== 1.0) {
  // Show error
}
```

2. Check validation messages

3. Ensure API is receiving request:
```typescript
// Check network tab in browser
PUT /api/evaluation/configuration
```

4. Verify user has permission to update configuration

---

### Issue 7: Scores Not Calculating

**Symptoms**:
- All scores show 0
- NaN values
- Missing scores

**Solution**:

1. Check conversation has messages:
```typescript
// Conversation must have at least 1 message
```

2. Verify all required fields exist:
- Script ID (if using script compliance)
- Knowledge base entries (if using knowledge accuracy)
- Decisions (if using decision accuracy)

3. Check service logs for errors

4. Ensure weights are configured:
```typescript
// Default weights if not configured
weights: {
  conversation: 0.20,
  script: 0.15,
  knowledge: 0.15,
  decision: 0.15,
  lead: 0.10,
  memory: 0.10,
  businessRule: 0.10,
  safety: 0.05
}
```

---

### Issue 8: Dashboard Not Loading

**Symptoms**:
- Blank page
- Infinite loading
- Component errors

**Solution**:

1. Check browser console for errors

2. Verify API is returning data:
```bash
curl http://localhost:4000/api/evaluation/analytics?companyId=uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Check date range filter

4. Ensure company has evaluation data

5. Clear browser cache:
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

---

### Issue 9: Wrong Port in Use

**Symptoms**:
- "Port 3000 is in use"
- Server won't start

**Solution**:

1. Next.js will automatically use next available port (3001, 3002, etc.)

2. Or manually stop process using port:
```bash
# Find process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

3. Or specify different port:
```bash
npm run dev -- -p 3005
```

---

### Issue 10: Database Connection Errors

**Symptoms**:
- "Can't reach database server"
- Connection timeout
- Authentication failed

**Solution**:

1. Check database is running

2. Verify connection string:
```env
# apps/api/.env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

3. Run migrations:
```bash
cd apps/api
npx prisma migrate dev
```

4. Generate Prisma client:
```bash
npx prisma generate
```

---

## Performance Issues

### Issue 11: Slow Evaluation

**Symptoms**:
- Evaluation takes > 5 seconds
- Timeout errors
- High CPU usage

**Solution**:

1. Check conversation size:
- Very long conversations take longer
- Consider chunking large conversations

2. Optimize database queries:
- Add indexes if needed
- Use pagination

3. Enable caching:
```typescript
// Cache evaluation results
```

4. Run evaluations asynchronously:
```typescript
// Queue evaluations for background processing
```

---

### Issue 12: High Memory Usage

**Symptoms**:
- Server running out of memory
- Slow performance
- Crashes

**Solution**:

1. Limit concurrent evaluations

2. Clear old evaluation data:
```sql
DELETE FROM "EvaluationReport"
WHERE "createdAt" < NOW() - INTERVAL '90 days';
```

3. Increase server memory

4. Optimize data structures

---

## Development Issues

### Issue 13: Hot Reload Not Working

**Symptoms**:
- Changes not reflecting
- Need to restart server
- Stale code

**Solution**:

1. Restart development server:
```bash
# Stop with Ctrl+C
npm run dev
```

2. Clear cache:
```bash
Remove-Item -Recurse -Force .next
```

3. Check file watcher limits (Linux/Mac)

---

### Issue 14: TypeScript Errors in IDE

**Symptoms**:
- Red squiggly lines
- Type errors in editor
- IntelliSense not working

**Solution**:

1. Restart TypeScript server:
```
Ctrl+Shift+P → TypeScript: Restart TS Server
```

2. Regenerate types:
```bash
cd apps/api
npx prisma generate
```

3. Check tsconfig.json is valid

4. Restart IDE

---

## Testing Issues

### Issue 15: Can't Test Evaluation

**Symptoms**:
- No test conversations
- Can't trigger evaluation
- No sample data

**Solution**:

1. Create test conversation:
```typescript
// Use API or database seeder
```

2. Use Postman or curl to test API

3. Check evaluation configuration is set

4. Verify all required entities exist

---

## Quick Fixes

### Reset Everything
```bash
# Stop all servers
# Clear caches
cd apps/web
Remove-Item -Recurse -Force .next

# Rebuild
npm run build

# Restart
npm run dev
```

### Reset Database
```bash
cd apps/api
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
```

### Reset Configuration
```typescript
// Use default weights
weights: {
  conversation: 0.20,
  script: 0.15,
  knowledge: 0.15,
  decision: 0.15,
  lead: 0.10,
  memory: 0.10,
  businessRule: 0.10,
  safety: 0.05
}
```

---

## Getting Help

### Check Logs

**Backend**:
```bash
cd apps/api
npm run start:dev
# Check console output
```

**Frontend**:
```bash
cd apps/web
npm run dev
# Check console output
# Check browser console (F12)
```

### Debug Mode

Enable verbose logging:
```typescript
// apps/api/src/main.ts
Logger.log('Evaluation started');
Logger.error('Evaluation failed');
```

### Network Tab

Check API calls in browser:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by XHR
4. Check request/response

---

## Prevention

### Best Practices

1. **Always clear cache after updates**
```bash
Remove-Item -Recurse -Force .next
```

2. **Keep dependencies updated**
```bash
npm update
```

3. **Use TypeScript strictly**
```typescript
// Enable strict mode in tsconfig.json
"strict": true
```

4. **Monitor logs**
```typescript
// Log important operations
Logger.log('Starting evaluation', { conversationId });
```

5. **Test locally before deploying**
```bash
npm run build
npm run start
```

---

## Status Checks

### Health Check Checklist

- [ ] Backend running (port 4000)
- [ ] Frontend running (port 3002)
- [ ] Database connected
- [ ] Migrations applied
- [ ] Environment variables set
- [ ] Authentication working
- [ ] API responding
- [ ] Toast notifications working
- [ ] Pages loading
- [ ] No console errors

### Quick Test

1. Open http://localhost:3002
2. Log in
3. Navigate to /dashboard/evaluation
4. Check if page loads
5. Try creating evaluation
6. Verify toast appears

---

## Emergency Recovery

If everything breaks:

```bash
# 1. Stop all servers
# Press Ctrl+C in all terminals

# 2. Clean everything
cd apps/web
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
npm install

cd ../api
Remove-Item -Recurse -Force dist
Remove-Item -Recurse -Force node_modules
npm install

# 3. Reset database
npx prisma migrate reset --force
npx prisma migrate dev
npx prisma generate

# 4. Rebuild
cd ../web
npm run build

# 5. Start fresh
npm run dev
```

---

## Support Resources

### Documentation
- See `PHASE_3.7_COMPLETE.md` for full documentation
- See `EVALUATION_USAGE_GUIDE.md` for usage instructions
- See `TOAST_FIX_SUMMARY.md` for toast setup

### Common Commands
```bash
# Build
npm run build

# Development
npm run dev

# Production
npm run start

# Database
npx prisma migrate dev
npx prisma generate
npx prisma studio

# Logs
npm run start:dev | tee output.log
```

### Environment Check
```bash
# Check Node version
node --version  # Should be >= 18

# Check npm version
npm --version   # Should be >= 8

# Check ports
netstat -ano | findstr :3000
netstat -ano | findstr :4000
```

---

**Remember**: Most issues can be solved by clearing caches and restarting servers!
