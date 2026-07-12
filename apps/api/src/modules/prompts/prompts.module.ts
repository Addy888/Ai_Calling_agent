import { Module } from '@nestjs/common';
import { PromptController } from './prompts.controller';
import { PromptService } from './prompts.service';

@Module({
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptsModule {}
