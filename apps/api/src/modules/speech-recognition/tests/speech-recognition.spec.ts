import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoiceActivityDetector } from '../services/voice-activity-detector';
import { NoiseReductionManager } from '../services/noise-reduction-manager';
import { SpeechBufferManager } from '../services/speech-buffer-manager';
import { AudioChunkProcessor } from '../services/audio-chunk-processor';
import { WhisperManager } from '../services/whisper.manager';
import { LanguageDetector } from '../services/language-detector';
import { TranscriptAssembler } from '../services/transcript-assembler';
import { TranscriptionSessionManager } from '../services/transcription-session-manager';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function createSilentPCMBuffer(durationMs: number, sampleRate = 16000): Buffer {
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  return Buffer.alloc(sampleCount * 2, 0);
}

function createSpeechPCMBuffer(durationMs: number, sampleRate = 16000): Buffer {
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    // Write ~30% amplitude sine wave to simulate speech
    const value = Math.round(Math.sin(i * 0.1) * 9000);
    buffer.writeInt16LE(value, i * 2);
  }
  return buffer;
}

function mockConfigService(values: Record<string, unknown> = {}): Partial<ConfigService> {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => values[key] ?? defaultValue),
  };
}

// ─────────────────────────────────────────────
// VoiceActivityDetector Tests
// ─────────────────────────────────────────────

describe('VoiceActivityDetector', () => {
  let vad: VoiceActivityDetector;

  beforeEach(() => {
    vad = new VoiceActivityDetector(mockConfigService() as ConfigService);
  });

  it('should return isSpeech=false for silent audio', () => {
    const silentBuffer = createSilentPCMBuffer(20);
    const result = vad.process('test-session', silentBuffer, 20);
    expect(result.isSpeech).toBe(false);
    expect(result.rms).toBeLessThan(0.01);
  });

  it('should detect speech for active audio above threshold', () => {
    const speechBuffer = createSpeechPCMBuffer(300);
    // Feed multiple chunks to accumulate consecutive speech ms
    for (let i = 0; i < 10; i++) {
      const result = vad.process('speech-session', createSpeechPCMBuffer(30), 30);
      if (i >= 4) {
        // After 5 chunks (150ms), should detect speech
        expect(result.isSpeech).toBe(true);
      }
    }
  });

  it('should reset session correctly', () => {
    vad.process('reset-session', createSpeechPCMBuffer(300), 20);
    vad.resetSession('reset-session');
    const result = vad.process('reset-session', createSilentPCMBuffer(20), 20);
    expect(result.isSpeech).toBe(false);
  });
});

// ─────────────────────────────────────────────
// NoiseReductionManager Tests
// ─────────────────────────────────────────────

describe('NoiseReductionManager', () => {
  let noiseManager: NoiseReductionManager;

  beforeEach(() => {
    noiseManager = new NoiseReductionManager(mockConfigService() as ConfigService);
  });

  it('should return same length buffer after processing', () => {
    const input = createSilentPCMBuffer(50);
    const output = noiseManager.process(input);
    expect(output.length).toBe(input.length);
  });

  it('should gate very low amplitude values (noise floor)', () => {
    const lowAmpBuffer = Buffer.alloc(64);
    for (let i = 0; i < 32; i++) {
      // Write very small amplitude values (noise floor ~0.1%)
      lowAmpBuffer.writeInt16LE(30, i * 2);
    }
    const output = noiseManager.process(lowAmpBuffer);
    // Processed value should be attenuated below original
    expect(output.readInt16LE(0)).toBeLessThan(30);
  });

  it('should return empty buffer unchanged', () => {
    const empty = Buffer.alloc(0);
    const output = noiseManager.process(empty);
    expect(output.length).toBe(0);
  });
});

// ─────────────────────────────────────────────
// SpeechBufferManager Tests
// ─────────────────────────────────────────────

describe('SpeechBufferManager', () => {
  let bufferManager: SpeechBufferManager;

  beforeEach(() => {
    bufferManager = new SpeechBufferManager(mockConfigService() as ConfigService);
    bufferManager.initSession('buf-session');
  });

  afterEach(() => {
    bufferManager.destroySession('buf-session');
  });

  it('should append and flush correctly', () => {
    const chunk1 = Buffer.from([1, 2, 3, 4]);
    const chunk2 = Buffer.from([5, 6, 7, 8]);
    bufferManager.append('buf-session', chunk1);
    bufferManager.append('buf-session', chunk2);

    const flushed = bufferManager.flush('buf-session');
    expect(flushed.length).toBe(8);
    expect(flushed[0]).toBe(1);
    expect(flushed[4]).toBe(5);
  });

  it('should return empty buffer after flush', () => {
    bufferManager.append('buf-session', Buffer.from([1, 2]));
    bufferManager.flush('buf-session');
    const after = bufferManager.flush('buf-session');
    expect(after.length).toBe(0);
  });

  it('should return empty buffer for unknown session', () => {
    const result = bufferManager.peek('unknown-session');
    expect(result.length).toBe(0);
  });
});

