import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AIAgentController } from './ai-agent.controller';
import { AIAgentService } from './ai-agent.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { AIAgentGateway } from './ai-agent.gateway';
import { SessionManagerService } from './services/session-manager.service';
import { RuntimeEngineService } from './services/runtime-engine.service';
import { ConversationRuntimeService } from './services/conversation-runtime.service';
import { StateManagerService } from './services/state-manager.service';
import { HealthMonitorService } from './services/health-monitor.service';
import { AgentPoolService } from './services/agent-pool.service';
import { MetricsService } from './services/metrics.service';
import { RuntimeLoggingService } from './services/logging.service';
import { VoiceStudioController } from './voice-studio.controller';
import { VoiceStudioService } from './services/voice-studio.service';
import { VoiceStudioGateway } from './voice-studio.gateway';
import { KokoroTTSProvider } from './services/kokoro-tts.provider';
import { VoiceBrainIntegrationService } from './services/voice-brain-integration.service';
import { DatasetController } from './dataset.controller';
import { DatasetService } from './services/dataset.service';
import { DatasetValidationService } from './services/dataset-validation.service';
import { DatasetTranscriptionService } from './services/dataset-transcription.service';
import { DatasetProcessingService } from './services/dataset-processing.service';
import { DatasetGateway } from './dataset.gateway';
import { ConversationIntelligenceController } from './conversation-intelligence.controller';
import { ConversationIntelligenceService } from './services/conversation-intelligence.service';
import { ConversationAnalyticsService } from './services/conversation-analytics.service';
import { KnowledgeBuilderService } from './services/knowledge-builder.service';
import { ConversationIntelligenceGateway } from './conversation-intelligence.gateway';
import { TrainingDatasetController } from './training-dataset.controller';
import { TrainingDatasetService } from './services/training-dataset.service';
import { MemoryModule } from '../memory/memory.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PromptsModule } from '../prompts/prompts.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MemoryModule),
    forwardRef(() => KnowledgeModule),
    forwardRef(() => PromptsModule),
  ],
  controllers: [
    AIAgentController,
    VoiceStudioController,
    DatasetController,
    ConversationIntelligenceController,
    TrainingDatasetController,
  ],
  providers: [
    AIAgentService,
    AgentRuntimeService,
    AIAgentGateway,
    SessionManagerService,
    RuntimeEngineService,
    ConversationRuntimeService,
    StateManagerService,
    HealthMonitorService,
    AgentPoolService,
    MetricsService,
    RuntimeLoggingService,
    VoiceStudioService,
    VoiceStudioGateway,
    KokoroTTSProvider,
    VoiceBrainIntegrationService,
    DatasetService,
    DatasetValidationService,
    DatasetTranscriptionService,
    DatasetProcessingService,
    DatasetGateway,
    ConversationIntelligenceService,
    ConversationAnalyticsService,
    KnowledgeBuilderService,
    ConversationIntelligenceGateway,
    TrainingDatasetService,
  ],
  exports: [
    AIAgentService,
    AgentRuntimeService,
    AIAgentGateway,
    SessionManagerService,
    RuntimeEngineService,
    ConversationRuntimeService,
    StateManagerService,
    HealthMonitorService,
    AgentPoolService,
    MetricsService,
    RuntimeLoggingService,
    VoiceStudioService,
    VoiceStudioGateway,
    KokoroTTSProvider,
    VoiceBrainIntegrationService,
    DatasetService,
    DatasetValidationService,
    DatasetTranscriptionService,
    DatasetProcessingService,
    DatasetGateway,
    ConversationIntelligenceService,
    ConversationAnalyticsService,
    KnowledgeBuilderService,
    ConversationIntelligenceGateway,
    TrainingDatasetService,
  ],
})
export class AIAgentModule {}
