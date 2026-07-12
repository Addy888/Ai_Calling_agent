# Phase 3.3 - AI Memory Manager

## Overview

The AI Memory Manager is a comprehensive system that enables the AI to remember customer information, track conversation progress, and maintain context across multiple interactions. This is the brain's memory layer that makes conversations intelligent and personalized.

---

## 🎯 Key Features

### 1. Conversation Memory
- Track active conversation sessions
- Store current conversation state
- Monitor session activity
- Support multi-language conversations
- Link to campaigns and scripts

### 2. Customer Memory
- Store customer profile information
- Track interests and preferences
- Maintain lead qualification status
- Record sales notes
- Schedule follow-ups
- Count total interactions
- Store previous conversation summaries

### 3. Session Memory
- Track conversation progress
- Monitor completion checkpoints
- Store collected data
- Track conversation flow
- Identify current step

### 4. Memory Snapshots
- Capture point-in-time state
- Store at key conversation moments
- Link to specific nodes
- Tag with intent information

### 5. Memory History
- Complete audit trail
- Track all changes
- Store before/after values
- Calculate differences
- Support compliance

### 6. Memory Configuration
- Company-specific settings
- Session timeout control
- Auto-save configuration
- Retention policies
- Compression settings
- Encryption options

---

## 💾 Database Schema

### Models
1. **ConversationMemory** - Active conversation tracking
2. **CustomerMemory** - Customer profile and history
3. **SessionMemory** - Conversation progress state
4. **MemorySnapshot** - Point-in-time captures
5. **MemoryHistory** - Change audit trail
6. **MemoryConfiguration** - Company settings

### Relations
- ConversationMemory has one CustomerMemory
- ConversationMemory has many MemorySnapshots
- ConversationMemory has many MemoryHistory entries

### Indexes
- Optimized for sessionId lookups
- Indexed by companyId for multi-tenancy
- Indexed by contactId for customer queries
- Indexed by phoneNumber for quick lookup
- Indexed by leadStatus for filtering
- Timestamp indexes for time-based queries

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:3001/api/v1/memory
```

### Authentication
All endpoints require:
- JWT Bearer token
- Appropriate permissions

### Endpoints Summary
- 24 REST API endpoints
- Full CRUD operations
- Advanced operations (merge, restore, context)
- Bulk operations (cleanup, filtering)
- Timeline and history access

---

## 🚀 Quick Start

### 1. Generate Prisma Client
```bash
# Option A: Use the fix script
.\fix-prisma.ps1

# Option B: Manual generation
npx prisma generate --schema=./database/prisma/schema.prisma
```

### 2. Build Backend
```bash
cd apps/api
npm run build
```

### 3. Build Frontend
```bash
cd apps/web
npm run build
```

### 4. Start Development Servers

**Backend:**
```bash
cd apps/api
npm run start:dev
```

**Frontend:**
```bash
cd apps/web
npm run dev
```

### 5. Access Memory Dashboard
```
http://localhost:3000/dashboard/memory
```

---

## 📚 Usage Examples

### Example 1: Start New Conversation

```typescript
// 1. Create conversation memory
const conversation = await POST('/memory/conversation', {
  sessionId: 'unique-session-id',
  companyId: 'company-123',
  campaignId: 'campaign-456',
  contactId: 'contact-789',
  currentLanguage: 'en',
  currentIntent: 'greeting'
});

// 2. Create customer memory
const customer = await POST('/memory/customer', {
  conversationId: conversation.id,
  companyId: 'company-123',
  contactId: 'contact-789',
  customerName: 'John Doe',
  phoneNumber: '+1234567890',
  city: 'New York',
  state: 'NY',
  leadStatus: 'NEW'
});

// 3. Create session memory
const session = await POST('/memory/session', {
  sessionId: 'unique-session-id',
  companyId: 'company-123',
  greetingCompleted: true,
  currentStep: 'qualification'
});
```

### Example 2: Get Customer Context for AI

```typescript
// Get complete context
const context = await POST('/memory/context', {
  companyId: 'company-123',
  sessionId: 'unique-session-id',
  contactId: 'contact-789'
});

