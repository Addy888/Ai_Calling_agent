# Enterprise AI Calling Pipeline & Orchestrator Engine

## Overview

The **Calling Pipeline** module is the central orchestration engine of the AI Calling Agent system. It manages the complete lifecycle of AI-powered phone calls, from campaign initialization to call completion.

## Architecture

### Core Components

1. **Calling Pipeline Service** - Central coordination service
2. **Call Orchestrator** - Individual call lifecycle management
3. **Conversation Orchestrator** - AI conversation flow control
4. **Campaign Execution** - Campaign-level execution engine
5. **Call Lifecycle Manager** - State machine for calls
6. **Conversation State Manager** - Conversation state machine
7. **Agent Execution** - AI agent response generation
8. **Queue Execution** - Call queue management
9. **Call Session Manager** - Session data management
10. **Workflow Manager** - Business workflow orchestration
11. **Pipeline Context** - Global context and statistics

## Call Flow

```
Company Login
    ↓
Campaign Selected
    ↓
Load Campaign → Load Contacts → Load AI Agent
    ↓
Load Voice → Load Prompt → Load Memory → Load Knowledge Base
    ↓
Initialize AI Runtime → Initialize Telephony
    ↓
Dial Customer → Customer Answers
    ↓
Conversation Engine
    ↓
Speech-To-Text → Prompt Builder → Memory Context
    ↓
Knowledge Retrieval (RAG) → LLM Inference → Response Validation
    ↓
Text-To-Speech → Play Audio
    ↓
Continue Conversation → Update Memory → Save Transcript
    ↓
Save Recording → Update Analytics → Call Finished
    ↓
Next Contact
```

## State Machines

### Call States

- **IDLE** - Initial state
- **QUEUED** - Call queued for execution
- **INITIALIZING** - Loading campaign data
- **DIALING** - Initiating telephony call
- **RINGING** - Phone ringing
- **CONNECTED** - Customer answered
- **GREETING** - Playing greeting
- **LISTENING** - Listening to customer
- **PROCESSING** - Processing speech input
- **GENERATING_RESPONSE** - AI generating response
- **PLAYING_RESPONSE** - Playing AI response
- **WAITING** - Waiting for customer input
- **CONTINUING** - Continuing conversation
- **ENDING** - Ending call
- **COMPLETED** - Call completed successfully
- **FAILED** - Call failed
- **RETRY** - Marked for retry

### Conversation States

- **INITIALIZING** - Setting up conversation
- **GREETING** - Initial greeting phase
- **ACTIVE** - Active conversation
- **LISTENING** - Waiting for customer input
- **THINKING** - Processing and generating response
- **RESPONDING** - Delivering response
- **WAITING_FOR_INPUT** - Explicit waiting state
- **HANDLING_INTERRUPTION** - Customer interrupted
- **HANDLING_SILENCE** - Customer silence detected
- **CONTEXT_SWITCHING** - Switching conversation topic
- **CLOSING** - Closing conversation
- **ENDED** - Conversation ended

### Campaign States

- **IDLE** - Not started
- **STARTING** - Initializing
- **RUNNING** - Active execution
- **PAUSED** - Temporarily paused
- **STOPPING** - Shutting down
- **STOPPED** - Stopped by user
- **COMPLETED** - All contacts processed
- **FAILED** - Execution failed

## API Endpoints

### Campaign Management

```typescript
POST   /calling/start-campaign    - Start campaign execution
POST   /calling/pause-campaign    - Pause running campaign
POST   /calling/resume-campaign   - Resume paused campaign
POST   /calling/stop-campaign     - Stop campaign
GET    /calling/campaign/:id      - Get campaign status
GET    /calling/campaigns         - List all campaigns
```

### Call Management

```typescript
POST   /calling/start-call        - Start individual call
POST   /calling/end-call          - End active call
GET    /calling/call/:sessionId   - Get call status
GET    /calling/active-calls      - List active calls
GET    /calling/sessions          - List call sessions
```

### Pipeline Status

```typescript
GET    /calling/pipeline          - Get pipeline status
GET    /calling/health            - Health check
```

### Webhooks

```typescript
POST   /calling/webhook/speech    - STT webhook endpoint
```

## Provider Interfaces

### Speech-to-Text (STT)

```typescript
interface ISpeechToTextProvider {
  initialize(config: STTConfig): Promise<void>;
  startListening(sessionId: string): Promise<void>;
  stopListening(sessionId: string): Promise<void>;
  processAudioStream(sessionId: string, audioData: Buffer): Promise<STTResult>;
  onTranscription(sessionId: string, callback: Function): void;
  cleanup(sessionId: string): Promise<void>;
}
```

### Text-to-Speech (TTS)

```typescript
interface ITextToSpeechProvider {
  initialize(config: TTSConfig): Promise<void>;
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
  synthesizeStream(text: string, options?: TTSOptions): Promise<ReadableStream>;
  getVoices(): Promise<Voice[]>;
  cleanup(): Promise<void>;
}
```

### Telephony

