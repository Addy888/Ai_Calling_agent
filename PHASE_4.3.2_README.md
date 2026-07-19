# Phase 4.3.2 - Enterprise Conversation Intelligence Engine

## Overview
The Enterprise Conversation Intelligence Engine analyzes processed conversations to understand customer behavior, sales patterns, objections, and successful responses. This engine prepares conversations for future AI learning without implementing actual AI model training.

## Architecture

### Backend (NestJS)
Located in: `apps/api/src/modules/ai-agent/`

#### Services
- **ConversationIntelligenceService**: Core analysis engine
  - Analyzes conversations and generates comprehensive scores
  - Detects intents, entities, objections, and emotions
  - Calculates lead scores and sentiment analysis
  - Builds knowledge base from conversations

- **ConversationAnalyticsService**: Analytics and insights
  - Dashboard statistics
  - Intent/Objection/Lead distribution
  - Conversation trends over time
  - Quality and emotion distribution

- **KnowledgeBuilderService**: Knowledge management
  - Manages knowledge items from conversations
  - Question library management
  - Search and statistics

#### Controllers
- **ConversationIntelligenceController**: REST API endpoints
  - POST `/api/v1/conversation-intelligence/analyze` - Analyze conversation
  - GET `/api/v1/conversation-intelligence/analysis` - List analyses
  - GET `/api/v1/conversation-intelligence/analysis/:id` - Get analysis details
  - GET `/api/v1/conversation-intelligence/dashboard` - Dashboard stats
  - GET `/api/v1/conversation-intelligence/analytics/*` - Various analytics endpoints
  - GET `/api/v1/conversation-intelligence/knowledge` - Knowledge base
  - GET `/api/v1/conversation-intelligence/questions` - Question library

#### Gateways
- **ConversationIntelligenceGateway**: Real-time updates via Socket.IO
  - Namespace: `/conversation-intelligence`
  - Events: analysis progress, insights, knowledge updates

### Frontend (Next.js)
Located in: `apps/web/src/app/dashboard/conversation-intelligence/`

#### Pages
1. **Main Dashboard** (`page.tsx`)
   - Dashboard statistics cards
   - Quick insights
   - Conversation list with filters
   - Tabbed navigation

2. **Conversation Details** (`[id]/page.tsx`)
   - Detailed score breakdown
   - Lead scoring information
   - Timeline, intents, entities
   - Objections and emotions analysis
   - Response effectiveness

3. **Analytics Dashboard** (`analytics/page.tsx`)
   - Intent distribution charts
   - Objection analysis with resolution rates
   - Lead distribution pie charts
   - Conversation trends over time
   - Quality and emotion distribution

4. **Knowledge Builder** (`knowledge/page.tsx`)
   - AI-generated knowledge items
   - Category filtering
   - Usage statistics

5. **Question Library** (`questions/page.tsx`)
   - Frequently asked questions
   - Question type and speaker filtering
   - Frequency tracking

6. **Objections Analysis** (`objections/page.tsx`)
   - Detailed objection breakdown
   - Resolution rates and scores
   - Strategy effectiveness

## Database Schema

### Core Tables
All tables are already defined in `database/prisma/schema.prisma`:

- **ConversationAnalysis**: Main analysis record
- **ConversationTimeline**: Conversation flow phases
- **ConversationIntent**: Detected intents
- **ConversationEntity**: Extracted entities
- **ConversationObjection**: Customer objections
- **ConversationEmotion**: Emotional states
- **ConversationLeadScore**: Lead qualification
- **ConversationResponseScore**: Agent response effectiveness
- **KnowledgeItem**: Knowledge base entries
- **QuestionLibrary**: Question tracking

## Features Implemented

### Conversation Analyzer
✅ Conversation Score (0-100)
✅ Professional Score
✅ Naturalness Score
✅ Confidence Score
✅ Sales Score
✅ Closing Score

### Conversation Flow Engine
✅ Automatic phase detection:
  - Greeting, Introduction, Requirement Gathering
  - Discovery, Pitch, Objection, Negotiation
  - Closing, Follow-up, Farewell
✅ Timeline visualization

### Intent Engine
✅ Detects 13 intent types:
  - Interested, Not Interested, Pricing, Loan
  - Callback, Site Visit, Booking, Complaint
  - Support, General Question, Information Request
  - Language Change, Unknown

### Entity Engine
✅ Extracts key information:
  - Customer Name, Budget, Location, Project Name
  - Loan Requirement, Property Type
  - Visit Date, Follow-up Date
  - Phone Number, Email

### Objection Engine
✅ Detects 10 objection types:
  - Price Objection, Trust Issue, Family Discussion
  - Need Time, Already Purchased, Need Loan
  - Bad Timing, Location Concern
  - Competitor Mention, No Interest
✅ Tracks resolution and effectiveness

### Emotion Engine
✅ Detects 9 emotional states:
  - Happy, Neutral, Confused, Excited
  - Interested, Frustrated, Angry, Busy, Silent

### Sentiment Analysis
✅ Positive/Neutral/Negative classification
✅ Confidence scoring

### Lead Scoring Engine
✅ Automatic classification:
  - Hot Lead, Warm Lead, Cold Lead
  - Qualified, Rejected, Need Follow-up
✅ Scoring based on multiple factors
✅ Recommended actions

### Best Response Engine
✅ Identifies top-performing responses by type:
  - Best Greeting, Best Introduction
  - Best Objection Handling, Best Closing
  - Best Follow-up

### Knowledge Builder
✅ Automatic knowledge extraction from conversations
✅ Question-Answer pairing
✅ Context preservation
✅ Category classification
✅ Confidence scoring
✅ Usage tracking

