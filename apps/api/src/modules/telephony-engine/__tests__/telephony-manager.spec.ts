/**
 * Telephony Manager Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TelephonyManagerService } from '../services/telephony-manager.service';
import { ProviderManagerService } from '../services/provider-manager.service';
import { CallManagerService } from '../services/call-manager.service';
import { OutgoingCallService } from '../services/outgoing-call.service';
import { IncomingCallService } from '../services/incoming-call.service';
import { RecordingManagerService } from '../services/recording-manager.service';
import { WebhookManagerService } from '../services/webhook-manager.service';
import { CallSessionManagerService } from '../services/call-session-manager.service';
import { CallState, CallDirection } from '../enums/call-state.enum';

describe('TelephonyManagerService', () => {
  let service: TelephonyManagerService;
  let providerManager: ProviderManagerService;
  let callManager: CallManagerService;
  let outgoingCallService: OutgoingCallService;
  let recordingManager: RecordingManagerService;
  let sessionManager: CallSessionManagerService;

  const mockCallResult = {
    callSid: 'CA1234567890abcdef',
    providerCallId: 'CA1234567890abcdef',
    status: CallState.RINGING,
    direction: CallDirection.OUTBOUND,
    to: '+1234567890',
    from: '+0987654321',
  };

  const mockProvider = {
    getName: jest.fn().mockReturnValue('Twilio'),
    getType: jest.fn().mockReturnValue('twilio'),
    getCapabilities: jest.fn().mockReturnValue({
      supportsRecording: true,
      supportsDTMF: true,
      supportsConferencing: true,
      supportsTransfer: true,
      supportsMachineDetection: true,
      supportsWebhooks: true,
      supportsStreaming: true,
      maxConcurrentCalls: 10000,
    }),
    isReady: jest.fn().mockReturnValue(true),
    healthCheck: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelephonyManagerService,
        {
          provide: ProviderManagerService,
          useValue: {
            getActiveProvider: jest.fn().mockReturnValue(mockProvider),
            getAllProviders: jest.fn().mockReturnValue([mockProvider]),
            switchProvider: jest.fn().mockResolvedValue(undefined),
            getProviderCapabilities: jest.fn().mockReturnValue(mockProvider.getCapabilities()),
          },
        },
        {
          provide: CallManagerService,
          useValue: {
            makeCall: jest.fn().mockResolvedValue(mockCallResult),
            hangupCall: jest.fn().mockResolvedValue(true),
            getCallStatus: jest.fn().mockResolvedValue(mockCallResult),
            transferCall: jest.fn().mockResolvedValue(true),
            sendDTMF: jest.fn().mockResolvedValue(true),
            generateCallControl: jest.fn().mockReturnValue({
              content: '<Response></Response>',
              contentType: 'text/xml',
            }),
            getProviderInfo: jest.fn().mockReturnValue({
              name: 'Twilio',
              type: 'twilio',
              ready: true,
            }),
            healthCheck: jest.fn().mockResolvedValue(true),
            estimateCallCost: jest.fn().mockResolvedValue(0.065),
          },
        },
        {
          provide: OutgoingCallService,
          useValue: {
            initiateCall: jest.fn().mockResolvedValue(mockCallResult),
            retryCall: jest.fn().mockResolvedValue(mockCallResult),
            cancelCall: jest.fn().mockResolvedValue(true),
            getStatistics: jest.fn().mockResolvedValue({
              total: 100,
              successful: 90,
              failed: 10,
              cancelled: 5,
              retried: 3,
            }),
          },
        },
        {
          provide: IncomingCallService,
          useValue: {
            handleIncomingCall: jest.fn().mockResolvedValue(mockCallResult),
            forwardCall: jest.fn().mockResolvedValue(true),
            sendToVoicemail: jest.fn().mockResolvedValue(true),
            getStatistics: jest.fn().mockResolvedValue({
              total: 20,
              answered: 18,
              forwarded: 2,
              voicemail: 0,
            }),
          },
        },
        {
          provide: RecordingManagerService,
          useValue: {
            getRecording: jest.fn().mockResolvedValue({
              recordingSid: 'RE123',
              callSid: 'CA123',
              url: 'https://example.com/recording.mp3',
              duration: 120,
              format: 'mp3',
              channels: 1,
            }),
            getRecordingBuffer: jest.fn().mockResolvedValue(Buffer.from('audio data')),
            getRecordingsForCall: jest.fn().mockResolvedValue([]),
            deleteRecording: jest.fn().mockResolvedValue(true),
            getStatistics: jest.fn().mockResolvedValue({
              total: 85,
              totalSize: 1024000000,
              averageSize: 12047059,
            }),
            cleanupOldRecordings: jest.fn().mockResolvedValue(10),
          },
        },
        {
          provide: WebhookManagerService,
          useValue: {
            processWebhook: jest.fn().mockResolvedValue({
              processed: true,
              type: 'call_status',
            }),
          },
        },
        {
          provide: CallSessionManagerService,
          useValue: {
            getSession: jest.fn().mockResolvedValue({
              callSid: 'CA123',
              status: CallState.ANSWERED,
            }),
            getActiveSessions: jest.fn().mockResolvedValue([]),
            getActiveCallCount: jest.fn().mockResolvedValue(5),
            getStatistics: jest.fn().mockResolvedValue({
              total: 100,
              active: 5,
              completed: 90,
              failed: 5,
              averageDuration: 120,
            }),
            clearOldSessions: jest.fn().mockResolvedValue(10),
          },
        },
      ],
    }).compile();

    service = module.get<TelephonyManagerService>(TelephonyManagerService);
    providerManager = module.get<ProviderManagerService>(ProviderManagerService);
    callManager = module.get<CallManagerService>(CallManagerService);
    outgoingCallService = module.get<OutgoingCallService>(OutgoingCallService);
    recordingManager = module.get<RecordingManagerService>(RecordingManagerService);
    sessionManager = module.get<CallSessionManagerService>(CallSessionManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Outgoing Calls', () => {
    it('should make a call', async () => {
      const request = {
        to: '+1234567890',
        from: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
        record: true,
      };

      const result = await service.makeCall(request);

      expect(result).toEqual(mockCallResult);
      expect(outgoingCallService.initiateCall).toHaveBeenCalledWith(request);
    });

    it('should retry a call', async () => {
      const originalCallSid = 'CA_original';
      const request = {
        to: '+1234567890',
        from: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
        record: true,
      };

      const result = await service.retryCall(originalCallSid, request);

      expect(result).toEqual(mockCallResult);
      expect(outgoingCallService.retryCall).toHaveBeenCalledWith(
        originalCallSid,
        request,
      );
    });

    it('should cancel a call', async () => {
      const callSid = 'CA123';
      const reason = 'User requested';

      const result = await service.cancelCall(callSid, reason);

      expect(result).toBe(true);
      expect(outgoingCallService.cancelCall).toHaveBeenCalledWith(callSid, reason);
    });
  });

  describe('Call Control', () => {
    it('should hang up a call', async () => {
      const callSid = 'CA123';

      const result = await service.hangupCall(callSid);

      expect(result).toBe(true);
      expect(callManager.hangupCall).toHaveBeenCalledWith(callSid);
    });

    it('should get call status', async () => {
      const callSid = 'CA123';

      const result = await service.getCallStatus(callSid);

      expect(result).toEqual(mockCallResult);
      expect(callManager.getCallStatus).toHaveBeenCalledWith(callSid);
    });

    it('should transfer a call', async () => {
      const callSid = 'CA123';
      const to = '+1111111111';

      const result = await service.transferCall(callSid, to);

      expect(result).toBe(true);
      expect(callManager.transferCall).toHaveBeenCalledWith(callSid, to);
    });

    it('should send DTMF tones', async () => {
      const callSid = 'CA123';
      const digits = '1234#';

      const result = await service.sendDTMF(callSid, digits);

      expect(result).toBe(true);
      expect(callManager.sendDTMF).toHaveBeenCalledWith(callSid, digits);
    });

    it('should generate call control response', () => {
      const instructions = {
        say: { text: 'Hello' },
      };

      const result = service.generateCallControl(instructions);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('contentType');
      expect(callManager.generateCallControl).toHaveBeenCalledWith(instructions);
    });
  });

  describe('Recording Management', () => {
    it('should get recording', async () => {
      const recordingSid = 'RE123';

      const result = await service.getRecording(recordingSid);

      expect(result).toHaveProperty('recordingSid');
      expect(recordingManager.getRecording).toHaveBeenCalledWith(recordingSid);
    });

    it('should get recording buffer', async () => {
      const recordingSid = 'RE123';

      const result = await service.getRecordingBuffer(recordingSid);

      expect(result).toBeInstanceOf(Buffer);
      expect(recordingManager.getRecordingBuffer).toHaveBeenCalledWith(recordingSid);
    });

    it('should get recordings for call', async () => {
      const callSid = 'CA123';

      await service.getRecordingsForCall(callSid);

      expect(recordingManager.getRecordingsForCall).toHaveBeenCalledWith(callSid);
    });

    it('should delete recording', async () => {
      const recordingSid = 'RE123';

      const result = await service.deleteRecording(recordingSid);

      expect(result).toBe(true);
      expect(recordingManager.deleteRecording).toHaveBeenCalledWith(recordingSid);
    });
  });

  describe('Session Management', () => {
    it('should get call session', async () => {
      const callSid = 'CA123';

      await service.getCallSession(callSid);

      expect(sessionManager.getSession).toHaveBeenCalledWith(callSid);
    });

    it('should get active calls', async () => {
      await service.getActiveCalls();

      expect(sessionManager.getActiveSessions).toHaveBeenCalled();
    });

    it('should get active call count', async () => {
      const count = await service.getActiveCallCount();

      expect(count).toBe(5);
      expect(sessionManager.getActiveCallCount).toHaveBeenCalled();
    });
  });

  describe('Provider Management', () => {
    it('should get active provider', () => {
      const provider = service.getActiveProvider();

      expect(provider).toHaveProperty('name');
      expect(provider.name).toBe('Twilio');
    });

    it('should get all providers', () => {
      const providers = service.getAllProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should switch provider', async () => {
      await service.switchProvider('exotel');

      expect(providerManager.switchProvider).toHaveBeenCalledWith('exotel');
    });

    it('should get provider capabilities', () => {
      const capabilities = service.getProviderCapabilities();

      expect(capabilities).toHaveProperty('supportsRecording');
      expect(capabilities).toHaveProperty('supportsDTMF');
    });
  });

  describe('Statistics & Monitoring', () => {
    it('should get statistics', async () => {
      const stats = await service.getStatistics();

      expect(stats).toHaveProperty('sessions');
      expect(stats).toHaveProperty('recordings');
      expect(stats).toHaveProperty('outbound');
      expect(stats).toHaveProperty('inbound');
      expect(stats).toHaveProperty('provider');
    });

    it('should perform health check', async () => {
      const health = await service.healthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('provider');
      expect(health).toHaveProperty('activeCalls');
    });

    it('should estimate call cost', async () => {
      const cost = await service.estimateCallCost('+1234567890', '+0987654321', 300);

      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old data', async () => {
      const result = await service.cleanup({
        sessionsOlderThan: 60,
        recordingsOlderThan: 60,
      });

      expect(result).toHaveProperty('sessionsCleared');
      expect(result).toHaveProperty('recordingsDeleted');
      expect(sessionManager.clearOldSessions).toHaveBeenCalledWith(60);
      expect(recordingManager.cleanupOldRecordings).toHaveBeenCalledWith(60);
    });
  });
});
