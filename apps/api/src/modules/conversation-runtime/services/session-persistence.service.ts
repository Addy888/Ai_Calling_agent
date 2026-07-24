/**
 * Session Persistence Service
 * Persists conversation sessions to database for analytics and record-keeping
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationSessionService } from './conversation-session.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationEvent } from '../enums/conversation-state.enum';

@Injectable()
export class SessionPersistenceService {
  private readonly logger = new Logger(SessionPersistenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: ConversationSessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Persist session to database
   */
  async persistSession(sessionId: string): Promise<void> {
    this.logger.log(`Persisting session: ${sessionId}`);

    try {
      const session = await this.sessionService.getSession(sessionId);

      // Save conversation transcript
      await this.saveTranscript(session);

      // Update call record with conversation data
      await this.updateCallRecord(session);

      // Save conversation analytics
      await this.saveAnalytics(session);

      // Emit event
      this.eventEmitter.emit(ConversationEvent.TRANSCRIPT_SAVED, {
        sessionId,
        callId: session.callId,
        timestamp: new Date(),
      });

      this.logger.log(`Session persisted successfully: ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to persist session ${sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Save conversation transcript
   */
  private async saveTranscript(session: any): Promise<void> {
    try {
      // Build full transcript content
      const transcriptContent = session.conversationHistory
        .map((msg: any) => {
          const speaker = msg.speaker === 'customer' ? 'Customer' : 'AI Agent';
          const intent = msg.intent ? ` [Intent: ${msg.intent}]` : '';
          return `[${msg.timestamp.toISOString()}] ${speaker}${intent}: ${msg.content}`;
        })
        .join('\n\n');

      // Upsert to database — CallTranscript is unique per callId
      await this.prisma.callTranscript.upsert({
        where: { callId: session.callId },
        update: {
          content: transcriptContent,
          metadata: {
            sessionId: session.sessionId,
            turnCount: session.turnCount,
            duration: session.duration,
            detectedIntents: session.detectedIntents,
            silenceCount: session.silenceCount,
            endReason: session.endReason,
          },
        },
        create: {
          callId: session.callId,
          content: transcriptContent,
          metadata: {
            sessionId: session.sessionId,
            turnCount: session.turnCount,
            duration: session.duration,
            detectedIntents: session.detectedIntents,
            silenceCount: session.silenceCount,
            endReason: session.endReason,
          },
        },
      });

      this.logger.debug(
        `Transcript saved for session: ${session.sessionId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to save transcript: ${error.message}`);
      // Don't throw - this shouldn't break the main flow
    }
  }

  /**
   * Update call record with conversation data
   */
  private async updateCallRecord(session: any): Promise<void> {
    try {
      await this.prisma.call.update({
        where: { id: session.callId },
        data: {
          duration: session.duration,
          endTime: session.endedAt,
          status: session.state.toUpperCase(),
          metadata: {
            conversationMetadata: {
              sessionId: session.sessionId,
              turnCount: session.turnCount,
              customerMessageCount: session.customerMessageCount,
              aiMessageCount: session.aiMessageCount,
              detectedIntents: session.detectedIntents,
              silenceCount: session.silenceCount,
              endReason: session.endReason,
            },
          },
        },
      });

      this.logger.debug(`Call record updated for: ${session.callId}`);
    } catch (error) {
      this.logger.error(`Failed to update call record: ${error.message}`);
    }
  }

  /**
   * Save conversation analytics
   */
  private async saveAnalytics(session: any): Promise<void> {
    try {
      const stats = await this.sessionService.getSessionStatistics(
        session.sessionId,
      );

      // Calculate additional metrics
      const successRate =
        session.detectedIntents.includes('interested') ||
        session.detectedIntents.includes('positive_response')
          ? 1.0
          : 0.0;

      const outcome = this.determineOutcome(session);
      const sentiment = this.determineSentiment(session);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Save analytics rows — one row per key metric
      await this.prisma.analytics.createMany({
        data: [
          {
            companyId: session.companyId || 'unknown',
            date: today,
            metric: 'call_outcome',
            category: 'conversation',
            value: successRate,
            dimension1: session.callId,
            dimension2: outcome,
            dimension3: sentiment,
            metadata: {
              sessionId: session.sessionId,
              campaignId: session.campaignId,
              contactId: session.contactId,
              turnCount: stats.turnCount,
              averageResponseTime: stats.averageResponseTime,
              detectedIntents: session.detectedIntents,
              endReason: session.endReason,
            },
          },
          {
            companyId: session.companyId || 'unknown',
            date: today,
            metric: 'call_duration',
            category: 'conversation',
            value: session.duration || 0,
            dimension1: session.callId,
            dimension2: session.campaignId,
            dimension3: session.contactId,
          },
        ],
      });

      this.logger.debug(`Analytics saved for session: ${session.sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to save analytics: ${error.message}`);
    }
  }

  /**
   * Determine conversation outcome
   */
  private determineOutcome(session: any): string {
    if (session.detectedIntents.includes('interested')) {
      return 'INTERESTED';
    } else if (session.detectedIntents.includes('not_interested')) {
      return 'NOT_INTERESTED';
    } else if (session.detectedIntents.includes('call_later')) {
      return 'CALLBACK_REQUESTED';
    } else if (session.detectedIntents.includes('busy')) {
      return 'BUSY';
    } else if (session.detectedIntents.includes('wrong_number')) {
      return 'WRONG_NUMBER';
    } else {
      return 'COMPLETED';
    }
  }

  /**
   * Determine conversation sentiment
   */
  private determineSentiment(session: any): string {
    const positiveIntents = [
      'interested',
      'positive_response',
      'affirmation',
    ];
    const negativeIntents = [
      'not_interested',
      'negative_response',
      'complaint',
      'denial',
    ];

    const hasPositive = session.detectedIntents.some((intent: string) =>
      positiveIntents.includes(intent),
    );
    const hasNegative = session.detectedIntents.some((intent: string) =>
      negativeIntents.includes(intent),
    );

    if (hasPositive && !hasNegative) {
      return 'POSITIVE';
    } else if (hasNegative && !hasPositive) {
      return 'NEGATIVE';
    } else if (hasPositive && hasNegative) {
      return 'MIXED';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Load persisted session (for recovery or review)
   */
  async loadSession(sessionId: string): Promise<any> {
    this.logger.log(`Loading persisted session: ${sessionId}`);

    try {
      // Load transcript by callId stored in metadata (search via session's callId)
      const transcript = await this.prisma.callTranscript.findFirst({
        where: {
          metadata: {
            path: 'sessionId',
            equals: sessionId,
          } as any,
        },
      });

      if (!transcript) {
        throw new Error(`No persisted session found: ${sessionId}`);
      }

      // Load analytics from analytics table (dimension1 = callId)
      const analytics = await this.prisma.analytics.findFirst({
        where: {
          dimension1: transcript.callId,
          metric: 'call_outcome',
        },
      });

      return {
        transcript,
        entries: [], // Individual entries are embedded in transcript content
        analytics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to load persisted session: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get transcript by call ID
   */
  async getTranscriptByCallId(callId: string): Promise<any> {
    try {
      const transcript = await this.prisma.callTranscript.findFirst({
        where: { callId },
      });

      return {
        transcript,
        entries: [], // Entries are embedded in the transcript content field
      };
    } catch (error) {
      this.logger.error(`Failed to get transcript: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get analytics by call ID
   */
  async getAnalyticsByCallId(callId: string): Promise<any> {
    try {
      return await this.prisma.analytics.findFirst({
        where: {
          dimension1: callId,
          metric: 'call_outcome',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get analytics: ${error.message}`);
      throw error;
    }
  }
}
