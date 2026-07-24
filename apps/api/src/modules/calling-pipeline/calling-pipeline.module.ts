import { Module, forwardRef } from '@nestjs/common';
import { CallingPipelineController } from './calling-pipeline.controller';
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

// Import existing modules
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
  ],
  exports: [
    CallingPipelineService,
    ConversationOrchestratorService,
    CampaignExecutionService,
    QueueExecutionService,
  ],
})
export class CallingPipelineModule {}
