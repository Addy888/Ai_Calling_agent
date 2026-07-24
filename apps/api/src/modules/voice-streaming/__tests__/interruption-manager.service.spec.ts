import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InterruptionManager } from '../services/interruption-manager.service';
import { PlaybackController } from '../services/playback-controller.service';
import { SpeechQueueManager } from '../services/speech-queue-manager.service';
import { LatencyOptimizer } from '../services/latency-optimizer.service';

describe('InterruptionManager', () => {
  let service: InterruptionManager;
  let playbackController: PlaybackController;
  let queueManager: SpeechQueueManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterruptionManager,
        PlaybackController,
        SpeechQueueManager,
        LatencyOptimizer,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InterruptionManager>(InterruptionManager);
    playbackController = module.get<PlaybackController>(PlaybackController);
    queueManager = module.get<SpeechQueueManager>(SpeechQueueManager);
  });

  it('should stop playback and clear queue when customer interrupts active playback', () => {
    const sessionId = 'test-session-interruption';
    
    // Simulate active playback state
    playbackController.play(sessionId);
    queueManager.enqueue(sessionId, {
      id: 'seg1',
      text: 'Hello world',
      audio: Buffer.alloc(100),
      timestamp: Date.now(),
    });

    expect(playbackController.isPlaying(sessionId)).toBe(true);
    expect(queueManager.getQueueLength(sessionId)).toBe(1);

    // Act
    service.handleCustomerSpeechStart(sessionId);

    // Assert
    expect(playbackController.isPlaying(sessionId)).toBe(false);
    expect(queueManager.getQueueLength(sessionId)).toBe(0);
    expect(service.isInterrupted(sessionId)).toBe(true);
  });
});
