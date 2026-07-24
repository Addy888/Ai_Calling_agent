import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationEngineService } from './conversation-engine.service';
import { SpeechModule } from '../speech/speech.module';

@Module({
  imports: [ConfigModule, SpeechModule],
  providers: [ConversationEngineService],
  exports: [ConversationEngineService],
})
export class ConversationEngineModule {}