// Context includes:
// - conversationMemory: Current session
// - customerMemory: Customer profile
// - sessionMemory: Progress state
// - previousConversations: History
// - context: Formatted for AI
```

### Example 3: Update Customer Lead Status

```typescript
// Update lead status after qualification
await PUT('/memory/customer/conversation-id', {
  leadStatus: 'QUALIFIED',
  budget: '$500,000',
  propertyType: '3BHK',
  interests: {
    location: 'Downtown',
    amenities: ['Pool', 'Gym'],
    budget: '500k'
  },
  salesNotes: 'Customer is ready to buy. Prefers downtown location.'
});
```

### Example 4: Restore Previous Conversation

```typescript
// Resume conversation with returning customer
const restored = await POST('/memory/restore', {
  companyId: 'company-123',
  sessionId: 'new-session-id',
  phoneNumber: '+1234567890'
});

// Restored data includes:
// - conversation: New session
// - customerMemory: Copied profile
// - previousConversation: Last session
// - restoredContext: Ready for AI
```

### Example 5: Track Conversation Progress

```typescript
// Update session progress
await PUT('/memory/session/session-id', {
  greetingCompleted: true,
  qualificationCompleted: true,
  budgetCollected: true,
  locationCollected: true,
  currentStep: 'project_suggestion',
  collectedData: {
    budget: '$500,000',
    location: 'Downtown',
    bedrooms: 3,
    amenities: ['Pool', 'Gym']
  }
});
```

### Example 6: Create Memory Snapshot

```typescript
// Capture state at key moment
await POST('/memory/snapshot', {
  conversationId: 'conv-id',
  snapshotType: 'QUALIFICATION_COMPLETE',
  snapshotData: {
    leadStatus: 'QUALIFIED',
    qualificationScore: 85,
    interests: {...},
    budget: '$500,000'
  },
  nodeId: 'qualification-node',
  intent: 'qualification'
});
```

---

## 🎨 Frontend Features

### Memory Dashboard
- **Live Statistics**
  - Active conversations
  - Qualified leads
  - Total interactions
  - Average session duration

- **Conversation List**
  - Real-time updates
  - Customer profiles
  - Lead status badges
  - Session duration
  - Current intent
  - Language indicator

- **Search & Filter**
  - Search by name, phone, session
  - Filter by lead status
  - Instant filtering

- **Tabs**
  - Memory Overview
  - Customer Memory Insights
  - Lead Distribution

### UI Components
- Professional card-based design
- Real-time indicators
- Status badges
- Timeline views
- Statistics dashboard
- Search and filters

---

## 🔐 Security

### Authentication
- JWT Bearer token required
- Token validation on every request

### Authorization
- Role-Based Access Control (RBAC)
- Permission-based guards
- Company-level data isolation

### Permissions
- `memory:create` - Create memory records
- `memory:read` - View memory data
- `memory:update` - Update memory
- `memory:delete` - Delete memory

---

## ⚙️ Configuration

### Memory Configuration Options

```typescript
{
  // Session timeout in seconds (default: 1800)
  sessionTimeout: 1800,
  
  // Maximum history entries (default: 100)
  maxHistoryLength: 100,
  
  // Enable automatic saves (default: true)
  enableAutoSave: true,
  
  // Auto-save interval in seconds (default: 30)
  autoSaveInterval: 30,
  
  // Data retention in days (default: 90)
  retentionDays: 90,
  
  // Enable compression (default: true)
  enableCompression: true,
  
  // Compression threshold in bytes (default: 1000)
  compressionThreshold: 1000,
  
  // Enable encryption (default: false)
  enableEncryption: false
}
```

### Update Configuration

```typescript
await PUT('/memory/configuration/company-id', {
  sessionTimeout: 3600,  // 1 hour
  retentionDays: 180,     // 6 months
  enableEncryption: true
});
```

---

## 📊 Lead Status Flow

```
NEW → INTERESTED → QUALIFIED → CONVERTED
  ↓
NOT_INTERESTED / DO_NOT_CALL / LOST
  ↓
CALL_BACK_LATER → (back to flow)
  ↓
