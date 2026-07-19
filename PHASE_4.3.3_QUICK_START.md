# Phase 4.3.3 - Human Conversation Learning Engine
## Quick Start Guide for Administrators

---

## Overview

This guide helps you quickly set up and use the Human Conversation Learning Engine to teach your AI agent how to communicate naturally like your best sales executives.

---

## Step 1: Start the API Server

```bash
cd apps/api
npm run start:dev
```

The conversation learning module is automatically loaded at: `http://localhost:3000/api/conversation-learning`

---

## Step 2: Upload Your First Recording

### Option A: Using cURL
```bash
curl -X POST http://localhost:3000/api/conversation-learning/recordings/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@path/to/your/recording.mp3" \
  -F "name=Sales Call - Customer Name" \
  -F "language=hi" \
  -F "agentSpeakerId=agent_voice_id" \
  -F "customerSpeakerId=customer_voice_id"
```

### Option B: Using Postman
1. Open Postman
2. Create POST request to: `http://localhost:3000/api/conversation-learning/recordings/upload`
3. Add Authorization header with your JWT token
4. Select Body → form-data
5. Add fields:
   - `file` (File): Select your audio file
   - `name` (Text): "Sales Call - Customer Name"
   - `language` (Text): "hi" (for Hindi) or "en" (for English)
   - `agentSpeakerId` (Text): Your agent ID
   - `customerSpeakerId` (Text): Customer ID
6. Send request

### Supported Audio Formats
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- MPEG (.mpeg)
- OGG (.ogg)
- FLAC (.flac)

### Supported Languages
- `en` - English
- `hi` - Hindi
- `mr` - Marathi
- `MIXED` - Mixed language (automatically detected)

---

## Step 3: Check Processing Status

### Get All Recordings
```bash
curl -X GET http://localhost:3000/api/conversation-learning/recordings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Specific Recording Details
```bash
curl -X GET http://localhost:3000/api/conversation-learning/recordings/RECORDING_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Processing Status Values
- `PENDING` - Uploaded, waiting to process
- `PROCESSING` - Currently analyzing
- `COMPLETED` - Analysis complete, learning extracted
- `FAILED` - Processing failed (check logs)

---

## Step 4: Upload Sales Script

Create a text file with your sales script structure:

```text
GREETING:
Good morning! This is Rahul from Dream Homes. Am I speaking with Mr. Sharma?

INTRODUCTION:
We are currently offering premium 2BHK and 3BHK apartments in Pune with excellent connectivity and world-class amenities.

QUALIFICATION:
May I know what type of property are you looking for?
What is your preferred location?
How many bedrooms are you considering?

BUDGET_COLLECTION:
What is your budget range for this investment?
Are you considering a home loan or self-funding?

PROJECT_RECOMMENDATION:
Based on your requirements, I have the perfect project for you. Our Magna City project offers 2BHK apartments starting from 45 lakhs with possession in 12 months.

OBJECTION_HANDLING:
If customer says "Too expensive":
I understand your concern about the pricing. However, considering the premium location and amenities, this is actually very competitive. Plus, we have flexible payment plans available.

If customer says "Too far":
The location offers excellent connectivity via the upcoming metro and ring road. Many of our satisfied customers initially had the same concern but now appreciate the peaceful environment.

CLOSING:
Would you like to visit the site this weekend? I can arrange a personalized tour for you.
When would be a convenient time for you?

REFERRAL_REQUEST:
If you know anyone who is also looking for a property, I would be happy to help them as well. Your referral would be greatly appreciated.
```

### Upload Script
```bash
curl -X POST http://localhost:3000/api/conversation-learning/scripts/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Real Estate Sales Script",
    "language": "MIXED",
    "scriptType": "SALES",
    "content": "YOUR_SCRIPT_CONTENT_HERE"
  }'
```

The AI will:
1. Parse the script structure
2. Extract natural patterns (NOT memorize robotically)
3. Learn question styles
4. Learn response patterns
5. Learn objection handling strategies
6. Generate conversation rules

---

## Step 5: View Learning Statistics