// ─────────────────────────────────────────────
// WhisperManager Tests
// ─────────────────────────────────────────────

describe('WhisperManager', () => {
  let whisperManager: WhisperManager;

  beforeEach(() => {
    whisperManager = new WhisperManager(mockConfigService({
      STT_PROVIDER: 'faster-whisper',
      FASTER_WHISPER_ENDPOINT: 'http://localhost:9000',
    }) as ConfigService);
  });

  it('should initialize with faster-whisper as default provider', () => {
    expect(whisperManager.getActiveProviderName()).toBe('faster-whisper');
  });

  it('should return transcription result for non-empty buffer', async () => {
    const buffer = createSpeechPCMBuffer(500);
    const result = await whisperManager.transcribe(buffer, { language: 'en' });
    expect(result).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should return empty result for empty buffer', async () => {
    const result = await whisperManager.transcribe(Buffer.alloc(0));
    expect(result.text).toBe('');
    expect(result.confidence).toBe(0);
  });

  it('should list all providers', async () => {
    const providers = await whisperManager.getProvidersStatus();
    expect(providers.length).toBe(5);
    const names = providers.map(p => p.name);
    expect(names).toContain('faster-whisper');
    expect(names).toContain('openai-whisper');
    expect(names).toContain('deepgram');
    expect(names).toContain('azure-speech');
    expect(names).toContain('google-speech');
  });
});

// ─────────────────────────────────────────────
// LanguageDetector Tests
// ─────────────────────────────────────────────

describe('LanguageDetector', () => {
  let languageDetector: LanguageDetector;

  beforeEach(() => {
    languageDetector = new LanguageDetector();
  });

  it('should detect English text', () => {
    const result = languageDetector.detect('Hello, how are you doing today? The weather is nice.');
    expect(result.language).toBe('en');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should detect Hindi Devanagari script', () => {
    const result = languageDetector.detect('नमस्ते आप कैसे हैं?');
    expect(result.language).toBe('hi');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should detect Hinglish patterns', () => {
    const result = languageDetector.detect('haan yaar theek hai, kya bol raha hai tu?');
    expect(['hi-en', 'hi']).toContain(result.language);
    expect(result.isHinglish ?? false).toBe(true);
  });

  it('should return normalized whisper language code', () => {
    expect(languageDetector.normalizeForWhisper('hi-en')).toBe('hi');
    expect(languageDetector.normalizeForWhisper('en')).toBe('en');
  });
});

// ─────────────────────────────────────────────
// TranscriptionSessionManager Tests
// ─────────────────────────────────────────────

describe('TranscriptionSessionManager', () => {
  let sessionManager: TranscriptionSessionManager;

  beforeEach(() => {
    sessionManager = new TranscriptionSessionManager();
  });

  it('should create and activate a session', () => {
    sessionManager.createSession({ sessionId: 'sess-1', callSessionId: 'call-1' });
    sessionManager.activate('sess-1');
    const session = sessionManager.getSession('sess-1');
    expect(session).toBeDefined();
    expect(session!.status).toBe('ACTIVE');
  });

  it('should record chunks and turns', () => {
    sessionManager.createSession({ sessionId: 'sess-2', callSessionId: 'call-2' });
    sessionManager.activate('sess-2');
    sessionManager.recordChunk('sess-2', 320);
    sessionManager.recordTurn('sess-2');
    const session = sessionManager.getSession('sess-2');
    expect(session!.totalChunksProcessed).toBe(1);
    expect(session!.totalBytesProcessed).toBe(320);
    expect(session!.turnsCount).toBe(1);
  });

  it('should complete a session', () => {
    sessionManager.createSession({ sessionId: 'sess-3', callSessionId: 'call-3' });
    sessionManager.activate('sess-3');
    sessionManager.complete('sess-3');
    const session = sessionManager.getSession('sess-3');
    expect(session!.status).toBe('COMPLETED');
    expect(session!.endedAt).toBeDefined();
  });
});
