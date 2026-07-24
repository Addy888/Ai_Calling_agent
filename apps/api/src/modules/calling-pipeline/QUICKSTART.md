# Calling Pipeline - Quick Start Guide

## Installation

The calling pipeline module is already integrated into the AI Calling Agent platform.

## Basic Usage

### 1. Start a Campaign

```typescript
import { CallingPipelineService } from '@/modules/calling-pipeline';

// Inject the service
constructor(private callingPipeline: CallingPipelineService) {}

// Start a campaign
const campaign = await this.callingPipeline.startCampaign({
  campaignId: 'your-campaign-id',
  companyId: 'your-company-id',
  concurrentCalls: 5,
  autoStart: true,
});

console.log(`Campaign started: ${campaign.executionId}`);
```

### 2. Monitor Campaign Progress

```typescript
const status = await this.callingPipeline.getCampaignStatus(executionId);

console.log(`Progress: ${status.progressPercentage}%`);
console.log(`Processed: ${status.processedContacts}/${status.totalContacts}`);
console.log(`Successful: ${status.successfulCalls}`);
console.log(`Active: ${status.activeCalls}`);
```

### 3. Start Individual Call

```typescript
const call = await this.callingPipeline.startCall({
  contactId: 'contact-id',
  campaignId: 'campaign-id',
  agentId: 'agent-id',
  phoneNumber: '+1234567890',
});

console.log(`Call started: ${call.sessionId}`);
```

### 4. Monitor Active Calls

```typescript
const activeCalls = await this.callingPipeline.getActiveCalls();

console.log(`Total active calls: ${activeCalls.total}`);
activeCalls.calls.forEach(call => {
  console.log(`Session ${call.sessionId}: ${call.state}`);
});
```

### 5. Check Pipeline Health

```typescript
const pipeline = await this.callingPipeline.getPipelineStatus();

console.log(`Status: ${pipeline.status}`);
console.log(`Active Campaigns: ${pipeline.activeCampaigns}`);
console.log(`Active Calls: ${pipeline.activeCalls}`);
console.log(`Queued Calls: ${pipeline.queuedCalls}`);
```

## Advanced Usage

### Pause/Resume Campaign

```typescript
// Pause
await this.callingPipeline.pauseCampaign({
  executionId,
  reason: 'Lunch break',
});

// Resume
await this.callingPipeline.resumeCampaign({
  executionId,
});
```

### Stop Campaign

```typescript
await this.callingPipeline.stopCampaign({
  executionId,
  force: false, // Wait for active calls
  reason: 'End of day',
});
```

### End Call

```typescript
await this.callingPipeline.endCall({
  sessionId,
  reason: 'Customer hung up',
});
```

## Events

Listen to pipeline events:

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { PipelineEvent } from '@/modules/calling-pipeline';

@Injectable()
export class MyService {
  @OnEvent(PipelineEvent.CALL_STARTED)
  handleCallStarted(data: any) {
    console.log('Call started:', data.sessionId);
  }

  @OnEvent(PipelineEvent.CALL_COMPLETED)
  handleCallCompleted(data: any) {
    console.log('Call completed:', data.sessionId);
  }
}
```

## API Endpoints

### REST API Examples

```bash
# Start Campaign
curl -X POST http://localhost:3000/calling/start-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123",
    "companyId": "company-456",
    "concurrentCalls": 5
  }'

# Get Pipeline Status
curl http://localhost:3000/calling/pipeline

# Get Active Calls
curl http://localhost:3000/calling/active-calls
```

## Configuration

Set environment variables:

```bash
# .env
MAX_CONCURRENT_CALLS_PER_CAMPAIGN=10
CALL_TIMEOUT_SECONDS=300
SILENCE_TIMEOUT_SECONDS=10
MAX_RETRY_ATTEMPTS=3
```

## Next Steps

- Read the [Full Documentation](./README.md)
- Review [Architecture](./ARCHITECTURE.md)
- Implement Provider Interfaces (STT, TTS, Telephony)
- Configure Workflows
- Set up Analytics Dashboard
