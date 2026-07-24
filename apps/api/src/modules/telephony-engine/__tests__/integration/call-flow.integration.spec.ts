/**
 * Call Flow Integration Tests
 * Tests the complete call lifecycle from initiation to completion
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { TelephonyEngineModule } from '../../telephony-engine.module';
import { PipelineIntegrationService } from '../../services/pipeline-integration.service';
import { TelephonyManagerService } from '../../services/telephony-manager.service';
import { CallState } from '../../enums/call-state.enum';

describe('Call Flow Integration Tests', () => {
  let module: TestingModule;
  let pipelineIntegration: PipelineIntegrationService;
  let telephonyManager: TelephonyManagerService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        EventEmitterModule.forRoot(),
        TelephonyEngineModule,
      ],
    }).compile();

    pipelineIntegration = module.get<PipelineIntegrationService>(
      PipelineIntegrationService,
    );
    telephonyManager = module.get<TelephonyManagerService>(TelephonyManagerService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Complete Call Flow', () => {
    it('should handle complete outbound call lifecycle', async () => {
      // Skip if Twilio credentials not configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('Skipping integration test - Twilio credentials not configured');
        return;
      }

      const events: any[] = [];

      // Listen to all pipeline events
      const eventTypes = [
        'pipeline.call.initiated',
        'pipeline.call.dialing',
        'pipeline.call.ringing',
        'pipeline.call.answered',
        'pipeline.call.completed',
      ];

      // Note: This is a conceptual test - actual implementation would require
      // event listener setup and proper cleanup

      // Step 1: Initiate call
      const callRequest = {
        contactId: 'test_contact_123',
        campaignId: 'test_campaign_456',
        phoneNumber: process.env.TEST_PHONE_NUMBER || '+1234567890',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '+0987654321',
        callbackUrl: `${process.env.API_BASE_URL}/webhooks/telephony/twilio/voice`,
        statusCallbackUrl: `${process.env.API_BASE_URL}/webhooks/telephony/twilio/status`,
        metadata: {
          test: true,
          executionId: 'test_exec_789',
        },
      };

      const callResult = await pipelineIntegration.initiateCallFromPipeline(
        callRequest,
      );

      expect(callResult).toHaveProperty('callSid');
      expect(callResult.contactId).toBe('test_contact_123');
      expect(callResult.campaignId).toBe('test_campaign_456');

      // Step 2: Verify call metadata is stored
      const metadata = pipelineIntegration.getCallMetadata(callResult.callSid);
      expect(metadata).not.toBeNull();
      expect(metadata?.contactId).toBe('test_contact_123');

      // Step 3: Get call status
      const status = await telephonyManager.getCallStatus(callResult.callSid);
      expect(status).toHaveProperty('callSid');
      expect(status.callSid).toBe(callResult.callSid);

      // Step 4: Get call session
      const session = await telephonyManager.getCallSession(callResult.callSid);
      expect(session).toHaveProperty('callSid');

      // Step 5: End call (for testing purposes)
      const hangupResult = await pipelineIntegration.endCallFromPipeline(
        callResult.callSid,
      );
      expect(hangupResult).toBe(true);

      // Step 6: Verify final status
      const finalStatus = await telephonyManager.getCallStatus(callResult.callSid);
      expect([CallState.COMPLETED, CallState.CANCELLED]).toContain(
        finalStatus.status,
      );
    }, 30000); // 30 second timeout for integration test
  });

  describe('Call with Recording', () => {
    it('should handle call with recording', async () => {
      // Skip if credentials not configured
      if (!process.env.TWILIO_ACCOUNT_SID) {
        return;
      }

      const callRequest = {
        contactId: 'test_contact_recording',
        campaignId: 'test_campaign_recording',
        phoneNumber: process.env.TEST_PHONE_NUMBER || '+1234567890',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '+0987654321',
        callbackUrl: `${process.env.API_BASE_URL}/webhooks/telephony/twilio/voice`,
        recordingCallbackUrl: `${process.env.API_BASE_URL}/webhooks/telephony/twilio/recording`,
        metadata: {
          test: true,
          recordingTest: true,
        },
      };

      const result = await pipelineIntegration.initiateCallFromPipeline(callRequest);

      expect(result).toHaveProperty('callSid');

      // In a real scenario, we would:
      // 1. Wait for call to complete
      // 2. Wait for recording webhook
      // 3. Download recording
      // 4. Verify recording exists

      // Cleanup
      await pipelineIntegration.endCallFromPipeline(result.callSid);
    }, 30000);
  });

  describe('Provider Health Check', () => {
    it('should verify provider is healthy', async () => {
      const health = await telephonyManager.healthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('provider');
      expect(health).toHaveProperty('activeCalls');
      expect(health).toHaveProperty('timestamp');
    });
  });

  describe('Statistics', () => {
    it('should get telephony statistics', async () => {
      const stats = await telephonyManager.getStatistics();

      expect(stats).toHaveProperty('sessions');
      expect(stats).toHaveProperty('recordings');
      expect(stats).toHaveProperty('outbound');
      expect(stats).toHaveProperty('inbound');
      expect(stats).toHaveProperty('provider');
    });

    it('should get pipeline statistics', async () => {
      const stats = await pipelineIntegration.getPipelineStatistics();

      expect(stats).toHaveProperty('activeCalls');
      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('provider');
      expect(stats).toHaveProperty('healthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid phone number', async () => {
      const callRequest = {
        contactId: 'test_contact_invalid',
        campaignId: 'test_campaign_invalid',
        phoneNumber: 'invalid-number',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '+0987654321',
        callbackUrl: `${process.env.API_BASE_URL}/webhooks/telephony/twilio/voice`,
      };

      await expect(
        pipelineIntegration.initiateCallFromPipeline(callRequest),
      ).rejects.toThrow();
    });

    it('should handle call to non-existent call SID', async () => {
      await expect(
        telephonyManager.getCallStatus('CA_nonexistent'),
      ).rejects.toThrow();
    });
  });
});
