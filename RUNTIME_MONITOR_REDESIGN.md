# Runtime Monitor Redesign - Implementation Guide

## Overview
Transform the existing Runtime Monitor into a comprehensive Real-time AI Calling Dashboard that serves as the central control center for monitoring live AI phone calls.

## Key Changes Implemented

### 1. Enhanced Type Definitions
```typescript
// Updated CallState to include all states from enums
type CallState = 'IDLE' | 'QUEUED' | 'INITIALIZING' | 'DIALING' | 'RINGING' | 
  'CONNECTED' | 'GREETING' | 'LISTENING' | 'PROCESSING' | 
  'GENERATING_RESPONSE' | 'PLAYING_RESPONSE' | 'WAITING' | 
  'CONTINUING' | 'ENDING' | 'COMPLETED' | 'FAILED' | 'RETRY';

// Added CampaignState type
type CampaignState = 'IDLE' | 'STARTING' | 'RUNNING' | 'PAUSED' | 
  'STOPPING' | 'STOPPED' | 'COMPLETED' | 'FAILED';

// Enhanced CallOutcome types
type CallOutcome = 'completed' | 'busy' | 'no-answer' | 'failed' | 
  'voicemail' | 'interested' | 'not_interested' | 'callback' | 'wrong_number';
```

### 2. New Data Structures

#### AIProcessingInfo
```typescript
interface AIProcessingInfo {
  currentIntent?: string;
  currentEmotion?: string;
  promptUsed?: string;
  knowledgeDocsUsed?: string[];
  memoryRetrieved?: any;
  llmResponseTime?: number;
  tokensUsed?: number;
  latency?: number;
  confidenceScore?: number;
}
```

#### CampaignInfo
```typescript
interface CampaignInfo {
  campaignId: string;
  campaignName: string;
  status: CampaignState;
  totalContacts: number;
  queuedCalls: number;
  activeCalls: number;
  completedCalls: number;
  failedCalls: number;
  successRate: number;
  avgCallDuration: number;
}
```

#### Enhanced LiveCallData
```typescript
interface LiveCallData {
  sessionId: string;
  callSid: string;
  state: CallState;
  phoneNumber?: string;
  contactName?: string;
  campaignId?: string;
  campaignName?: string;          // NEW
  agentId?: string;
  agentName?: string;             // NEW
  scriptId?: string;
  scriptName?: string;            // NEW
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;     // NEW
  memoryContext?: any;            // NEW
  startTime: Date;
  duration: number;
  transcript: TranscriptEntry[];
  latencyMs?: number;
  recording?: RecordingInfo;
  summary?: CallSummary;
  aiProcessing?: AIProcessingInfo; // NEW
  direction: 'inbound' | 'outbound'; // NEW
  provider: string;                // NEW
  currentStage?: string;           // NEW
}
```

### 3. UI Component Structure

#### Header
- Title: "AI Calling Control Center"
- Subtitle: "Real-time campaign monitoring and call analytics"
- Live connection status badge
- WebSocket indicator

####  Campaign Overview Card (NEW)
- Campaign name and status badge
- Success rate display
- Four metrics: Total Contacts, Queued, Active, Completed
- Campaign progress bar

#### Statistics Dashboard
- Active Calls (purple)
- Completed Calls (green)
- Failed Calls (red)
- Average Duration (cyan)

#### Live Calls Table (REDESIGNED)
Columns:
1. Status Icon - Visual indicator with pulse animation
2. Contact Name
3. Phone Number
4. Campaign (hidden on mobile)
5. AI Agent (hidden on small screens)
6. Script (hidden on medium screens)
7. Duration (always visible)
8. Stage Badge
9. Direction (In/Out icon, hidden on small screens)
10. Provider (hidden on medium screens)

Features:
- Click any row to open detailed drawer
- Responsive column hiding based on screen size
- Row highlighting on selection
- Hover effects

