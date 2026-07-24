import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SpeechRecognitionManager } from '../services/speech-recognition-manager';
import { StreamingSpeechEngine } from '../services/streaming-speech-engine';
import { TranscriptAssembler } from '../services/transcript-assembler';
import { SpeechBufferManager } from '../services/speech-buffer-manager';
import { AudioChunkProcessor } from '../services/audio-chunk-processor';
import { WhisperManager } from '../services/whisper.manager';
import { SpeechRuntimeManager } from '../services/speech-runtime-manager';
import { TranscriptionSessionManager } from '../services/transcription-session-manager';
import { VoiceActivityDetector } from '../services/voice-activity-detector';
import { NoiseReductionManager } from '../services/noise-reduction-manager';
import { LanguageDetector } from '../services/language-detector';

describe('SpeechRecognitionManager (Integration)', () => {
  let sttManager: SpeechRecognitionManager;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeechRecognitionManager,
        StreamingSpeechEngine,
        TranscriptAssembler,
        SpeechBufferManager,
        AudioChunkProcessor,
        WhisperManager,
        SpeechRuntimeManager,
        TranscriptionSessionManager,
        VoiceActivityDetector,
        NoiseReductionManager,
        LanguageDetector,
        EventEmitter2,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    sttManager = module.get<SpeechRecognitionManager>(SpeechRecognitionManager);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    // Clean up all active sessions
    const activeSessions = sttManager.getActiveSessions();
    for (const session of activeSessions) {
      try {
        await sttManager.stopSession(session.sessionId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Session Lifecycle', () => {
    it('should create and start a new STT session', async () => {
      const callSessionId = 'call-session-1';

      const sessionId = await sttManager.startSession({
        callSessionId,
        language: 'en',
        enablePartialResults: true,
      });

      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('stt_');

      const status = sttManager.getSessionStatus(sessionId);
      expect(status).toBeDefined();
      expect(status?.callSessionId).toBe(callSessionId);
      expect(status?.status).toBe('ACTIVE');
    });

    it('should handle multiple concurrent sessions', async () => {
      const sessions = [];

      for (let i = 0; i < 5; i++) {
        const sessionId = await sttManager.startSession({
          callSessionId: `call-session-${i}`,
          language: 'en',
        });
        sessions.push(sessionId);
      }

      const activeSessions = sttManager.getActiveSessions();
      expect(activeSessions.length).toBe(5);

      // Clean up
      for (const sessionId of sessions) {
        await sttManager.stopSession(sessionId);
      }
    });

    it('should stop session and return final transcript', async () => {
      const sessionId = await sttManager.startSession({
        callSessionId: 'call-session-2',
        language: 'en',
      });

      // Stream some audio chunks
      const audioChunk = generatePCMAudio(16000); // 0.5 second
      await sttManager.streamChunk(sessionId, audioChunk, 20);

      const result = await sttManager.stopSession(sessionId);

      expect(result).toBeDefined();
      expect(result.fullText).toBeDefined();
      expect(result.turnsCount).toBeGreaterThanOrEqual(0);

      // Session should no longer be active
      const status = sttManager.getSessionStatus(sessionId);
      expect(status?.status).toBe('COMPLETED');
    });
  });

  describe('Audio Streaming', () => {
    it('should process audio chunks', async () => {
      const sessionId = await sttManager.startSession({
        callSessionId: 'call-session-3',
        language: 'en',
      });

      const audioChunk = generatePCMAudio(16000);

      await expect(
        sttManager.streamChunk(sessionId, audioChunk, 20)
      ).resolves.not.toThrow();

      await sttManager.stopSession(sessionId);
    });

    it('should handle multiple audio chunks in sequence', async () => {
      const sessionId = await sttManager.startSession({
        callSessionId: 'call-session-4',
        language: 'en',
      });

      // Stream 10 chunks
      for (let i = 0; i < 10; i++) {
        const audioChunk = generatePCMAudio(3200); // 0.1 second each
        await sttManager.streamChunk(sessionId, audioChunk, 20);
      }

      const status = sttManager.getSessionStatus(sessionId);
      expect(status?.totalChunksProcessed).toBeGreaterThan(0);

      await sttManager.stopSession(sessionId);
    });

    it('should reject streaming to non-existent session', async () => {
      const audioChunk = generatePCMAudio(16000);

      await expect(
        sttManager.streamChunk('non-existent-session', audioChunk, 20)
      ).rejects.toThrow();
    });
  });

  describe('Language Detection', () => {
    it('should auto-detect language when not specified', async () => {
      const sessionId = await sttManager.startSession({
        callSessionId: 'call-session-5',
        // No language specified - should auto-detect
      });

      const status = sttManager.getSessionStatus(sessionId);
      expect(status?.language).toBe('auto');

      await sttManager.stopSession(sessionId);
    });

    it('should use specified language', async () => {
      const sessionId = await sttManager.startSession({
        callSessionId: 'call-session-6',
        language: 'hi',
      });

      const status = sttManager.getSessionStatus(sessionId);
      expect(status?.language).toBe('hi');

      await sttManager.stopSession(sessionId);
    });
  });

  describe('Provider Management', () => {
    it('should list available providers', async () => {
      const providers = await sttManager.getProviders();

      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);

      const fasterWhisper = providers.find(p => p.name === 'faster-whisper');
      expect(fasterWhisper).toBeDefined();
    });

    it('should identify active provider', async () => {
      const providers = await sttManager.getProviders();

      const activeProvider = providers.find(p => p.isActive);
      expect(activeProvider).toBeDefined();
      expect(activeProvider?.name).toBe('faster-whisper');
    });
  });

  describe('Events', () => {
    it('should emit SpeechEnded event on speech completion', (done) => {
      let sessionId: string;

      sttManager.startSession({
        callSessionId: 'call-session-7',
        language: 'en',
      }).then((id) => {
        sessionId = id;

        eventEmitter.on('SpeechEnded', async (payload) => {
          if (payload.sessionId === sessionId) {
            expect(payload.sessionId).toBe(sessionId);
            expect(payload.timestamp).toBeDefined();
            await sttManager.stopSession(sessionId);
            done();
          }
        });

        // Simulate speech by sending high-energy audio followed by silence
        const processAudio = async () => {
          for (let i = 0; i < 10; i++) {
            await sttManager.streamChunk(sessionId, generateHighEnergyPCM(3200), 20);
          }

          for (let i = 0; i < 30; i++) {
            await sttManager.streamChunk(sessionId, generateSilentPCM(3200), 20);
          }
        };

        processAudio();
      });
    }, 10000);
  });

  describe('Statistics', () => {
    it('should track session statistics', async () => {
      const sessionId1 = await sttManager.startSession({
        callSessionId: 'call-session-8',
      });

      const sessionId2 = await sttManager.startSession({
        callSessionId: 'call-session-9',
      });

      const activeSessions = sttManager.getActiveSessions();
      expect(activeSessions.length).toBe(2);

      await sttManager.stopSession(sessionId1);

      const activeSessions2 = sttManager.getActiveSessions();
      expect(activeSessions2.length).toBe(1);

      await sttManager.stopSession(sessionId2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session gracefully', async () => {
      const status = sttManager.getSessionStatus('invalid-session-id');
      expect(status).toBeNull();
    });

    it('should handle stopping non-existent session', async () => {
      await expect(
        sttManager.stopSession('non-existent-session')
      ).rejects.toThrow();
    });
  });
});

/**
 * Helper function to generate PCM audio buffer
 */
function generatePCMAudio(samples: number, amplitude: number = 5000): Buffer {
  const buffer = Buffer.alloc(samples * 2);

  for (let i = 0; i < samples; i++) {
    const sample = Math.floor((Math.random() - 0.5) * 2 * amplitude);
    buffer.writeInt16LE(sample, i * 2);
  }

  return buffer;
}

/**
 * Generate high-energy audio (simulates speech)
 */
function generateHighEnergyPCM(samples: number): Buffer {
  return generatePCMAudio(samples, 15000);
}

/**
 * Generate silent audio
 */
function generateSilentPCM(samples: number): Buffer {
  return generatePCMAudio(samples, 500);
}
