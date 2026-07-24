# Calling Pipeline - Installation & Setup Guide

## Prerequisites

- Node.js 18+ installed
- NestJS CLI installed (`npm i -g @nestjs/cli`)
- Database configured (PostgreSQL/MySQL)
- Prisma client generated

## Installation Steps

### 1. Install Dependencies

```bash
cd apps/api
npm install
```

The calling pipeline requires the following packages (already in package.json):

```json
{
  "@nestjs/common": "^10.3.0",
  "@nestjs/config": "^3.1.1",
  "@nestjs/core": "^10.3.0",
  "@nestjs/event-emitter": "^2.0.3",
  "@nestjs/swagger": "^7.2.0",
  "class-validator": "^0.14.1",
  "class-transformer": "^0.5.1"
}
```

### 2. Verify Module Registration

The calling pipeline module is already registered in `app.module.ts`:

```typescript
import { CallingPipelineModule } from './modules/calling-pipeline/calling-pipeline.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    // ... other modules
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    CallingPipelineModule,
  ],
})
export class AppModule {}
```

### 3. Environment Configuration

Add the following environment variables to your `.env` file:

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

### 4. Build the Application

```bash
npm run build
```

### 5. Start the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run start:prod
```

## Verification

### 1. Check API Endpoints

The calling pipeline exposes these endpoints:

```bash
# Health check
curl http://localhost:3000/calling/health

# Pipeline status
curl http://localhost:3000/calling/pipeline
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-23T..."
}
```

### 2. Check Swagger Documentation

Open: `http://localhost:3000/api`

You should see the "Calling Pipeline" section with all endpoints.

### 3. Test Pipeline Services

```typescript
import { Test } from '@nestjs/testing';
import { CallingPipelineModule } from './calling-pipeline.module';
import { CallingPipelineService } from './services/calling-pipeline.service';

const moduleRef = await Test.createTestingModule({
  imports: [CallingPipelineModule],
}).compile();

const service = moduleRef.get(CallingPipelineService);
const health = await service.healthCheck();

console.log('Pipeline Status:', health.status); // Should output: healthy
```

## Module Structure

The calling pipeline module includes:

### Services (11)
- ✅ CallingPipelineService
- ✅ CallOrchestratorService
- ✅ ConversationOrchestratorService
- ✅ CampaignExecutionService
- ✅ CallLifecycleService
- ✅ ConversationStateService
- ✅ AgentExecutionService
- ✅ QueueExecutionService
- ✅ CallSessionService
- ✅ WorkflowManagerService
- ✅ PipelineContextService

### Controllers (1)
- ✅ CallingPipelineController

### Provider Interfaces (3)
- ✅ ISpeechToTextProvider
- ✅ ITextToSpeechProvider
- ✅ ITelephonyProvider

## Troubleshooting

### Issue: Module import errors

**Solution:** Ensure all dependent modules are properly registered:
```typescript
imports: [
  CampaignsModule,
  ContactsModule,
  AIAgentModule,
  PromptsModule,
  MemoryModule,
  KnowledgeBaseModule,
  // ... etc
]
```

### Issue: EventEmitter not found

**Solution:** Install the package:
```bash
npm install @nestjs/event-emitter
```

And register in app.module:
```typescript
EventEmitterModule.forRoot()
```

### Issue: TypeScript compilation errors

**Solution:** Run type checking:
```bash
npm run build
```

Fix any import path issues or missing dependencies.

### Issue: Circular dependency warnings

**Solution:** The module is designed to avoid circular dependencies. If you see warnings:
1. Check import paths
2. Ensure forwardRef() is used where necessary
3. Review service injection order

## Next Steps

1. **Implement Provider Interfaces**
   - Create STT provider (Deepgram/Google/Azure)
   - Create TTS provider (ElevenLabs/Google/Azure)
   - Create Telephony provider (Twilio/Exotel)

2. **Configure Workflows**
   - Customize existing workflows
   - Create custom workflows for your use case

3. **Set up Event Listeners**
   - Listen to pipeline events
   - Integrate with analytics
   - Set up monitoring

4. **Testing**
   - Run unit tests: `npm test calling-pipeline`
   - Run integration tests
   - Test with real campaigns

5. **Production Deployment**
   - Configure environment variables
   - Set up monitoring and alerts
   - Configure logging
   - Set up error tracking

## Support

For issues or questions:
- Check the [README](./README.md)
- Review [Architecture](./ARCHITECTURE.md)
- See [Quick Start Guide](./QUICKSTART.md)

## Verification Checklist

- [ ] Dependencies installed
- [ ] Module registered in app.module
- [ ] EventEmitter configured
- [ ] Environment variables set
- [ ] Application builds successfully
- [ ] Health endpoint responds
- [ ] Swagger documentation accessible
- [ ] Services can be injected
- [ ] No TypeScript errors
- [ ] Tests pass

---

**Installation Complete! 🎉**

The Enterprise AI Calling Pipeline is ready to orchestrate your AI phone calls.
