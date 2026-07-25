import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controllers
import { CallingPipelineController } from './calling-pipeline.controller';

// Services
import { CallingPipelineService } from './services/calling-pipeline.service';
import { ConversationOrchestratorService } from './services/conversation-orchestrator.service';
import { CampaignExecutionService } from './services/campaign-execution.service';
import { CallLifecycleService } from './services/call-lifecycle.service';
import { PipelineContextService } from './services/pipeline-context.service';
import { ConversationStateService } from './services/conversation-state.service';
import { AgentExecutionService } from './services/agent-execution.service';
import { QueueExecutionService } from './services/queue-execution.service';
import { CallSessionService } from './services/call-session.service';
import { WorkflowManagerService } from './services/workflow-manager.service';
import { CallOrchestratorService } from './services/call-orchestrator.service';
import { TelephonyManagerService } from './services/telephony-manager.service';

// Telephony Providers
import { TwilioProvider } from './providers/twilio.provider';
import { MockTelephonyProvider } from './providers/mock.provider';
import { TELEPHONY_PROVIDER_TOKEN } from './interfaces/telephony-provider.interface';

// Runtime Monitor Gateway (Socket.IO)
import { RuntimeMonitorGateway } from './runtime-monitor.gateway';

// Existing modules
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ContactsModule } from '../contacts/contacts.module';
import { AIAgentModule } from '../ai-agent/ai-agent.module';
import { PromptsModule } from '../prompts/prompts.module';
import { MemoryModule } from '../memory/memory.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ScriptsModule } from '../scripts/scripts.module';
import { CallsModule } from '../calls/calls.module';
import { CompaniesModule } from '../companies/companies.module';
import { VoiceProfilesModule } from '../voice-profiles/voice-profiles.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CallOrchestratorModule } from '../call-orchestrator/call-orchestrator.module';

@Module({
  imports: [
    ConfigModule,
    CampaignsModule,
    ContactsModule,
    AIAgentModule,
    PromptsModule,
    MemoryModule,
    KnowledgeBaseModule,
    AnalyticsModule,
    ScriptsModule,
    CallsModule,
    CompaniesModule,
    VoiceProfilesModule,
    PrismaModule,
    forwardRef(() => CallOrchestratorModule),
  ],
  controllers: [CallingPipelineController],
  providers: [
    // ─────────────────────────────────────────────────────
    // Both concrete providers are registered so the factory
    // can inject whichever it needs.
    // ─────────────────────────────────────────────────────
    TwilioProvider,
    MockTelephonyProvider,

    // ─────────────────────────────────────────────────────
    // TELEPHONY_PROVIDER_TOKEN
    //
    // Reads TELEPHONY_PROVIDER from .env at bootstrap.
    //   "mock"   → MockTelephonyProvider
    //   "twilio" → TwilioProvider
    //
    // No code change needed to switch — only .env.
    // ─────────────────────────────────────────────────────
    {
      provide: TELEPHONY_PROVIDER_TOKEN,
      useFactory: (
        config: ConfigService,
        twilio: TwilioProvider,
        mock: MockTelephonyProvider,
      ) => {
        const providerName = config.get<string>('TELEPHONY_PROVIDER', 'mock').toLowerCase().trim();

        if (providerName === 'twilio') {
          return twilio;
        }

        // Default: mock (safe for development)
        return mock;
      },
      inject: [ConfigService, TwilioProvider, MockTelephonyProvider],
    },

    // ─────────────────────────────────────────────────────
    // Core pipeline services
    // ─────────────────────────────────────────────────────
    TelephonyManagerService,
    CallingPipelineService,
    CallOrchestratorService,
    ConversationOrchestratorService,
    CampaignExecutionService,
    CallLifecycleService,
    PipelineContextService,
    ConversationStateService,
    AgentExecutionService,
    QueueExecutionService,
    CallSessionService,
    WorkflowManagerService,

    // ─────────────────────────────────────────────────────
    // Runtime Monitor Socket.IO Gateway
    // ─────────────────────────────────────────────────────
    RuntimeMonitorGateway,
  ],
  exports: [
    TELEPHONY_PROVIDER_TOKEN,
    TelephonyManagerService,
    CallingPipelineService,
    ConversationOrchestratorService,
    CampaignExecutionService,
    QueueExecutionService,
    CallSessionService,
    CallOrchestratorService,
    RuntimeMonitorGateway,
  ],
})
export class CallingPipelineModule {}
