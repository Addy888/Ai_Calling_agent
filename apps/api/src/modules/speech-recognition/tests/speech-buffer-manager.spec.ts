import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SpeechBufferManager } from '../services/speech-buffer-manager';

describe('SpeechBufferManager', () => {
  let bufferManager: SpeechBufferManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeechBufferManager,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    bufferManager = module.get<SpeechBufferManager>(SpeechBufferManager);
  });

  it('should be defined', () => {
    expect(bufferManager).toBeDefined();
  });

  describe('Session Initialization', () => {
    it('should initialize a new session', () => {
      const sessionId = 'test-session-1';
      
      bufferManager.initSession(sessionId);
      
      const buffered = bufferManager.getBufferedBytes(sessionId);
      expect(buffered).toBe(0);
    });

    it('should handle multiple session initializations', () => {
      const sessionIds = ['session-1', 'session-2', 'session-3'];
      
      sessionIds.forEach(id => bufferManager.initSession(id));
      
      sessionIds.forEach(id => {
        expect(bufferManager.getBufferedBytes(id)).toBe(0);
      });
    });
  });

  describe('Buffer Append', () => {
    it('should append audio chunks to buffer', () => {
      const sessionId = 'test-session-2';
      bufferManager.initSession(sessionId);
      
      const chunk1 = Buffer.alloc(1000);
      const chunk2 = Buffer.alloc(2000);
      
      bufferManager.append(sessionId, chunk1);
      bufferManager.append(sessionId, chunk2);
      
      expect(bufferManager.getBufferedBytes(sessionId)).toBe(3000);
    });

    it('should track elapsed time correctly', () => {
      const sessionId = 'test-session-3';
      bufferManager.initSession(sessionId);
      
      // At 16kHz, 16-bit mono: 1 second = 32000 bytes
      const oneSecondChunk = Buffer.alloc(32000);
      
      bufferManager.append(sessionId, oneSecondChunk);
      
      const elapsedMs = bufferManager.getElapsedMs(sessionId);
      expect(elapsedMs).toBeCloseTo(1000, 0);
    });

    it('should handle non-existent session gracefully', () => {
      const sessionId = 'non-existent';
      const chunk = Buffer.alloc(1000);
      
      // Should not throw
      expect(() => {
        bufferManager.append(sessionId, chunk);
      }).not.toThrow();
    });
  });

  describe('Buffer Flush', () => {
    it('should flush and return concatenated buffer', () => {
      const sessionId = 'test-session-4';
      bufferManager.initSession(sessionId);
      
      const chunk1 = Buffer.from([1, 2, 3, 4]);
      const chunk2 = Buffer.from([5, 6, 7, 8]);
      
      bufferManager.append(sessionId, chunk1);
      bufferManager.append(sessionId, chunk2);
      
      const flushed = bufferManager.flush(sessionId);
      
      expect(flushed.length).toBe(8);
      expect(flushed).toEqual(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
    });

    it('should clear buffer after flush', () => {
      const sessionId = 'test-session-5';
      bufferManager.initSession(sessionId);
      
      const chunk = Buffer.alloc(1000);
      bufferManager.append(sessionId, chunk);
      
      bufferManager.flush(sessionId);
      
      expect(bufferManager.getBufferedBytes(sessionId)).toBe(0);
    });

    it('should return empty buffer for non-existent session', () => {
      const flushed = bufferManager.flush('non-existent');
      
      expect(flushed.length).toBe(0);
    });

    it('should handle multiple flushes', () => {
      const sessionId = 'test-session-6';
      bufferManager.initSession(sessionId);
      
      bufferManager.append(sessionId, Buffer.alloc(1000));
      bufferManager.flush(sessionId);
      
      bufferManager.append(sessionId, Buffer.alloc(2000));
      const flushed = bufferManager.flush(sessionId);
      
      expect(flushed.length).toBe(2000);
    });
  });

  describe('Buffer Peek', () => {
    it('should peek without clearing buffer', () => {
      const sessionId = 'test-session-7';
      bufferManager.initSession(sessionId);
      
      const chunk = Buffer.alloc(1000);
      bufferManager.append(sessionId, chunk);
      
      const peeked = bufferManager.peek(sessionId);
      
      expect(peeked.length).toBe(1000);
      expect(bufferManager.getBufferedBytes(sessionId)).toBe(1000);
    });

    it('should return empty buffer for non-existent session', () => {
      const peeked = bufferManager.peek('non-existent');
      
      expect(peeked.length).toBe(0);
    });
  });

  describe('Buffer Size Limits', () => {
    it('should trim oldest chunks when exceeding max size', () => {
      const sessionId = 'test-session-8';
      bufferManager.initSession(sessionId);
      
      // Max buffer is 320,000 bytes (10 seconds at 16kHz)
      // Add 12 seconds worth of audio
      const oneSecondChunk = Buffer.alloc(32000);
      
      for (let i = 0; i < 12; i++) {
        bufferManager.append(sessionId, oneSecondChunk);
      }
      
      const buffered = bufferManager.getBufferedBytes(sessionId);
      
      // Should be trimmed to max size
      expect(buffered).toBeLessThanOrEqual(320000);
    });
  });

  describe('Session Destruction', () => {
    it('should destroy session and release memory', () => {
      const sessionId = 'test-session-9';
      bufferManager.initSession(sessionId);
      
      bufferManager.append(sessionId, Buffer.alloc(1000));
      bufferManager.destroySession(sessionId);
      
      // After destruction, should return 0
      expect(bufferManager.getBufferedBytes(sessionId)).toBe(0);
    });

    it('should handle destroying non-existent session', () => {
      expect(() => {
        bufferManager.destroySession('non-existent');
      }).not.toThrow();
    });
  });

  describe('Elapsed Time Tracking', () => {
    it('should correctly calculate elapsed time for multiple chunks', () => {
      const sessionId = 'test-session-10';
      bufferManager.initSession(sessionId);
      
      // 0.5 second chunks (16000 bytes each)
      const halfSecondChunk = Buffer.alloc(16000);
      
      bufferManager.append(sessionId, halfSecondChunk);
      bufferManager.append(sessionId, halfSecondChunk);
      bufferManager.append(sessionId, halfSecondChunk);
      
      const elapsedMs = bufferManager.getElapsedMs(sessionId);
      expect(elapsedMs).toBeCloseTo(1500, 0);
    });

    it('should reset elapsed time after flush', () => {
      const sessionId = 'test-session-11';
      bufferManager.initSession(sessionId);
      
      bufferManager.append(sessionId, Buffer.alloc(32000));
      bufferManager.flush(sessionId);
      
      expect(bufferManager.getElapsedMs(sessionId)).toBe(0);
    });
  });
});