### Get Summary
```bash
curl -X GET http://localhost:3000/api/conversation-learning/statistics/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response will show:
- Total recordings analyzed
- Patterns learned
- Insights generated
- Maturity score (0-100)
- Recommendations

### Get Detailed Statistics
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/statistics?startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Step 6: Generate Behavior Profile

After uploading 5+ recordings, generate the behavior profile:

```bash
curl -X POST http://localhost:3000/api/conversation-learning/behavior-profile/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This creates a comprehensive profile of how your AI should behave based on real conversations.

---

## Step 7: Test Question Answering

The AI can now answer questions using learned knowledge:

```bash
curl -X POST http://localhost:3000/api/conversation-learning/question \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the price range?",
    "language": "en",
    "sessionId": "test_session_123"
  }'
```

The AI will:
1. Understand question intent
2. Search knowledge base (highest priority)
3. Check uploaded scripts
4. Use conversation memory
5. Apply response strategies
6. Return best answer with confidence score

---

## What the AI Learns

### From Recordings:
✅ **Greeting Style** - How long, what tone, what language
✅ **Speaking Speed** - Words per minute, natural pace
✅ **Pause Timing** - Short/medium/long pauses, when to use each
✅ **Thinking Pauses** - When to pause before answering
✅ **Natural Silence** - Comfortable silence duration
✅ **Turn Taking** - When agent speaks, when customer speaks
✅ **Interruptions** - How to handle, how to avoid
✅ **Question Timing** - When to ask questions
✅ **Answer Timing** - How long to wait before answering
✅ **Conversation Flow** - Natural phase transitions
✅ **Call Ending** - How to close professionally
✅ **Language Switching** - When and how to switch languages
✅ **Acknowledgements** - "Ji Sir", "I see", "Understood", etc.

### From Scripts:
✅ **Conversation Structure** - Greeting → Qualification → Budget → Pitch → Close
✅ **Question Patterns** - How to ask naturally
✅ **Response Patterns** - How to answer effectively
✅ **Objection Handling** - 6 proven strategies
✅ **Transition Phrases** - Moving smoothly between topics
✅ **Natural Flow** - Flexible order, not rigid

---

## Best Practices

### Recording Quality
- ✅ Use clear audio (no background noise)
- ✅ Upload 10+ recordings for good learning
- ✅ Include variety (different customers, different scenarios)
- ✅ Upload both successful and unsuccessful calls
- ✅ Label agent and customer speakers correctly

### Script Quality
- ✅ Write naturally (how you actually speak)
- ✅ Include multiple variations
- ✅ Add objection handling examples
- ✅ Use section headers (GREETING, QUALIFICATION, etc.)
- ✅ Mix languages naturally if applicable

### Learning Progress
- 📊 **0-10 recordings**: Early stage (basic patterns)
- 📊 **10-20 recordings**: Developing (good patterns)
- 📊 **20-50 recordings**: Mature (excellent patterns)
- 📊 **50+ recordings**: Expert (optimal behavior)

---

## Monitoring Learning

### Maturity Score Interpretation

**Score 0-30**: Early Stage
- Upload more recordings
- Add sales scripts
- Review basic patterns

**Score 30-60**: Developing
- Continue adding recordings
- Fine-tune patterns
- Apply insights

**Score 60-80**: Good Progress
- Optimize conversation rules
- Apply response strategies
- Test question answering

**Score 80-100**: Excellent Maturity
- Focus on edge cases
- Optimize timing
- Perfect natural flow

---

## View Learned Patterns

### Pause Patterns
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/patterns/pauses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Acknowledgements
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/patterns/acknowledgements" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Turn-Taking
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/patterns/turn-taking" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Interruptions
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/patterns/interruptions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## View Insights

### Get All Insights
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/insights" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Specific Insight
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/insights/INSIGHT_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Apply Insight
```bash
curl -X POST "http://localhost:3000/api/conversation-learning/insights/INSIGHT_ID/apply" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationDetails": "Applied to production behavior profile"
  }'
```

---

## View and Manage Rules

