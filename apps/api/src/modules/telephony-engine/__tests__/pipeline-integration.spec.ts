/**
 * Pipeline Integration Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PipelineIntegrationService } from '../services/pipeline-integration.service';
import { TelephonyManagerService } from '../services/telephony-manager.service';
import { CallState, CallDirection } from '../enums/call-state.enum';

describe('PipelineIntegrationService', () => {
  let service: PipelineIntegrationService;
  let telephonyManager: TelephonyManagerService;
  let eventEmitter: EventEmitter2;

  const mockCallResult = {
    callSid: 'CA1234567890abcdef',
    providerCallId: 'CA1234567890abcdef',
    status: CallState.RINGING,
    direction: CallDirection.OUTBOUND,
    to: '+1234567890',
    from: '+0987654321',
    duration: 120,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineIntegrationService,
        {
          provide: TelephonyManagerService,
          useValue: {
            makeCall: jest.fn().mockResolvedValue(mockCallResult),
            hangupCall: jest.fn().mockResolvedValue(true),
            getCallStatus: jest.fn().mockResolvedValue(mockCallResult),
            getRecording: jest.fn().mockResolvedValue({
              recordingSid: 'RE123',
              callSid: 'CA123',
              url: 'https://example.com/recording.mp3',
              duration: 120,
            }),
            getRecordingBuffer: jest.fn().mockResolvedValue(Buffer.from('audio')),
            getStatistics: jest.fn().mockResolvedValue({
              sessions: { active: 5, total: 100 },
              recordings: { total: 85 },
            }),
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PipelineIntegrationService>(PipelineIntegrationService);
    telephonyManager = module.get<TelephonyManagerService>(TelephonyManagerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initiate Call from Pipeline', () => {
    it('should initiate a call successfully', async () => {
      const request = {
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
        statusCallbackUrl: 'https://api.example.com/status',
        metadata: {
          executionId: 'exec_789',
        },
      };

      const result = await service.initiateCallFromPipeline(request);

      expect(result).toHaveProperty('callSid');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('contactId');
      expect(result).toHaveProperty('campaignId');
      expect(result.contactId).toBe('contact_123');
      expect(result.campaignId).toBe('campaign_456');

      expect(telephonyManager.makeCall).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          from: '+0987654321',
          record: true,
          machineDetection: true,
          metadata: expect.objectContaining({
            contactId: 'contact_123',
            campaignId: 'campaign_456',
          }),
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pipeline.call.initiated',
        expect.objectContaining({
          callSid: mockCallResult.callSid,
          contactId: 'contact_123',
          campaignId: 'campaign_456',
        }),
      );
    });

    it('should emit failure event on error', async () => {
      jest.spyOn(telephonyManager, 'makeCall').mockRejectedValue(
        new Error('Call failed'),
      );

      const request = {
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      };

      await expect(service.initiateCallFromPipeline(request)).rejects.toThrow(
        'Call failed',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pipeline.call.failed',
        expect.objectContaining({
          contactId: 'contact_123',
          campaignId: 'campaign_456',
          error: 'Call failed',
        }),
      );
    });

    it('should store call metadata', async () => {
      const request = {
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
        metadata: {
          executionId: 'exec_789',
        },
      };

      const result = await service.initiateCallFromPipeline(request);

      const metadata = service.getCallMetadata(result.callSid);

      expect(metadata).not.toBeNull();
      expect(metadata?.contactId).toBe('contact_123');
      expect(metadata?.campaignId).toBe('campaign_456');
      expect(metadata?.executionId).toBe('exec_789');
    });
  });

  describe('End Call from Pipeline', () => {
    it('should end a call successfully', async () => {
      const callSid = 'CA123';

      const result = await service.endCallFromPipeline(callSid);

      expect(result).toBe(true);
      expect(telephonyManager.hangupCall).toHaveBeenCalledWith(callSid);
    });

    it('should return false on error', async () => {
      jest.spyOn(telephonyManager, 'hangupCall').mockRejectedValue(
        new Error('Hangup failed'),
      );

      const callSid = 'CA123';

      const result = await service.endCallFromPipeline(callSid);

      expect(result).toBe(false);
    });
  });

  describe('Get Call Status for Pipeline', () => {
    it('should return call status', async () => {
      // First initiate a call to store metadata
      await service.initiateCallFromPipeline({
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      });

      const status = await service.getCallStatusForPipeline(mockCallResult.callSid);

      expect(status).toHaveProperty('callSid');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('contactId');
      expect(status).toHaveProperty('campaignId');
      expect(status.contactId).toBe('contact_123');
    });
  });

  describe('Get Recording for Pipeline', () => {
    it('should get recording metadata', async () => {
      const recordingSid = 'RE123';

      const recording = await service.getRecordingForPipeline(recordingSid);

      expect(recording).toHaveProperty('recordingSid');
      expect(recording).toHaveProperty('callSid');
      expect(recording).toHaveProperty('url');
      expect(recording).toHaveProperty('duration');
    });

    it('should download recording buffer', async () => {
      const recordingSid = 'RE123';

      const buffer = await service.downloadRecordingForPipeline(recordingSid);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(telephonyManager.getRecordingBuffer).toHaveBeenCalledWith(recordingSid);
    });
  });

  describe('Event Handlers', () => {
    it('should handle call initiated event', async () => {
      // Set up metadata
      await service.initiateCallFromPipeline({
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      });

      // Simulate telephony engine event
      service.handleCallInitiated({
        callSid: mockCallResult.callSid,
        timestamp: new Date(),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pipeline.call.dialing',
        expect.objectContaining({
          callSid: mockCallResult.callSid,
          contactId: 'contact_123',
          campaignId: 'campaign_456',
        }),
      );
    });

    it('should handle call answered event', async () => {
      // Set up metadata
      await service.initiateCallFromPipeline({
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      });

      // Simulate telephony engine event
      service.handleCallAnswered({
        callSid: mockCallResult.callSid,
        answeredBy: 'human',
        timestamp: new Date(),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pipeline.call.answered',
        expect.objectContaining({
          callSid: mockCallResult.callSid,
          contactId: 'contact_123',
          answeredBy: 'human',
        }),
      );
    });

    it('should handle call completed event', async () => {
      // Set up metadata
      await service.initiateCallFromPipeline({
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      });

      // Simulate telephony engine event
      service.handleCallCompleted({
        callSid: mockCallResult.callSid,
        duration: 120,
        timestamp: new Date(),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pipeline.call.completed',
        expect.objectContaining({
          callSid: mockCallResult.callSid,
          contactId: 'contact_123',
          duration: 120,
        }),
      );
    });

    it('should handle call failed event', async () => {
      // Set up metadata
      await service.initiateCallFromPipeline({
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      });

      // Simulate telephony engine event
      service.handleCallFailed({
        callSid: mockCallResult.callSid,
        error: 'Network error',
        timestamp: new Date(),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pipeline.call.failed',
        expect.objectContaining({
          callSid: mockCallResult.callSid,
          contactId: 'contact_123',
          error: 'Network error',
        }),
      );
    });

    it('should handle recording ready event', async () => {
      // Set up metadata
      await service.initiateCallFromPipeline({
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      });

      // Simulate telephony engine event
      service.handleRecordingReady({
        recordingSid: 'RE123',
        callSid: mockCallResult.callSid,
        url: 'https://example.com/recording.mp3',
        duration: 120,
        timestamp: new Date(),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pipeline.recording.ready',
        expect.objectContaining({
          recordingSid: 'RE123',
          callSid: mockCallResult.callSid,
          contactId: 'contact_123',
        }),
      );
    });
  });

  describe('Get Pipeline Statistics', () => {
    it('should return pipeline statistics', async () => {
      const stats = await service.getPipelineStatistics();

      expect(stats).toHaveProperty('activeCalls');
      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('recordings');
      expect(stats).toHaveProperty('provider');
      expect(stats).toHaveProperty('healthy');
    });
  });

  describe('Call Metadata Management', () => {
    it('should retrieve call metadata', async () => {
      const request = {
        contactId: 'contact_123',
        campaignId: 'campaign_456',
        phoneNumber: '+1234567890',
        fromNumber: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
      };

      const result = await service.initiateCallFromPipeline(request);
      const metadata = service.getCallMetadata(result.callSid);

      expect(metadata).not.toBeNull();
      expect(metadata?.contactId).toBe('contact_123');
      expect(metadata?.campaignId).toBe('campaign_456');
    });

    it('should return null for unknown call', () => {
      const metadata = service.getCallMetadata('CA_unknown');

      expect(metadata).toBeNull();
    });
  });

  describe('State Mapping', () => {
    it('should map call states correctly', async () => {
      const testCases = [
        { state: CallState.QUEUED, expected: 'QUEUED' },
        { state: CallState.DIALING, expected: 'CALLING' },
        { state: CallState.RINGING, expected: 'RINGING' },
        { state: CallState.ANSWERED, expected: 'IN_PROGRESS' },
        { state: CallState.TALKING, expected: 'IN_PROGRESS' },
        { state: CallState.BUSY, expected: 'BUSY' },
        { state: CallState.NO_ANSWER, expected: 'NO_ANSWER' },
        { state: CallState.FAILED, expected: 'FAILED' },
        { state: CallState.COMPLETED, expected: 'COMPLETED' },
        { state: CallState.CANCELLED, expected: 'CANCELLED' },
      ];

      for (const { state, expected } of testCases) {
        jest.spyOn(telephonyManager, 'makeCall').mockResolvedValue({
          ...mockCallResult,
          status: state,
        });

        const result = await service.initiateCallFromPipeline({
          contactId: 'contact_123',
          campaignId: 'campaign_456',
          phoneNumber: '+1234567890',
          fromNumber: '+0987654321',
          callbackUrl: 'https://api.example.com/webhook',
        });

        expect(result.status).toBe(expected);
      }
    });
  });
});
