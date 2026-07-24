import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { SpeechRecognitionController } from './speech-recognition.controller';
import { SpeechRecognitionManager } from './services/speech-recognition-manager';
import { StreamingSpeechEngine } from './services/streaming-speech-engine';
import { WhisperManager } from './services/whisper.manager';
import { VoiceActivityDetector } from './services/voice-activity-detector';
import { NoiseReductionManager } from './services/noise-reduction-manager';
import { SpeechBufferManager } from './services/speech-buffer-manager';
import { AudioChunkProcessor } from './services/audio-chunk-processor';
import { LanguageDetector } from './services/language-detector';
import { TranscriptAssembler } from './services/transcript-assembler';
import { TranscriptionSessionManager } from './services/transcription-session-manager';
import { SpeechRuntimeManager } from './services/speech-runtime-manager';
import { PipelineIntegrationService } from './services/pipeline-integration.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { TranscriptStorageService } from './services/transcript-storage.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per chunk upload
      },
    }),
  ],
  controllers: [SpeechRecognitionController],
  providers: [
    // Core STT Manager
    SpeechRecognitionManager,
    
    // Streaming Engine
    StreamingSpeechEngine,
    
    // Providers
    WhisperManager,
    
    // Audio Processing Pipeline
    VoiceActivityDetector,
    NoiseReductionManager,
    SpeechBufferManager,
    AudioChunkProcessor,
    
    // Language & Transcript
    LanguageDetector,
    TranscriptAssembler,
    
    // Session & Runtime
    TranscriptionSessionManager,
    SpeechRuntimeManager,
    
    // Pipeline Integration
    PipelineIntegrationService,
    
    // Performance & Storage
    PerformanceMonitorService,
    TranscriptStorageService,
  ],
  exports: [
    SpeechRecognitionManager,
    StreamingSpeechEngine,
    TranscriptAssembler,
    TranscriptionSessionManager,
    SpeechRuntimeManager,
    PipelineIntegrationService,
    PerformanceMonitorService,
    TranscriptStorageService,
  ],
})
export class SpeechRecognitionModule {}
