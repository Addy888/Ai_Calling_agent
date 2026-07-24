/**
 * Twilio Provider Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TwilioProvider } from '../providers/twilio.provider';
import { CallState, CallDirection } from '../enums/call-state.enum';

// Mock Twilio SDK
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    calls: {
      create: jest.fn().mockResolvedValue({
        sid: 'CA1234567890abcdef',
        status: 'queued',
        to: '+1234567890',
        from: '+0987654321',
        direction: 'outbound-api',
      }),
      (callSid: string) => ({
        fetch: jest.fn().mockResolvedValue({
          sid: callSid,
          status: 'completed',
          duration: '120',
          to: '+1234567890',
          from: '+0987654321',
        }),
        update: jest.fn().mockResolvedValue({
          sid: callSid,
          status: 'completed',
        }),
      }),
    },
    recordings: (recordingSid: string) => ({
      fetch: jest.fn().mockResolvedValue({
        sid: recordingSid,
        callSid: 'CA1234567890abcdef',
        duration: '120',
        channels: '1',
        uri: '/2010-04-01/Accounts/.../Recordings/RE123.json',
      }),
    }),
    api: {
      accounts: (accountSid: string) => ({
        fetch: jest.fn().mockResolvedValue({
          sid: accountSid,
          friendlyName: 'Test Account',
        }),
      }),
    },
  }));
});

describe('TwilioProvider', () => {
  let provider: TwilioProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwilioProvider],
    }).compile();

    provider = module.get<TwilioProvider>(TwilioProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Information', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('Twilio');
    });

    it('should return provider type', () => {
      expect(provider.getType()).toBe('twilio');
    });

    it('should return provider capabilities', () => {
      const capabilities = provider.getCapabilities();

      expect(capabilities).toEqual({
        supportsRecording: true,
        supportsDTMF: true,
        supportsConferencing: true,
        supportsTransfer: true,
        supportsMachineDetection: true,
        supportsWebhooks: true,
        supportsStreaming: true,
        maxConcurrentCalls: 10000,
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize with valid credentials', async () => {
      const config = {
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+1234567890',
      };

      await provider.initialize(config);

      expect(provider.isReady()).toBe(true);
    });

    it('should throw error with invalid credentials', async () => {
      const config = {
        accountSid: '',
        authToken: '',
      };

      await expect(provider.initialize(config)).rejects.toThrow(
        'Twilio credentials (accountSid, authToken) are required',
      );
    });

    it('should not be ready before initialization', () => {
      expect(provider.isReady()).toBe(false);
    });
  });

  describe('Making Calls', () => {
    beforeEach(async () => {
      await provider.initialize({
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+0987654321',
      });
    });

    it('should make an outbound call', async () => {
      const params = {
        to: '+1234567890',
        from: '+0987654321',
        callbackUrl: 'https://api.example.com/webhook',
        statusCallbackUrl: 'https://api.example.com/status',
        record: true,
        timeout: 60,
      };

      const result = await provider.makeCall(params);

      expect(result).toHaveProperty('callSid');
      expect(result.callSid).toBe('CA1234567890abcdef');
      expect(result.to).toBe('+1234567890');
      expect(result.from).toBe('+0987654321');
      expect(result.status).toBe(CallState.QUEUED);
      expect(result.direction).toBe(CallDirection.OUTBOUND);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedProvider = new TwilioProvider();

      await expect(
        uninitializedProvider.makeCall({
          to: '+1234567890',
          from: '+0987654321',
          callbackUrl: 'https://api.example.com/webhook',
        }),
      ).rejects.toThrow('Twilio provider is not initialized');
    });
  });

  describe('Call Status', () => {
    beforeEach(async () => {
      await provider.initialize({
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+0987654321',
      });
    });

    it('should get call status', async () => {
      const callSid = 'CA1234567890abcdef';
      const status = await provider.getCallStatus(callSid);

      expect(status).toHaveProperty('callSid');
      expect(status.callSid).toBe(callSid);
      expect(status.status).toBe(CallState.COMPLETED);
      expect(status.duration).toBe(120);
    });
  });

  describe('Call Control', () => {
    beforeEach(async () => {
      await provider.initialize({
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+0987654321',
      });
    });

    it('should hang up a call', async () => {
      const callSid = 'CA1234567890abcdef';
      const result = await provider.hangupCall(callSid);

      expect(result).toBe(true);
    });

    it('should transfer a call', async () => {
      const callSid = 'CA1234567890abcdef';
      const result = await provider.transferCall(callSid, '+1111111111');

      expect(result).toBe(true);
    });

    it('should send DTMF tones', async () => {
      const callSid = 'CA1234567890abcdef';
      const result = await provider.sendDTMF(callSid, '1234#');

      expect(result).toBe(true);
    });
  });

  describe('Recording Management', () => {
    beforeEach(async () => {
      await provider.initialize({
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+0987654321',
      });
    });

    it('should get recording information', async () => {
      const recordingSid = 'RE1234567890abcdef';
      const recording = await provider.getRecording(recordingSid);

      expect(recording).toHaveProperty('recordingSid');
      expect(recording.recordingSid).toBe(recordingSid);
      expect(recording.callSid).toBe('CA1234567890abcdef');
      expect(recording.duration).toBe(120);
      expect(recording.format).toBe('mp3');
    });
  });

  describe('TwiML Generation', () => {
    it('should generate TwiML for say instruction', () => {
      const instructions = {
        say: {
          text: 'Hello, welcome to our service.',
          voice: 'alice',
          language: 'en-US',
        },
      };

      const response = provider.generateCallControl(instructions);

      expect(response.contentType).toBe('text/xml');
      expect(response.content).toContain('<Say');
      expect(response.content).toContain('Hello, welcome to our service.');
    });

    it('should generate TwiML for gather instruction', () => {
      const instructions = {
        gather: {
          input: 'dtmf' as const,
          numDigits: 1,
          action: 'https://api.example.com/gather',
        },
      };

      const response = provider.generateCallControl(instructions);

      expect(response.contentType).toBe('text/xml');
      expect(response.content).toContain('<Gather');
    });

    it('should generate TwiML for dial instruction', () => {
      const instructions = {
        dial: {
          number: '+1234567890',
          timeout: 30,
        },
      };

      const response = provider.generateCallControl(instructions);

      expect(response.contentType).toBe('text/xml');
      expect(response.content).toContain('<Dial');
    });

    it('should generate TwiML for hangup instruction', () => {
      const instructions = {
        hangup: true,
      };

      const response = provider.generateCallControl(instructions);

      expect(response.contentType).toBe('text/xml');
      expect(response.content).toContain('<Hangup');
    });
  });

  describe('Webhook Processing', () => {
    it('should parse call status webhook', () => {
      const payload = {
        CallSid: 'CA1234567890abcdef',
        CallStatus: 'completed',
        Direction: 'outbound-api',
        From: '+0987654321',
        To: '+1234567890',
        CallDuration: '120',
      };

      const webhook = provider.parseWebhook(payload);

      expect(webhook.type).toBe('call_status');
      expect(webhook.callSid).toBe('CA1234567890abcdef');
      expect(webhook.status).toBe(CallState.COMPLETED);
      expect(webhook.direction).toBe(CallDirection.OUTBOUND);
      expect(webhook.duration).toBe(120);
    });

    it('should parse recording ready webhook', () => {
      const payload = {
        CallSid: 'CA1234567890abcdef',
        RecordingSid: 'RE1234567890abcdef',
        RecordingUrl: 'https://api.twilio.com/recordings/RE123.mp3',
      };

      const webhook = provider.parseWebhook(payload);

      expect(webhook.type).toBe('recording_ready');
      expect(webhook.recordingSid).toBe('RE1234567890abcdef');
      expect(webhook.recordingUrl).toBe(
        'https://api.twilio.com/recordings/RE123.mp3',
      );
    });

    it('should parse DTMF received webhook', () => {
      const payload = {
        CallSid: 'CA1234567890abcdef',
        Digits: '1234',
      };

      const webhook = provider.parseWebhook(payload);

      expect(webhook.type).toBe('dtmf_received');
      expect(webhook.dtmfDigits).toBe('1234');
    });

    it('should parse error webhook', () => {
      const payload = {
        CallSid: 'CA1234567890abcdef',
        ErrorCode: '30001',
        ErrorMessage: 'Queue overflow',
      };

      const webhook = provider.parseWebhook(payload);

      expect(webhook.type).toBe('error');
      expect(webhook.errorCode).toBe('30001');
      expect(webhook.errorMessage).toBe('Queue overflow');
    });
  });

  describe('Cost Estimation', () => {
    beforeEach(async () => {
      await provider.initialize({
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+0987654321',
      });
    });

    it('should estimate call cost', async () => {
      const cost = await provider.estimateCallCost(
        '+0987654321',
        '+1234567890',
        300, // 5 minutes
      );

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });
  });

  describe('Health Check', () => {
    it('should return false when not initialized', async () => {
      const healthy = await provider.healthCheck();
      expect(healthy).toBe(false);
    });

    it('should return true when initialized', async () => {
      await provider.initialize({
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+0987654321',
      });

      const healthy = await provider.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('State Mapping', () => {
    it('should map Twilio status to CallState correctly', () => {
      const testCases = [
        { twilioStatus: 'queued', expected: CallState.QUEUED },
        { twilioStatus: 'initiated', expected: CallState.DIALING },
        { twilioStatus: 'ringing', expected: CallState.RINGING },
        { twilioStatus: 'in-progress', expected: CallState.ANSWERED },
        { twilioStatus: 'completed', expected: CallState.COMPLETED },
        { twilioStatus: 'busy', expected: CallState.BUSY },
        { twilioStatus: 'no-answer', expected: CallState.NO_ANSWER },
        { twilioStatus: 'failed', expected: CallState.FAILED },
        { twilioStatus: 'canceled', expected: CallState.CANCELLED },
      ];

      testCases.forEach(({ twilioStatus, expected }) => {
        const webhook = provider.parseWebhook({
          CallSid: 'CA123',
          CallStatus: twilioStatus,
        });

        expect(webhook.status).toBe(expected);
      });
    });
  });
});
