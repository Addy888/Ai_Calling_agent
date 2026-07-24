import { Module } from '@nestjs/common';
import { CallOrchestratorService } from './call-orchestrator.service';
import { TelephonyModule } from '../telephony/telephony.module';
import { ConversationEngineModule } from '../conversation-engine/conversation-engine.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [TelephonyModule, ConversationEngineModule, PrismaModule],
  providers: [CallOrchestratorService],
  exports: [CallOrchestratorService],
})
export class CallOrchestratorModule {}
