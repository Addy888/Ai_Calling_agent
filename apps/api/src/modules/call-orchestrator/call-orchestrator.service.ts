import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TelephonyService } from '../telephony/telephony.service';
import { ConversationEngineService } from '../conversation-engine/conversation-engine.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Call Orchestrator Service
 * Orchestrates the complete call lifecycle
 */
@Injectable()
export class CallOrchestratorService {
  private readonly logger = new Logger(CallOrchestratorService.name);
  private activeCalls: Map<string, CallSession> = new Map();
  private readonly storageBasePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telephony: TelephonyService,
    private readonly conversationEngine: ConversationEngineService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.storageBasePath = process.env.STORAGE_PATH || './storage';
    this.ensureStorageDirectories();
  }

  /**
   * Initiate a call
   */
  async initiateCall(params: {
    campaignId: string;
    contactId: string;
    companyId: string;
    scriptContent?: string;
    voiceId?: string;
    metadata?: Record<string, any>;
  }): Promise<{ callId: string; status: string }> {
    this.logger.log(`Initiating call for contact: ${params.contactId}`);

    try {
      // Fetch contact details
      const contact = await this.prisma.contact.findUnique({
        where: { id: params.contactId },
      });

      if (!contact) {
        throw new Error(`Contact not found: ${params.contactId}`);
      }

      // Fetch campaign details
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: params.campaignId },
        include: {
          script: true,
          voice: true,
        },
      });

      // Create call record
      const call = await this.prisma.call.create({
        data: {
          campaignId: params.campaignId,
          contactId: params.contactId,
          status: 'QUEUED',
          metadata: params.metadata || {},
        },
      });

      // Prepare call session
      const session: CallSession = {
        callId: call.id,
        campaignId: params.campaignId,
        contactId: params.contactId,
        companyId: params.companyId,
        contact,
        scriptContent: params.scriptContent || campaign?.script?.content,
        voiceId: params.voiceId || campaign?.voiceId,
        conversationHistory: [],
        status: 'QUEUED',
        startTime: new Date(),
        metadata: params.metadata || {},
      };

      this.activeCalls.set(call.id, session);

      // Make telephony call
      const callbackUrl = `${process.env.API_BASE_URL}/api/v1/webhooks/twilio/call`;
      const statusCallback = `${process.env.API_BASE_URL}/api/v1/webhooks/twilio/status`;

      const result = await this.telephony.makeCall({
        to: contact.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        callbackUrl,
        statusCallback,
        record: true,
        recordingStatusCallback: `${process.env.API_BASE_URL}/api/v1/webhooks/twilio/recording`,
        metadata: {
          callId: call.id,
          campaignId: params.campaignId,
          contactId: params.contactId,
        },
      });

      // Update session with call SID
      session.callSid = result.callSid;
      session.status = 'CALLING';

      // Update call record
      await this.prisma.call.update({
        where: { id: call.id },
        data: {
          status: 'CALLING',
          metadata: {
            ...session.metadata,
            callSid: result.callSid,
          },
        },
      });

      this.eventEmitter.emit('call.initiated', {
        callId: call.id,
        contactId: params.contactId,
        campaignId: params.campaignId,
      });

      this.logger.log(`Call initiated: ${call.id}, SID: ${result.callSid}`);

      return {
        callId: call.id,
        status: 'CALLING',
      };
    } catch (error) {
      this.logger.error(`Failed to initiate call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle call connected
   */
  async handleCallConnected(callId: string): Promise<void> {
    this.logger.log(`Call connected: ${callId}`);

    const session = this.activeCalls.get(callId);
    if (!session) {
      this.logger.warn(`Session not found for call: ${callId}`);
      return;
    }

    session.status = 'IN_PROGRESS';
    session.connectedTime = new Date();

    // Update call record
    await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: 'IN_PROGRESS',
        startTime: session.connectedTime,
      },
    });

    // Generate and play greeting
    try {
      const greeting = await this.conversationEngine.generateGreeting({
        script: session.scriptContent,
        contactName: session.contact.firstName,
        voiceId: session.voiceId,
      });

      session.conversationHistory.push({
        role: 'assistant',
        content: greeting.text,
      });

      // In real implementation, we would send the audio to the call
      this.logger.log(`Greeting generated: ${greeting.text}`);

      this.eventEmitter.emit('call.connected', {
        callId,
        greeting: greeting.text,
      });
    } catch (error) {
      this.logger.error(`Failed to generate greeting: ${error.message}`);
    }
  }

  /**
   * Handle customer speech
   */
  async handleCustomerSpeech(
    callId: string,
    audioBuffer: Buffer,
  ): Promise<{
    transcript: string;
    response: string;
    audio: Buffer;
  }> {
    this.logger.log(`Processing customer speech for call: ${callId}`);

    const session = this.activeCalls.get(callId);
    if (!session) {
      throw new Error(`Session not found for call: ${callId}`);
    }

    try {
      const result = await this.conversationEngine.processConversation({
        audioBuffer,
        conversationHistory: session.conversationHistory,
        script: session.scriptContent,
        voiceId: session.voiceId,
        context: {
          contactName: session.contact.firstName,
          language: session.contact.language,
        },
      });

      // Update conversation history
      session.conversationHistory.push({
        role: 'user',
        content: result.transcript,
      });

      session.conversationHistory.push({
        role: 'assistant',
        content: result.response,
      });

      this.eventEmitter.emit('call.message', {
        callId,
        transcript: result.transcript,
        response: result.response,
      });

      return {
        transcript: result.transcript,
        response: result.response,
        audio: result.audio,
      };
    } catch (error) {
      this.logger.error(`Failed to process customer speech: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle call ended
   */
  async handleCallEnded(
    callId: string,
    duration: number,
    recordingUrl?: string,
  ): Promise<void> {
    this.logger.log(`Call ended: ${callId}`);

    const session = this.activeCalls.get(callId);
    if (!session) {
      this.logger.warn(`Session not found for call: ${callId}`);
      return;
    }

    session.status = 'COMPLETED';
    session.endTime = new Date();
    session.duration = duration;

    try {
      // Generate full transcript
      const transcript = this.generateTranscript(session.conversationHistory);

      // Save transcript to database
      await this.prisma.callTranscript.create({
        data: {
          callId,
          content: transcript,
          metadata: {
            messageCount: session.conversationHistory.length,
            duration,
          },
        },
      });

      // Save transcript to file
      await this.saveTranscriptFile(callId, transcript);

      // Handle recording
      if (recordingUrl) {
        await this.handleRecording(callId, recordingUrl);
      }

      // Update call record
      await this.prisma.call.update({
        where: { id: callId },
        data: {
          status: 'COMPLETED',
          endTime: session.endTime,
          duration,
        },
      });

      // Analyze call
      const sentiment = await this.conversationEngine.analyzeSentiment(transcript);

      this.eventEmitter.emit('call.completed', {
        callId,
        duration,
        messageCount: session.conversationHistory.length,
        sentiment,
      });

      this.logger.log(`Call completed successfully: ${callId}`);
    } catch (error) {
      this.logger.error(`Error handling call end: ${error.message}`);
    } finally {
      // Clean up session
      this.activeCalls.delete(callId);
    }
  }

  /**
   * Handle call failed
   */
  async handleCallFailed(callId: string, reason: string): Promise<void> {
    this.logger.log(`Call failed: ${callId}, reason: ${reason}`);

    const session = this.activeCalls.get(callId);

    try {
      await this.prisma.call.update({
        where: { id: callId },
        data: {
          status: 'FAILED',
          metadata: {
            failureReason: reason,
          },
        },
      });

      this.eventEmitter.emit('call.failed', {
        callId,
        reason,
      });
    } catch (error) {
      this.logger.error(`Error handling call failure: ${error.message}`);
    } finally {
      if (session) {
        this.activeCalls.delete(callId);
      }
    }
  }

  /**
   * End a call
   */
  async endCall(callId: string): Promise<void> {
    this.logger.log(`Ending call: ${callId}`);

    const session = this.activeCalls.get(callId);
    if (!session || !session.callSid) {
      throw new Error(`Active session not found for call: ${callId}`);
    }

    await this.telephony.endCall(session.callSid);
  }

  /**
   * Get active calls
   */
  getActiveCalls(): Array<{
    callId: string;
    contactId: string;
    campaignId: string;
    status: string;
    duration: number;
  }> {
    return Array.from(this.activeCalls.values()).map(session => ({
      callId: session.callId,
      contactId: session.contactId,
      campaignId: session.campaignId,
      status: session.status,
      duration: session.connectedTime
        ? Date.now() - session.connectedTime.getTime()
        : 0,
    }));
  }

  /**
   * Get call session
   */
  getCallSession(callId: string): CallSession | undefined {
    return this.activeCalls.get(callId);
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private generateTranscript(
    history: Array<{ role: string; content: string }>,
  ): string {
    return history
      .map(msg => {
        const speaker = msg.role === 'user' ? 'Customer' : 'Agent';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n\n');
  }

  private async saveTranscriptFile(callId: string, transcript: string): Promise<void> {
    const transcriptPath = path.join(
      this.storageBasePath,
      'transcripts',
      `${callId}.txt`,
    );

    await fs.writeFile(transcriptPath, transcript, 'utf-8');
    this.logger.log(`Transcript saved: ${transcriptPath}`);
  }

  private async handleRecording(callId: string, recordingUrl: string): Promise<void> {
    this.logger.log(`Handling recording for call: ${callId}`);

    try {
      // Download recording
      const audioBuffer = await this.telephony.downloadRecording(recordingUrl);

      // Save recording to file
      const recordingPath = path.join(
        this.storageBasePath,
        'recordings',
        `${callId}.mp3`,
      );

      await fs.writeFile(recordingPath, audioBuffer);

      // Save recording metadata to database
      await this.prisma.callRecording.create({
        data: {
          callId,
          filePath: recordingPath,
          fileSize: audioBuffer.length,
          duration: 0, // Will be updated if available
          metadata: {
            recordingUrl,
          },
        },
      });

      this.logger.log(`Recording saved: ${recordingPath}`);
    } catch (error) {
      this.logger.error(`Failed to handle recording: ${error.message}`);
    }
  }

  private async ensureStorageDirectories(): Promise<void> {
    const directories = [
      path.join(this.storageBasePath, 'recordings'),
      path.join(this.storageBasePath, 'transcripts'),
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        this.logger.error(`Failed to create directory ${dir}: ${error.message}`);
      }
    }
  }
}

/**
 * Call Session Interface
 */
interface CallSession {
  callId: string;
  campaignId: string;
  contactId: string;
  companyId: string;
  callSid?: string;
  contact: any;
  scriptContent?: string;
  voiceId?: string;
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  status: string;
  startTime: Date;
  connectedTime?: Date;
  endTime?: Date;
  duration?: number;
  metadata: Record<string, any>;
}
