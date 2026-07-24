import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TTSManagerService } from './services/tts-manager.service';
import { ElevenLabsProvider } from './providers/elevenlabs.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    TTSManagerService,
    ElevenLabsProvider,
  ],
  exports: [
    TTSManagerService,
  ],
})
export class TTSModule {}
