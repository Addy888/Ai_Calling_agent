import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TelephonyEngineModule } from '../telephony-engine/telephony-engine.module';

@Module({
  imports: [PrismaModule, TelephonyEngineModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
