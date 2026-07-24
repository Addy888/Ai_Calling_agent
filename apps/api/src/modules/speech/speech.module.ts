import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpeechService } from './speech.service';
import { OpenAISTTProvider } from './providers/openai-stt.provider';
import { ElevenLabsTTSProvider } from './providers/elevenlabs-tts.provider';

@Module({
  imports: [ConfigModule],
  providers: [SpeechService, OpenAISTTProvider, ElevenLabsTTSProvider],
  exports: [SpeechService],
})
export class SpeechModule {}