```typescript
interface ITelephonyProvider {
  initialize(config: TelephonyConfig): Promise<void>;
  makeCall(params: MakeCallParams): Promise<CallSession>;
  answerCall(callSid: string): Promise<CallSession>;
  endCall(callSid: string): Promise<void>;
  playAudio(callSid: string, audioUrl: string): Promise<void>;
  streamAudio(callSid: string, audioStream: ReadableStream): Promise<void>;
  startRecording(callSid: string): Promise<string>;
  stopRecording(callSid: string, recordingSid: string): Promise<string>;
  getCallStatus(callSid: string): Promise<CallStatus>;
  onCallEvent(event: TelephonyEvent, handler: Function): void;
  cleanup(): Promise<void>;
}
```

## Events

The pipeline emits the following events:

- `CAMPAIGN_STARTED` - Campaign execution started
- `CONTACT_LOADED` - Contact loaded for calling
- `CALL_STARTED` - Call initiated
- `CALL_CONNECTED` - Call connected
- `CUSTOMER_SPEAKING` - Customer speaking detected
- `SPEECH_RECOGNIZED` - Speech transcribed
- `KNOWLEDGE_RETRIEVED` - Knowledge base queried
- `PROMPT_GENERATED` - Prompt generated
- `RESPONSE_GENERATED` - AI response generated
- `AUDIO_GENERATED` - TTS audio generated
- `AUDIO_PLAYED` - Audio played to customer
- `MEMORY_UPDATED` - Memory context updated
- `TRANSCRIPT_UPDATED` - Transcript updated
- `RECORDING_SAVED` - Recording saved
- `CALL_COMPLETED` - Call finished
- `CAMPAIGN_COMPLETED` - Campaign finished
- `ERROR_OCCURRED` - Error occurred

## Workflows

### Sales Flow

1. Greeting
2. Qualification
3. Product Pitch
4. Objection Handling
5. Closing

### Support Flow

1. Greeting
2. Issue Identification
3. Troubleshooting
4. Resolution
5. Confirmation
6. Closing

### Appointment Booking Flow

1. Greeting
2. Check Availability
3. Propose Times
4. Confirm Booking
5. Send Details
6. Closing

### Survey Flow

1. Greeting
2. Get Consent
3. Ask Questions
4. Thank You

## Module Integration

The calling pipeline integrates with:

- **Campaign Management** - Load campaign data
- **Contact Management** - Load contact information
- **AI Agent Management** - Load agent configuration
- **Prompt Engine** - Generate prompts
- **Memory Engine** - Manage conversation memory
- **Knowledge Base** - Retrieve relevant knowledge
- **Analytics** - Track call metrics
- **Calls Module** - Save call records
- **Voice Profiles** - Load voice configuration

## Error Handling

Custom exceptions for different failure scenarios:

- `PipelineException` - Base pipeline error
- `CampaignException` - Campaign-related errors
- `CallException` - Call-related errors
- `ConversationException` - Conversation errors
- `SessionException` - Session management errors
- `RuntimeException` - AI runtime errors
- `QueueException` - Queue management errors
- `ProviderException` - External provider errors

## Configuration

### Environment Variables

```bash
# Campaign Settings
MAX_CONCURRENT_CALLS_PER_CAMPAIGN=10
DEFAULT_CONCURRENT_CALLS=1

# Call Settings
CALL_TIMEOUT_SECONDS=300
SILENCE_TIMEOUT_SECONDS=10
MAX_RETRY_ATTEMPTS=3

# Queue Settings
QUEUE_PROCESS_INTERVAL_MS=1000
MAX_QUEUE_SIZE=1000

# Session Settings
SESSION_CLEANUP_INTERVAL_HOURS=24
```

## Usage Examples

### Start a Campaign

```typescript
const result = await callingPipelineService.startCampaign({
  campaignId: 'campaign-123',
  companyId: 'company-456',
  concurrentCalls: 5,
  autoStart: true,
});
```

### Start Individual Call

```typescript
const callStatus = await callingPipelineService.startCall({
  contactId: 'contact-789',
  campaignId: 'campaign-123',
  agentId: 'agent-001',
  phoneNumber: '+1234567890',
});
```

### Monitor Pipeline

```typescript
const pipelineStatus = await callingPipelineService.getPipelineStatus();

console.log(`Active Campaigns: ${pipelineStatus.activeCampaigns}`);
console.log(`Active Calls: ${pipelineStatus.activeCalls}`);
console.log(`Queued Calls: ${pipelineStatus.queuedCalls}`);
```

## Testing

Run tests:

```bash
npm test calling-pipeline
```

Test coverage:

```bash
npm run test:cov -- calling-pipeline
```

## Future Enhancements

- [ ] Multi-language support
- [ ] Real-time analytics dashboard
- [ ] Advanced call routing
- [ ] Call recording transcription
- [ ] Sentiment analysis integration
- [ ] A/B testing for prompts
- [ ] Voice biometrics
- [ ] Call quality monitoring
- [ ] Advanced retry strategies
- [ ] Call scheduling
- [ ] Callback management
- [ ] IVR integration

## Dependencies

- `@nestjs/common` - NestJS core
- `@nestjs/event-emitter` - Event system
- `class-validator` - DTO validation
- `class-transformer` - DTO transformation

## License

Proprietary - AI Calling Agent Platform

## Support

For issues and questions, contact the platform team.