### Get Conversation Rules
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/rules" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Custom Rule
```bash
curl -X POST "http://localhost:3000/api/conversation-learning/rules" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleType": "GREETING_RULE",
    "condition": {
      "phase": "GREETING",
      "timeOfDay": "MORNING"
    },
    "action": {
      "greeting": "Good morning!",
      "pauseAfter": 0.5
    },
    "priority": 90
  }'
```

---

## View Response Strategies

### Get All Strategies
```bash
curl -X GET "http://localhost:3000/api/conversation-learning/strategies" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Custom Strategy
```bash
curl -X POST "http://localhost:3000/api/conversation-learning/strategies" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": "price objection",
    "strategy": "ACKNOWLEDGE_AND_REFRAME",
    "strategyData": {
      "acknowledgement": "I understand your concern about pricing.",
      "reframe": "Let me explain the value you are getting.",
      "proof": "Our customers typically save 20% in the long run."
    }
  }'
```

---

## Troubleshooting

### Recording Upload Fails
- ✅ Check file format (must be audio file)
- ✅ Check file size (max 100MB)
- ✅ Check authentication token
- ✅ Verify API is running

### Processing Stuck
- ✅ Check API logs: `cd apps/api && npm run start:dev`
- ✅ Verify recording status endpoint
- ✅ Check for error messages in response

### Low Maturity Score
- ✅ Upload more recordings (need 10+ minimum)
- ✅ Add sales scripts
- ✅ Ensure recordings have clear audio
- ✅ Label speakers correctly

### Question Answering Returns Low Confidence
- ✅ Add more knowledge base entries
- ✅ Upload comprehensive scripts
- ✅ Add conversation memory
- ✅ Create response strategies

---

## Example Workflow

### Day 1: Initial Setup
1. Upload 5 best sales call recordings
2. Upload main sales script
3. Check processing status
4. Review maturity score

### Day 2-3: Add More Data
1. Upload 10 more recordings (variety)
2. Upload objection handling scripts
3. Review learned patterns
4. Check insights generated

### Week 1: Generate Profile
1. Generate behavior profile
2. Review conversation rules
3. Test question answering
4. Apply high-confidence insights

### Week 2: Optimize
1. Add edge case recordings
2. Fine-tune response strategies
3. Create custom rules
4. Monitor statistics

### Ongoing: Continuous Learning
1. Upload new successful calls weekly
2. Update scripts based on learnings
3. Apply new insights
4. Monitor maturity score improvement

---

## Integration with AI Agent

The learned behavior is automatically used by:

1. **Conversation Manager** - Real-time decisions
2. **Decision Engine** - Response selection
3. **AI Agent Runtime** - Natural execution
4. **Voice Studio** - Voice behavior matching

No manual integration needed - the AI agent automatically uses learned patterns!

---

## Health Check

Verify the module is working:

```bash
curl -X GET "http://localhost:3000/api/conversation-learning/health" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "module": "conversation-learning",
  "companyId": "your_company_id"
}
```

---

## Storage Location

Uploaded recordings are stored in:
```
./storage/learning-recordings/
```

Make sure this directory has write permissions.

---

## Performance Tips

- ✅ Upload recordings during off-peak hours
- ✅ Start with 3-5 minute recordings (easier to process)
- ✅ Use compressed formats (MP3 preferred over WAV)
- ✅ Label recordings clearly for easy tracking
- ✅ Generate behavior profile weekly (not every recording)

---

## Support

If you encounter issues:

1. Check API logs: `apps/api` folder
2. Review recording status endpoint
3. Verify authentication
4. Check file formats
5. Review this guide

---

## Summary

You now have a fully functional Human Conversation Learning Engine that:

✅ Learns from real conversations
✅ Understands natural human communication
✅ Generates intelligent responses
✅ Handles multiple languages
✅ Creates behavior profiles
✅ Provides actionable insights
✅ Continuously improves

The AI will NOT sound robotic - it learns to communicate naturally like your best sales executives!

---

**Status:** PRODUCTION READY ✅  
**Last Updated:** January 2025
