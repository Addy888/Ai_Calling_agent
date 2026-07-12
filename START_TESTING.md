# Start Testing - AI Memory Manager

## Quick Start Commands

### Terminal 1 - Backend API
```bash
cd apps/api
npm run start:dev
```
**Wait for**: `Application successfully started on: http://localhost:3001`

### Terminal 2 - Frontend
```bash
cd apps/web
npm run dev
```
**Wait for**: `ready - started server on 0.0.0.0:3000`

### Open Browser
```
http://localhost:3000/dashboard/memory
```

---

## Test API Endpoints (with curl)

### 1. Create Conversation
```bash
curl -X POST http://localhost:3001/api/v1/memory/conversation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "companyId": "YOUR_COMPANY_ID",
    "currentLanguage": "en",
    "currentIntent": "greeting"
  }'
```

### 2. Create Customer Memory
```bash
curl -X POST http://localhost:3001/api/v1/memory/customer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "CONVERSATION_ID_FROM_STEP_1",
    "companyId": "YOUR_COMPANY_ID",
    "customerName": "John Doe",
    "phoneNumber": "+1234567890",
    "city": "New York",
    "state": "NY",
    "leadStatus": "NEW"
  }'
```

### 3. Create Session Memory
```bash
curl -X POST http://localhost:3001/api/v1/memory/session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "companyId": "YOUR_COMPANY_ID",
    "greetingCompleted": true,
    "currentStep": "qualification"
  }'
```

### 4. Get Customer Context (Most Important!)
```bash
curl -X POST http://localhost:3001/api/v1/memory/context \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID",
    "sessionId": "test-session-001"
  }'
```

### 5. Update Customer Lead Status
```bash
curl -X PUT http://localhost:3001/api/v1/memory/customer/CONVERSATION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadStatus": "INTERESTED",
    "budget": "$500,000",
    "interests": {
      "location": "Downtown",
      "propertyType": "3BHK"
    },
    "salesNotes": "Customer shows strong interest"
  }'
```

### 6. Update Session Progress
```bash
curl -X PUT http://localhost:3001/api/v1/memory/session/test-session-001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qualificationCompleted": true,
    "budgetCollected": true,
    "locationCollected": true,
    "collectedData": {
      "budget": "$500,000",
      "location": "New York",
      "propertyType": "3BHK"
    }
  }'
```

### 7. Get Active Conversations
```bash
curl -X GET http://localhost:3001/api/v1/memory/active/YOUR_COMPANY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Get Leads by Status
```bash
curl -X GET http://localhost:3001/api/v1/memory/leads/YOUR_COMPANY_ID/INTERESTED \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 9. Restore Conversation (Returning Customer)
```bash
curl -X POST http://localhost:3001/api/v1/memory/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID",
    "sessionId": "new-session-002",
    "phoneNumber": "+1234567890"
  }'
```

### 10. Create Memory Snapshot
```bash
curl -X POST http://localhost:3001/api/v1/memory/snapshot \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "CONVERSATION_ID",
    "snapshotType": "QUALIFICATION_COMPLETE",
    "snapshotData": {
      "leadStatus": "QUALIFIED",
      "qualificationScore": 85
    },
    "intent": "qualification"
  }'
```

### 11. Get Memory History
```bash
curl -X GET http://localhost:3001/api/v1/memory/history/CONVERSATION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 12. Get Customer Timeline
```bash
curl -X GET http://localhost:3001/api/v1/memory/timeline/YOUR_COMPANY_ID/CONTACT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Frontend Testing Checklist

### Memory Dashboard Page
1. Navigate to `http://localhost:3000/dashboard/memory`
2. Verify statistics cards show:
   - Active Conversations
   - Qualified Leads
   - Total Interactions
   - Avg Session Duration
3. Verify conversation list displays
4. Test search bar (search by name, phone, session)
5. Test lead status filter dropdown
6. Click through all tabs:
   - Memory Overview
   - Customer Memory
   - Lead Tracking
7. Click "View Details" button on a conversation
8. Click "Timeline" button on a conversation

---

## Get Your JWT Token

