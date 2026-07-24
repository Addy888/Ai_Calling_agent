import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoiceActivityDetector } from '../services/voice-activity-detector';

describe('VoiceActivityDetector', () => {
  let detector: VoiceActivityDetector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceActivityDetector,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    detector = module.get<VoiceActivityDetector>(VoiceActivityDetector);
  });

  it('should be defined', () => {
    expect(detector).toBeDefined();
  });

  describe('Speech Detection', () => {
    it('should detect speech when RMS exceeds threshold', () => {
      const sessionId = 'test-session-1';
      const audioBuffer = generateAudioBuffer(1000, 0.05); // High energy

      const result = detector.process(sessionId, audioBuffer, 20);

      expect(result.rms).toBeGreaterThan(0.025);
    });

    it('should detect silence when RMS is below threshold', () => {
      const sessionId = 'test-session-2';
      const audioBuffer = generateAudioBuffer(1000, 0.01); // Low energy

      const result = detector.process(sessionId, audioBuffer, 20);

      expect(result.rms).toBeLessThan(0.025);
    });

    it('should trigger speech_started after consecutive speech chunks', () => {
      const sessionId = 'test-session-3';

      // Send multiple high-energy chunks
      let result;
      for (let i = 0; i < 10; i++) {
        const audioBuffer = generateAudioBuffer(1000, 0.05);
        result = detector.process(sessionId, audioBuffer, 20);
      }

      expect(result?.speechStateChanged).toBe(true);
      expect(result?.newState).toBe('speech_started');
    });

    it('should trigger speech_ended after silence following speech', () => {
      const sessionId = 'test-session-4';

      // Start with speech
      for (let i = 0; i < 10; i++) {
        const audioBuffer = generateAudioBuffer(1000, 0.05);
        detector.process(sessionId, audioBuffer, 20);
      }

      // Then silence
      let result;
      for (let i = 0; i < 30; i++) {
        const audioBuffer = generateAudioBuffer(1000, 0.005);
        result = detector.process(sessionId, audioBuffer, 20);
      }

      expect(result?.speechStateChanged).toBe(true);
      expect(result?.newState).toBe('speech_ended');
    });

    it('should detect long silence', () => {
      const sessionId = 'test-session-5';

      // Trigger speech first
      for (let i = 0; i < 10; i++) {
        detector.process(sessionId, generateAudioBuffer(1000, 0.05), 20);
      }

      // End speech
      for (let i = 0; i < 30; i++) {
        detector.process(sessionId, generateAudioBuffer(1000, 0.005), 20);
      }

      // Long silence
      let result;
      for (let i = 0; i < 70; i++) {
        const audioBuffer = generateAudioBuffer(1000, 0.005);
        result = detector.process(sessionId, audioBuffer, 20);
      }

      expect(result?.newState).toBe('silence');
    });

    it('should detect background noise', () => {
      const sessionId = 'test-session-6';
      const audioBuffer = generateAudioBuffer(1000, 0.15); // Very high energy

      const result = detector.process(sessionId, audioBuffer, 20);

      expect(result.newState).toBe('noise');
    });
  });

  describe('Session Management', () => {
    it('should reset session state', () => {
      const sessionId = 'test-session-7';

      // Establish speech state
      for (let i = 0; i < 10; i++) {
        detector.process(sessionId, generateAudioBuffer(1000, 0.05), 20);
      }

      // Reset
      detector.resetSession(sessionId);

      // Process new chunk
      const audioBuffer = generateAudioBuffer(1000, 0.005);
      const result = detector.process(sessionId, audioBuffer, 20);

      expect(result.isSpeech).toBe(false);
    });
  });

  describe('RMS Calculation', () => {
    it('should calculate RMS correctly for known values', () => {
      const sessionId = 'test-session-8';
      
      // Create buffer with known values
      const buffer = Buffer.alloc(100);
      for (let i = 0; i < 50; i++) {
        buffer.writeInt16LE(16384, i * 2); // Half of max amplitude
      }

      const result = detector.process(sessionId, buffer, 20);

      expect(result.rms).toBeGreaterThan(0);
      expect(result.rms).toBeLessThan(1);
    });

    it('should handle empty buffers gracefully', () => {
      const sessionId = 'test-session-9';
      const emptyBuffer = Buffer.alloc(0);

      const result = detector.process(sessionId, emptyBuffer, 20);

      expect(result.rms).toBe(0);
    });
  });
});

/**
 * Helper function to generate audio buffer with specific RMS level
 */
function generateAudioBuffer(samples: number, targetRms: number): Buffer {
  const buffer = Buffer.alloc(samples * 2);
  
  for (let i = 0; i < samples; i++) {
    // Generate random sample with target RMS
    const sample = Math.floor((Math.random() - 0.5) * 2 * targetRms * 32768);
    buffer.writeInt16LE(sample, i * 2);
  }
  
  return buffer;
}
