import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CampaignApiController } from './campaign-api.controller';
import { CampaignApiService } from './campaign-api.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CallingPipelineModule } from '../calling-pipeline/calling-pipeline.module';
import { CallOrchestratorModule } from '../call-orchestrator/call-orchestrator.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CallingPipelineModule,
    CallOrchestratorModule,
  ],
  controllers: [CampaignApiController],
  providers: [CampaignApiService],
  exports: [CampaignApiService],
})
export class CampaignApiModule {}