### Option 1: Login via Frontend
1. Go to `http://localhost:3000/login`
2. Login with your credentials
3. Open Browser DevTools (F12)
4. Go to Application > Local Storage
5. Find `token` or `accessToken`
6. Copy the token value

### Option 2: Login via API
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

Response will contain:
```json
{
  "accessToken": "YOUR_JWT_TOKEN_HERE"
}
```

---

## Get Your Company ID

### Option 1: Check Database
```sql
SELECT id, name FROM companies LIMIT 1;
```

### Option 2: Get from API
```bash
curl -X GET http://localhost:3001/api/v1/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Lead Status Values

Use these values in API calls:
- `NEW` - First contact
- `INTERESTED` - Customer showing interest
- `NOT_INTERESTED` - Not interested
- `CALL_BACK_LATER` - Schedule callback
- `WRONG_NUMBER` - Invalid contact
- `BUSY` - Customer busy, retry later
- `DO_NOT_CALL` - Customer opt-out
- `QUALIFIED` - Meets qualification criteria
- `CONVERTED` - Deal closed successfully
- `LOST` - Deal lost

---

## Common API Responses

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionId": "test-session-001",
    ...
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

---

## Troubleshooting

### Backend Not Starting
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill the process if needed
taskkill /PID <PID> /F

# Restart
cd apps/api
npm run start:dev
```

### Frontend Not Starting
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill the process if needed
taskkill /PID <PID> /F

# Restart
cd apps/web
npm run dev
```

### 401 Unauthorized Error
- Check your JWT token is valid
- Check token is not expired
- Ensure you're including `Authorization: Bearer TOKEN` header

### 403 Forbidden Error
- Check user has required permissions:
  - `memory:create`
  - `memory:read`
  - `memory:update`
  - `memory:delete`

### Database Connection Error
- Check `.env` file has correct `DATABASE_URL`
- Ensure MySQL is running
- Verify database exists

---

## Testing Flow (Recommended Order)

### Flow 1: New Customer Call
1. Create conversation
2. Create customer memory
3. Create session memory
4. Get customer context
5. Update session progress
6. Update customer lead status
7. Create memory snapshot
8. Get memory history

### Flow 2: Returning Customer
1. Create new conversation (different sessionId)
2. Restore conversation (use phoneNumber from previous)
3. Verify customer data is restored
4. Continue conversation
5. Update lead status

### Flow 3: Dashboard Testing
1. Open Memory dashboard
2. Verify statistics
3. Search for conversations
4. Filter by lead status
5. View conversation details
6. Check customer timeline

---

## Expected Results

### After Creating Conversation
- Conversation record created in database
- Returns conversation ID
- Status: `isActive: true`

### After Creating Customer Memory
- Customer profile stored
- Lead status set to NEW
- Total interactions: 1

### After Getting Context
- Returns complete context object
- Includes conversation, customer, session data
- Formatted context string for AI

### After Restoring Conversation
- New conversation created
- Customer data copied from previous
- Previous conversation linked
- Restored context returned

---

## Performance Benchmarks

### API Response Times (Expected)
- Create operations: < 100ms
- Read operations: < 50ms
- Update operations: < 100ms
- Delete operations: < 50ms
- Context building: < 150ms
- Restore conversation: < 200ms

### Database Queries
- All queries use indexes
- No N+1 queries
- Efficient joins

---

## Success Criteria

✅ Backend starts without errors  
✅ Frontend starts without errors  
✅ Memory dashboard loads  
✅ Statistics display correctly  
✅ All API endpoints return 200/201  
✅ Conversation can be created  
✅ Customer memory can be created  
✅ Session memory can be created  
✅ Context can be retrieved  
✅ Conversation can be restored  
✅ Search and filter work  
✅ No console errors  
✅ JWT authentication works  
✅ Permissions are enforced  

---

## Need Help?

1. Check `PHASE_3.3_COMPLETE.md` for feature details
2. Check `PHASE_3.3_README.md` for usage guide
3. Check `PHASE_3.3_DELIVERY.md` for implementation details
4. Review code comments in service/controller files
5. Check API responses for error messages

---

**Happy Testing! 🚀**

Phase 3.3 - AI Memory Manager is ready for comprehensive testing.

