import { Test, TestingModule } from '@nestjs/testing';
import { AudioBufferManager } from '../services/audio-buffer-manager.service';

describe('AudioBufferManager', () => {
  let service: AudioBufferManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioBufferManager],
    }).compile();

    service = module.get<AudioBufferManager>(AudioBufferManager);
  });

  it('should manage incoming audio buffers correctly', () => {
    const sessionId = 'test-buffer-session';
    service.initSession(sessionId);

    service.appendIncoming(sessionId, Buffer.from([1, 2]));
    service.appendIncoming(sessionId, Buffer.from([3, 4]));

    const result = service.flushIncoming(sessionId);
    expect(result).toEqual(Buffer.from([1, 2, 3, 4]));
    
    // After flushing, it should be empty
    expect(service.flushIncoming(sessionId)).toEqual(Buffer.alloc(0));
  });

  it('should manage outgoing audio buffers correctly', () => {
    const sessionId = 'test-buffer-session-2';
    service.initSession(sessionId);

    service.appendOutgoing(sessionId, Buffer.from([5, 6]));
    service.appendOutgoing(sessionId, Buffer.from([7, 8]));

    const result = service.flushOutgoing(sessionId);
    expect(result).toEqual(Buffer.from([5, 6, 7, 8]));
  });
});
