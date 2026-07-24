import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { VoiceStreamingModule } from '../voice-streaming.module';
import { VoiceStreamingManager } from '../services/voice-streaming-manager.service';
import { LatencyOptimizer } from '../services/latency-optimizer.service';

describe('VoiceStreaming (Integration)', () => {
  let app: INestApplication;
  let voiceManager: VoiceStreamingManager;
  let latencyOptimizer: LatencyOptimizer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot({ wildcard: true }),
        VoiceStreamingModule,
      ],
    })
      .overrideProvider('ConversationEngineService')
      .useValue({
        processConversation: jest.fn().mockResolvedValue({
          transcript: 'test hello',
          response: 'AI response hello',
          audio: Buffer.alloc(100),
          metadata: {},
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    voiceManager = moduleFixture.get<VoiceStreamingManager>(VoiceStreamingManager);
    latencyOptimizer = moduleFixture.get<LatencyOptimizer>(LatencyOptimizer);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return empty list when no active sessions are running', async () => {
    const response = await request(app.getHttpServer())
      .get('/voice/status')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should register and return session details once started', async () => {
    const sessionId = 'session-123';
    voiceManager.startSession(sessionId, 'call-456');

    const response = await request(app.getHttpServer())
      .get(`/voice/status?sessionId=${sessionId}`)
      .expect(200);

    expect(response.body.sessionId).toBe(sessionId);
    expect(response.body.callId).toBe('call-456');
    expect(response.body.status).toBe('ACTIVE');

    voiceManager.stopSession(sessionId);
  });

  it('should return latency metrics', async () => {
    const response = await request(app.getHttpServer())
      .get('/voice/latency')
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('stt');
    expect(response.body).toHaveProperty('llm');
    expect(response.body).toHaveProperty('tts');
  });
});
