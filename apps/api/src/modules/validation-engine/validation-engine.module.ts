import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ValidationEngineController } from './validation-engine.controller';
import { ValidationEngineService } from './validation-engine.service';

@Module({
  imports: [PrismaModule],
  controllers: [ValidationEngineController],
  providers: [ValidationEngineService],
  exports: [ValidationEngineService],
})
export class ValidationEngineModule {}
