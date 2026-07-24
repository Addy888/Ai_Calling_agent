import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoiceActivityDetectionService } from '../services/voice-activity-detection.service';

describe('VoiceActivityDetectionService', () => {
  let service: VoiceActivityDetectionService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceActivityDetectionService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VoiceActivityDetectionService>(VoiceActivityDetectionService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should detect start of speaking on loud enough frame buffers', () => {
    const sessionId = 'test-session-vad';
    service.initSession(sessionId);

    // Create loud buffers (simulating speech samples)
    const speechChunk = Buffer.alloc(100);
    // Fill buffer with loud values to exceed threshold
    for (let i = 0; i < 50; i++) {
      speechChunk.writeInt16LE(15000, i * 2);
    }

    // Call process multiple times to trigger start speech threshold
    service.processAudioChunk(sessionId, speechChunk);
    service.processAudioChunk(sessionId, speechChunk);
    service.processAudioChunk(sessionId, speechChunk);

    expect(eventEmitter.emit).toHaveBeenCalledWith('CustomerStartedSpeaking', expect.any(Object));
  });

  it('should detect stop speaking / pause on silent buffers', () => {
    const sessionId = 'test-session-vad-silence';
    service.initSession(sessionId);

    // Put into speaking state first
    const speechChunk = Buffer.alloc(100);
    for (let i = 0; i < 50; i++) {
      speechChunk.writeInt16LE(15000, i * 2);
    }
    service.processAudioChunk(sessionId, speechChunk);
    service.processAudioChunk(sessionId, speechChunk);
    service.processAudioChunk(sessionId, speechChunk);

    // Send silent chunks to trigger stop speech threshold
    const silentChunk = Buffer.alloc(100); // filled with zeros
    for (let i = 0; i < 30; i++) {
      service.processAudioChunk(sessionId, silentChunk);
    }

    expect(eventEmitter.emit).toHaveBeenCalledWith('CustomerStoppedSpeaking', expect.any(Object));
    expect(eventEmitter.emit).toHaveBeenCalledWith('ShortPauseDetected', expect.any(Object));
  });
});