#### Call Details Drawer (NEW)
A comprehensive side panel that opens when clicking a call row.

**Sections:**

1. **Call Details**
   - Customer Name, Phone Number
   - Campaign, AI Agent, Script, Knowledge Base
   - Call SID, Status, Started At, Duration

2. **Live Conversation**
   - Chat-style interface
   - AI messages (purple bubbles, left-aligned)
   - Customer messages (teal bubbles, right-aligned)
   - Timestamps and latency indicators
   - Auto-scroll to latest message

3. **AI Processing Panel** (when available)
   - Current Intent
   - Current Emotion
   - LLM Response Time
   - Tokens Used
   - Confidence Score
   - Knowledge Documents Used (badges)

4. **Call Flow Visualization**
   - Visual timeline of call stages
   - Active stage highlighted with pulse
   - Past stages in green
   - Future stages in gray

5. **Call Recording** (when available)
   - Recording status badge
   - Duration display
   - Download button

6. **Call Summary** (when call ends)
   - Outcome badge
   - Sentiment display
   - AI-generated summary
   - Key points list
   - Recommended next action

### 4. WebSocket Events

#### New Event Handlers

**monitor:campaign_status**
```typescript
socket.on('monitor:campaign_status', (event: {
  campaignId: string;
  campaignName?: string;
  state: CampaignState;
  totalContacts: number;
  processedContacts: number;
  activeCalls: number;
  successfulCalls: number;
  failedCalls: number;
  timestamp: Date;
}) => {
  // Update campaign overview
});
```

**monitor:ai_processing**
```typescript
socket.on('monitor:ai_processing', (event: {
  sessionId: string;
  currentIntent?: string;
  currentEmotion?: string;
  // ... other AI processing data
}) => {
  // Update AI processing info for the call
});
```

#### Enhanced Existing Events

**monitor:call_state** - Now includes:
- campaignName
- agentName
- scriptName
- knowledgeBaseName
- direction
- provider

**monitor:transcript** - Now includes:
- confidence score

### 5. State Configuration

#### STATE_CONFIG (Enhanced)
All 17 call states mapped to:
- label (display text)
- color (text color class)
- bgColor (background color class)
- icon (Lucide icon component)
- pulse (boolean for animation)

#### CAMPAIGN_STATE_CONFIG (New)
All 8 campaign states mapped to display properties.

#### SENTIMENT_CONFIG (Enhanced)
Updated icons for better visual representation:
- positive: Smile icon
- neutral: Meh icon
- negative: Frown icon

### 6. Responsive Design

**Breakpoints:**
- Mobile: < 768px - Shows essential columns only
- Tablet: 768px-1024px - Shows most columns
- Desktop: > 1024px - Shows all columns

**Hidden columns by screen size:**
- Campaign: hidden < md
- AI Agent: hidden < lg
- Script: hidden < xl
- Direction: hidden < lg
- Provider: hidden < xl

### 7. Color Coding System

**Call States:**
- Green: Connected, successful states
- Blue: Initializing, Dialing
- Purple: AI speaking/processing
- Teal/Cyan: Customer speaking, conversation running
- Yellow/Orange: Waiting, Ringing, Ending
- Red: Failed states
- Gray: Idle, Queued

**Campaign States:**
- Green: Running, Completed
- Blue: Starting
- Yellow: Paused
- Orange: Stopping
- Red: Stopped, Failed
- Gray: Idle

### 8. Empty States

**No Active Calls:**
- Large phone icon
- "No Active Calls" heading
- "Calls will appear here when campaigns are running" description

**No Campaign Running:**
- Shows when campaignInfo is null
- Professional illustration recommended

### 9. Real-time Features

1. **Auto-updating Duration:** 1-second interval timer
2. **Live Transcript:** Auto-scrolls to bottom on new message
3. **Pulse Animations:** On active call states
4. **WebSocket Connection:** Status indicator with auto-reconnect
5. **Drawer Auto-open:** Opens automatically when first call arrives

