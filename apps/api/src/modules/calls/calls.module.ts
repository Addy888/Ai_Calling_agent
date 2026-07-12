import { Module } from '@nestjs/common';
import { CallController } from './calls.controller';
import { CallService } from './calls.service';

@Module({
  controllers: [CallController],
  providers: [CallService],
  exports: [CallService],
})
export class CallsModule {}