### Question Library
✅ Automatic question detection
✅ Frequency tracking
✅ Category classification
✅ Speaker identification (Customer/Agent)

### Analytics
✅ Dashboard with key metrics
✅ Intent distribution charts
✅ Objection analysis with resolution rates
✅ Lead distribution
✅ Conversation trends over time
✅ Quality score distribution
✅ Emotion distribution

### Real-time Updates
✅ Socket.IO integration
✅ Live analysis progress
✅ Real-time statistics updates

## API Endpoints

### Analysis
- `POST /api/v1/conversation-intelligence/analyze`
- `GET /api/v1/conversation-intelligence/analysis`
- `GET /api/v1/conversation-intelligence/analysis/:id`
- `GET /api/v1/conversation-intelligence/analysis/dataset/:datasetId`
- `DELETE /api/v1/conversation-intelligence/analysis/:id`

### Dashboard & Analytics
- `GET /api/v1/conversation-intelligence/dashboard`
- `GET /api/v1/conversation-intelligence/analytics/intent-distribution`
- `GET /api/v1/conversation-intelligence/analytics/objection-distribution`
- `GET /api/v1/conversation-intelligence/analytics/lead-distribution`
- `GET /api/v1/conversation-intelligence/analytics/trends`
- `GET /api/v1/conversation-intelligence/analytics/success-rate`
- `GET /api/v1/conversation-intelligence/analytics/quality-distribution`
- `GET /api/v1/conversation-intelligence/analytics/emotion-distribution`

### Best Responses
- `GET /api/v1/conversation-intelligence/responses/best-greeting`
- `GET /api/v1/conversation-intelligence/responses/best-objection-handling`
- `GET /api/v1/conversation-intelligence/responses/best-closing`
- `GET /api/v1/conversation-intelligence/responses/best-introduction`
- `GET /api/v1/conversation-intelligence/responses/best-follow-up`

### Knowledge Base
- `POST /api/v1/conversation-intelligence/knowledge`
- `GET /api/v1/conversation-intelligence/knowledge`
- `GET /api/v1/conversation-intelligence/knowledge/search`
- `GET /api/v1/conversation-intelligence/knowledge/stats`
- `GET /api/v1/conversation-intelligence/knowledge/:id`
- `PUT /api/v1/conversation-intelligence/knowledge/:id`
- `DELETE /api/v1/conversation-intelligence/knowledge/:id`

### Question Library
- `GET /api/v1/conversation-intelligence/questions`
- `GET /api/v1/conversation-intelligence/questions/frequent`
- `GET /api/v1/conversation-intelligence/questions/stats`
- `GET /api/v1/conversation-intelligence/questions/by-type/:type`

## Usage

### 1. Analyze a Conversation
First, ensure you have processed conversations from Phase 4.3.1 (Dataset Manager).

```bash
# Via API
POST /api/v1/conversation-intelligence/analyze
{
  "datasetRecordId": "uuid-of-dataset-record"
}
```

### 2. View Analysis
Navigate to: `Dashboard > AI Agents > Conversation Intelligence`

### 3. View Analytics
Navigate to: `Dashboard > Conversation Intelligence > Analytics`

### 4. Explore Knowledge Base
Navigate to: `Dashboard > Conversation Intelligence > Knowledge Builder`

### 5. Review Questions
Navigate to: `Dashboard > Conversation Intelligence > Question Library`

## Integration with Other Phases

### Phase 4.3.1 (Dataset Manager)
- Reads processed conversations from DatasetRecord
- Uses conversation.structuredData for analysis
- Depends on transcript and entities tables

### Future AI Learning
- Knowledge base will feed into AI Agent Runtime
- Best responses will inform script generation
- Objection handling strategies for training
- Lead scoring patterns for qualification logic

## Configuration

No additional configuration required. The engine uses existing database connections and JWT authentication.

## Script Compatibility

The engine is designed to be generic and script-agnostic:
- ✅ No hardcoded business scripts
- ✅ Supports multiple scripts/campaigns/industries
- ✅ Ready for administrator-uploaded scripts
- ✅ Version control compatible
- ✅ Script comparison ready
- ✅ Effectiveness tracking prepared

## Security

- ✅ JWT Authentication on all endpoints
- ✅ Company-level data isolation
- ✅ RBAC ready (uses existing JwtAuthGuard)
- ✅ Input validation with class-validator
- ✅ SQL injection protection via Prisma ORM

## Performance Considerations

- Indexes on all foreign keys
- Pagination on all list endpoints
- Optimized queries with Prisma
- Batch operations for timeline/intents/entities
- Caching ready (can be added later)

## Testing

### Backend Compilation
```bash
cd apps/api
npm run build
```

### Frontend Compilation
```bash
cd apps/web
npm run build
```

### Development Mode
```bash
# Root directory
npm run dev
```

## Future Enhancements (Not in Phase 4.3.2)

- AI Model Training (separate phase)
- Voice Cloning (separate phase)
- Speech Generation (separate phase)
- Telephony Integration (separate phase)
- Advanced ML models for better intent detection
- Semantic search for knowledge base
- Export functionality for analytics
- Automated recommendations engine

## Notes

- All database tables already exist from previous phases
- All services are production-ready
- No placeholder code or TODOs
- Fully typed with TypeScript
- Follows SOLID principles
- Uses Repository pattern via Prisma
- shadcn/ui components for consistent design
- Recharts for analytics visualization

## Support

For issues or questions:
1. Check database migrations are up to date
2. Verify JWT token configuration
3. Ensure Phase 4.3.1 (Dataset Manager) is working
4. Check console for errors
5. Verify Socket.IO connection for real-time features