### 10. Missing UI Components

You need to ensure these Shadcn components are installed:
```bash
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add button
```

## Backend Changes Required

To fully support this redesigned UI, the backend needs to emit additional data:

### 1. Runtime Monitor Gateway

Add to `monitor:call_state` event:
```typescript
{
  campaignName?: string;
  agentName?: string;
  scriptName?: string;
  knowledgeBaseName?: string;
  direction?: 'inbound' | 'outbound';
  provider?: string;
}
```

### 2. New Event: monitor:ai_processing

Add this event to emit AI processing information:
```typescript
@OnEvent('monitor.ai_processing')
onAIProcessing(event: {
  sessionId: string;
  currentIntent?: string;
  currentEmotion?: string;
  promptUsed?: string;
  knowledgeDocsUsed?: string[];
  memoryRetrieved?: any;
  llmResponseTime?: number;
  tokensUsed?: number;
  latency?: number;
  confidenceScore?: number;
}): void {
  this.server.emit('monitor:ai_processing', event);
  this.server.to(`session:${event.sessionId}`).emit('monitor:ai_processing', event);
}
```

### 3. Calling Pipeline Services

Update services to emit the new `monitor.ai_processing` event:
- In `agent-execution.service.ts`
- In `conversation-state.service.ts`
- After LLM calls, knowledge retrieval, etc.

### 4. Recording Status

Update RecordingInfo type to include status:
```typescript
interface RecordingInfo {
  recordingSid: string;
  url: string;
  durationSeconds: number;
  fileSizeBytes?: number;
  format: string;
  channels: number;
  createdAt: Date;
  status: 'recording' | 'processing' | 'completed'; // NEW
}
```

## Testing Checklist

- [ ] Test with 0 active calls (empty state)
- [ ] Test with 1 active call
- [ ] Test with multiple active calls
- [ ] Test call selection and drawer opening
- [ ] Test live transcript updates
- [ ] Test call state transitions
- [ ] Test campaign overview updates
- [ ] Test responsive design on mobile
- [ ] Test responsive design on tablet
- [ ] Test WebSocket reconnection
- [ ] Test drawer closing and reopening
- [ ] Test recording download
- [ ] Test call flow visualization
- [ ] Test AI processing panel

## Performance Considerations

1. **Transcript Limit:** Consider limiting transcript to last 100 messages
2. **Completed Calls:** Limited to 100 in state
3. **Call Cleanup:** Calls removed 8 seconds after completion
4. **Table Virtualization:** Consider for 100+ active calls
5. **Drawer Lazy Loading:** Consider lazy loading drawer content

## Future Enhancements

1. **Filters:** Filter calls by campaign, agent, status
2. **Search:** Search by contact name or phone number
3. **Export:** Export call data and transcripts
4. **Bulk Actions:** Pause/resume multiple calls
5. **Call Analytics:** Real-time charts and graphs
6. **Notifications:** Toast notifications for important events
7. **Audio Playback:** Play recorded calls inline
8. **Live Audio:** Listen to calls in real-time
9. **Intervention:** Allow manual intervention in calls
10. **Historical View:** Switch between live and historical views

## Implementation Status

✅ Type definitions updated
✅ Component structure redesigned
✅ Live Calls Table implemented
✅ Call Details Drawer implemented
✅ Campaign Overview Card implemented
✅ WebSocket event handlers updated
✅ State configurations enhanced
✅ Responsive design implemented
✅ Color coding system defined
✅ Empty states designed

⏳ Backend event enhancements needed
⏳ UI component imports to verify
⏳ End-to-end testing required

## Notes

- The existing Runtime Monitor file has been backed up to `page.tsx.backup`
- All changes maintain backward compatibility with existing WebSocket events
- The UI gracefully handles missing optional data fields
- The drawer can be closed and reopened without losing state
- Consider adding keyboard shortcuts (ESC to close drawer)
- Consider adding sound notifications for important call events
