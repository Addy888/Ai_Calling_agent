import { Module } from '@nestjs/common';
import { ScriptEngineController } from './script-engine.controller';
import { ScriptEngineService } from './script-engine.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScriptEngineController],
  providers: [ScriptEngineService],
  exports: [ScriptEngineService],
})
export class ScriptEngineModule {}
