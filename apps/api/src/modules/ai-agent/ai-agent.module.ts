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
  controllers: [AIAgentController],
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
  ],
})
export class AIAgentModule {}
