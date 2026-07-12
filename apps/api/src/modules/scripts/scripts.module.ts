import { Module } from '@nestjs/common';
import { ScriptController } from './scripts.controller';
import { ScriptService } from './scripts.service';

@Module({
  controllers: [ScriptController],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptsModule {}
