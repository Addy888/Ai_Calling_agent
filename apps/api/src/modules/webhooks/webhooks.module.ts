import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { TelephonyModule } from '../telephony/telephony.module';
import { CallOrchestratorModule } from '../call-orchestrator/call-orchestrator.module';

@Module({
  imports: [TelephonyModule, CallOrchestratorModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
