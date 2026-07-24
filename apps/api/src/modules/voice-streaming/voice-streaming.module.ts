import { Module } from '@nestjs/common';
import { VoiceController } from './controllers/voice.controller';
import { VoiceStreamingManager } from './services/voice-streaming-manager.service';
import { AudioBufferManager } from './services/audio-buffer-manager.service';
import { StreamingPlaybackService } from './services/streaming-playback.service';
import { VoiceActivityDetectionService } from './services/voice-activity-detection.service';
import { SilenceManager } from './services/silence-manager.service';
import { InterruptionManager } from './services/interruption-manager.service';
import { LatencyOptimizer } from './services/latency-optimizer.service';
import { AudioChunkManager } from './services/audio-chunk-manager.service';
import { SpeechQueueManager } from './services/speech-queue-manager.service';
import { PlaybackController } from './services/playback-controller.service';
import { ConversationEngineModule } from '../conversation-engine/conversation-engine.module';

@Module({
  imports: [
    ConversationEngineModule,
  ],
  controllers: [
    VoiceController,
  ],
  providers: [
    VoiceStreamingManager,
    AudioBufferManager,
    StreamingPlaybackService,
    VoiceActivityDetectionService,
    SilenceManager,
    InterruptionManager,
    LatencyOptimizer,
    AudioChunkManager,
    SpeechQueueManager,
    PlaybackController,
  ],
  exports: [
    VoiceStreamingManager,
    AudioBufferManager,
    StreamingPlaybackService,
    VoiceActivityDetectionService,
    SilenceManager,
    InterruptionManager,
    LatencyOptimizer,
    AudioChunkManager,
    SpeechQueueManager,
    PlaybackController,
  ],
})
export class VoiceStreamingModule {}