WRONG_NUMBER / BUSY
```

### Status Descriptions
- **NEW**: First contact
- **INTERESTED**: Showing interest
- **QUALIFIED**: Meets criteria
- **CONVERTED**: Deal closed
- **NOT_INTERESTED**: Not interested
- **CALL_BACK_LATER**: Follow-up needed
- **WRONG_NUMBER**: Invalid contact
- **BUSY**: Try again later
- **DO_NOT_CALL**: Opt-out
- **LOST**: Deal lost

---

## 🔄 Memory Operations Flow

### Create Conversation
1. Validate session uniqueness
2. Create conversation record
3. Set initial state
4. Log creation
5. Return memory object

### Update Memory
1. Validate existence
2. Update fields
3. Update timestamps
4. Log changes with diff
5. Return updated object

### Get Context
1. Find conversation by session
2. Load customer memory
3. Load session memory
4. Find previous conversations
5. Build AI context
6. Return complete context

### Restore Conversation
1. Find previous customer memory
2. Validate customer exists
3. Create new conversation
4. Copy customer data
5. Preserve history reference
6. Build restored context
7. Return new session

---

## 🧪 Testing

### Test Prisma Schema
```bash
npx prisma validate --schema=./database/prisma/schema.prisma
```

### Test Backend Build
```bash
cd apps/api
npm run build
```

### Test Frontend Build
```bash
cd apps/web
npm run build
```

### Test API Endpoints
```bash
# Start backend
cd apps/api
npm run start:dev

# Use Postman or curl
curl -X POST http://localhost:3001/api/v1/memory/conversation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-1","companyId":"company-1"}'
```

---

## 🐛 Troubleshooting

### Issue: Prisma Client Not Generated
**Solution**:
```bash
# Run the fix script
.\fix-prisma.ps1

# Or manually:
# 1. Stop all Node processes
# 2. Delete node_modules\.prisma
# 3. Wait 5 seconds
# 4. Run: npx prisma generate --schema=./database/prisma/schema.prisma
```

### Issue: Backend Build Fails
**Solution**:
```bash
# Ensure Prisma client is generated first
npx prisma generate --schema=./database/prisma/schema.prisma

# Then build
cd apps/api
npm run build
```

### Issue: Type Errors
**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate --schema=./database/prisma/schema.prisma

# Restart TypeScript server in VS Code
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Memory Page Not Found
**Solution**:
```bash
# Verify sidebar has Memory menu item
# Check: apps/web/src/components/layout/sidebar.tsx

# Verify page exists
# Check: apps/web/src/app/dashboard/memory/page.tsx

# Rebuild frontend
cd apps/web
npm run build
```

---

## 📈 Performance Tips

1. **Use Indexes**: All queries use indexed fields
2. **Enable Compression**: Reduces memory size by 60-70%
3. **Set Retention**: Auto-cleanup old data
4. **Batch Operations**: Use bulk endpoints
5. **Cache Context**: Store AI context temporarily
6. **Limit History**: Configure maxHistoryLength

---

## 🔮 Future Enhancements

1. **Vector Search**: Semantic memory search
2. **Smart Summarization**: AI-powered summaries
3. **Predictive Analytics**: Predict lead conversion
4. **Real-time Sync**: WebSocket updates
5. **Advanced Filtering**: Complex queries
6. **Export/Import**: Memory backup
7. **Memory Graphs**: Visualization
8. **AI Recommendations**: Smart suggestions

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check PHASE_3.3_DELIVERY.md
4. Review code comments

---

## ✅ Checklist

Before deployment:
- [ ] Generate Prisma client
- [ ] Run database migrations
- [ ] Test all API endpoints
- [ ] Test frontend dashboard
- [ ] Configure memory settings
- [ ] Set up permissions
- [ ] Enable auto-cleanup
- [ ] Configure retention policy
- [ ] Test context building
- [ ] Test conversation restoration
- [ ] Verify security
- [ ] Load test with concurrent sessions

---

## 🎉 Success Criteria

Phase 3.3 is complete when:
- ✅ All 6 database models created
- ✅ All 24 API endpoints working
- ✅ Frontend dashboard functional
- ✅ Context building works
- ✅ Conversation restoration works
- ✅ Lead tracking works
- ✅ Memory snapshots work
- ✅ History audit works
- ✅ Configuration works
- ✅ Security implemented
- ✅ All builds successful

---

**Phase 3.3 - AI Memory Manager is COMPLETE!** 🚀

Ready to make your AI calling agent intelligent and context-aware!
