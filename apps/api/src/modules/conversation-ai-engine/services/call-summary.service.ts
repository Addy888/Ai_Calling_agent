/**
 * Call Summary Service
 * Generates comprehensive summaries of conversations
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OllamaLLMService } from './ollama-llm.service';

interface CallSummary {
  sessionId: string;
  summary: string;
  intent: string;
  leadScore: number;
  overallEmotion: string;
  keyPoints: string[];
  actionItems: string[];
  interested: boolean;
  callbackRequired: boolean;
  followUp?: string;
}

@Injectable()
export class CallSummaryService {
  private readonly logger = new Logger(CallSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ollamaService: OllamaLLMService,
  ) {}

  async generateSummary(sessionId: string): Promise<CallSummary> {
    this.logger.log(`Generating summary for session ${sessionId}`);

    try {
      // Get all messages from the conversation
      const messages = await this.prisma.conversationMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          content: true,
          intent: true,
          emotion: true,
        },
      });

      if (messages.length === 0) {
        return this.getEmptySummary(sessionId);
      }

      // Build conversation transcript
      const transcript = messages
        .map(m => `${m.role === 'CUSTOMER' ? 'Customer' : 'AI'}: ${m.content}`)
        .join('\n');

      // Generate summary using LLM
      const summaryPrompt = `Analyze the following sales call conversation and provide a comprehensive summary.

Conversation:
${transcript}

Please provide:
1. A brief summary (2-3 sentences)
2. The customer's primary intent
3. Lead score (0-100)
4. Overall customer emotion
5. Key points discussed (bullet points)
6. Action items needed (bullet points)
7. Whether customer showed interest (true/false)
8. Whether a callback is required (true/false)
9. Follow-up recommendations

Respond in JSON format:
{
  "summary": "...",
  "intent": "...",
  "leadScore": 0-100,
  "overallEmotion": "...",
  "keyPoints": ["...", "..."],
  "actionItems": ["...", "..."],
  "interested": true/false,
  "callbackRequired": true/false,
  "followUp": "..."
}`;

      const llmResponse = await this.ollamaService.generate({
        prompt: summaryPrompt,
        temperature: 0.3, // Lower temperature for more consistent output
        maxTokens: 1000,
      });

      // Parse JSON response
      const summary = this.parseSummaryResponse(llmResponse.text);

      // Save to database
      await this.saveSummary(sessionId, summary);

      return {
        sessionId,
        ...summary,
      };
    } catch (error) {
      this.logger.error(`Failed to generate summary: ${error.message}`, error.stack);
      return this.getEmptySummary(sessionId);
    }
  }

  private parseSummaryResponse(text: string): Omit<CallSummary, 'sessionId'> {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'No summary available',
          intent: parsed.intent || 'UNKNOWN',
          leadScore: Math.min(100, Math.max(0, parsed.leadScore || 50)),
          overallEmotion: parsed.overallEmotion || 'neutral',
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          interested: parsed.interested === true,
          callbackRequired: parsed.callbackRequired === true,
          followUp: parsed.followUp || undefined,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to parse summary response: ${error.message}`);
    }

    // Return default summary if parsing fails
    return {
      summary: 'Conversation completed',
      intent: 'UNKNOWN',
      leadScore: 50,
      overallEmotion: 'neutral',
      keyPoints: [],
      actionItems: [],
      interested: false,
      callbackRequired: false,
    };
  }

  private async saveSummary(sessionId: string, summary: Omit<CallSummary, 'sessionId'>) {
    try {
      await this.prisma.conversationSession.update({
        where: { sessionId },
        data: {
          summaryText: summary.summary,
          intent: summary.intent,
          leadScore: summary.leadScore,
          emotion: summary.overallEmotion,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save summary: ${error.message}`);
    }
  }

  async getCallSummary(sessionId: string): Promise<CallSummary | null> {
    try {
      const session = await this.prisma.conversationSession.findUnique({
        where: { sessionId },
        select: {
          sessionId: true,
          summaryText: true,
          intent: true,
          leadScore: true,
          emotion: true,
        },
      });

      if (!session) return null;

      return {
        sessionId: session.sessionId,
        summary: session.summaryText || 'No summary available',
        intent: session.intent || 'UNKNOWN',
        leadScore: session.leadScore || 0,
        overallEmotion: session.emotion || 'neutral',
        keyPoints: [],
        actionItems: [],
        interested: (session.leadScore || 0) > 70,
        callbackRequired: false,
      };
    } catch (error) {
      this.logger.error(`Failed to get call summary: ${error.message}`);
      return null;
    }
  }

  private getEmptySummary(sessionId: string): CallSummary {
    return {
      sessionId,
      summary: 'No conversation data available',
      intent: 'UNKNOWN',
      leadScore: 0,
      overallEmotion: 'neutral',
      keyPoints: [],
      actionItems: [],
      interested: false,
      callbackRequired: false,
    };
  }
}
