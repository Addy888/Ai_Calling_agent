/**
 * Fallback Manager Service
 * Provides fallback responses when AI generation fails or produces invalid responses
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConversationSessionService } from './conversation-session.service';

@Injectable()
export class FallbackManagerService {
  private readonly logger = new Logger(FallbackManagerService.name);

  constructor(private readonly sessionService: ConversationSessionService) {}

  /**
   * Get fallback greeting
   */
  async getFallbackGreeting(sessionId: string): Promise<string> {
    try {
      const session = await this.sessionService.getSession(sessionId);
      const customerName = session.customerName
        ? session.customerName.split(' ')[0]
        : 'there';

      const greetings = [
        `Hello ${customerName}! Thank you for taking my call. How are you doing today?`,
        `Hi ${customerName}! This is a courtesy call. Do you have a moment to talk?`,
        `Good day ${customerName}! I hope I'm not catching you at a bad time.`,
        `Hello ${customerName}! I wanted to reach out to you today. Is now a good time?`,
      ];

      return this.selectRandom(greetings);
    } catch (error) {
      this.logger.error(`Error generating fallback greeting: ${error.message}`);
      return 'Hello! Thank you for taking my call. Do you have a moment to talk?';
    }
  }

  /**
   * Get fallback response for normal conversation
   */
  async getFallbackResponse(
    sessionId: string,
    customerMessage: string,
    reason?: string,
  ): Promise<string> {
    this.logger.warn(
      `Using fallback response for session ${sessionId}, reason: ${reason}`,
    );

    try {
      const session = await this.sessionService.getSession(sessionId);

      // Check if we should search knowledge base
      if (this.isInformationRequest(customerMessage)) {
        return this.getFallbackInformationResponse();
      }

      // Check for yes/no questions
      if (this.isYesNoQuestion(customerMessage)) {
        return this.getFallbackConfirmationResponse();
      }

      // Check for objections
      if (this.isObjection(customerMessage)) {
        return this.getFallbackObjectionResponse();
      }

      // Generic fallback
      return this.getGenericFallback();
    } catch (error) {
      this.logger.error(`Error generating fallback response: ${error.message}`);
      return this.getGenericFallback();
    }
  }

  /**
   * Get fallback for information requests
   */
  private getFallbackInformationResponse(): string {
    const responses = [
      "That's a great question. Let me get you the specific information you need. Could you hold for just a moment?",
      "I want to make sure I give you accurate information. Let me check that for you.",
      "That's an important detail. I'd like to connect you with someone who can provide the exact information you're looking for.",
      "I appreciate your question. Let me find the most up-to-date information for you.",
    ];

    return this.selectRandom(responses);
  }

  /**
   * Get fallback for confirmation requests
   */
  private getFallbackConfirmationResponse(): string {
    const responses = [
      "I want to make sure I understand correctly. Could you clarify that for me?",
      "Just to confirm, could you repeat that?",
      "I want to be certain I have this right. Could you say that again?",
    ];

    return this.selectRandom(responses);
  }

  /**
   * Get fallback for objections
   */
  private getFallbackObjectionResponse(): string {
    const responses = [
      "I completely understand your concern. Many people feel the same way initially.",
      "That's a fair point. Let me address that for you.",
      "I appreciate your honesty. That's actually a common question.",
      "I understand. Let me see if I can provide some clarity on that.",
    ];

    return this.selectRandom(responses);
  }

  /**
   * Get generic fallback
   */
  private getGenericFallback(): string {
    const responses = [
      "I apologize, I didn't quite catch that. Could you please repeat?",
      "I'm sorry, could you say that again? I want to make sure I understand.",
      "Could you please rephrase that? I want to give you the best response.",
      "I apologize for the confusion. Could you clarify what you meant?",
    ];

    return this.selectRandom(responses);
  }

  /**
   * Get error fallback (when system error occurs)
   */
  async getErrorFallback(sessionId: string): Promise<string> {
    const responses = [
      "I apologize, I'm experiencing a technical difficulty. Could you please hold for just a moment?",
      "I'm sorry, there seems to be a connection issue on my end. Bear with me for just a second.",
      "I apologize for the interruption. Let me reconnect with you in just a moment.",
    ];

    return this.selectRandom(responses);
  }

  /**
   * Get fallback goodbye
   */
  async getFallbackGoodbye(sessionId: string): Promise<string> {
    try {
      const session = await this.sessionService.getSession(sessionId);
      const customerName = session.customerName
        ? session.customerName.split(' ')[0]
        : '';

      const goodbyes = [
        `Thank you for your time${customerName ? ', ' + customerName : ''}. Have a wonderful day!`,
        `I appreciate you speaking with me${customerName ? ', ' + customerName : ''}. Take care!`,
        `Thanks for the conversation${customerName ? ', ' + customerName : ''}. Have a great rest of your day!`,
        `It was nice talking to you${customerName ? ', ' + customerName : ''}. Goodbye!`,
      ];

      return this.selectRandom(goodbyes);
    } catch (error) {
      this.logger.error(`Error generating fallback goodbye: ${error.message}`);
      return 'Thank you for your time. Have a great day!';
    }
  }

  /**
   * Get fallback for silence
   */
  async getSilenceFallback(silenceCount: number): Promise<string> {
    if (silenceCount === 1) {
      return "Hello? Are you still there? I'd love to continue our conversation.";
    } else if (silenceCount === 2) {
      return "I haven't heard from you. Is everything alright? Should I call back at a better time?";
    } else {
      return "I'll let you go for now. Feel free to reach out if you have any questions. Have a great day!";
    }
  }

  /**
   * Get fallback for busy customer
   */
  async getBusyFallback(): Promise<string> {
    const responses = [
      "I completely understand. When would be a better time for me to call you back?",
      "No problem at all. What time works better for you?",
      "I appreciate your time. Should I give you a call back later today?",
      "That's perfectly fine. Would tomorrow be more convenient?",
    ];

    return this.selectRandom(responses);
  }

  /**
   * Get fallback for not interested
   */
  async getNotInterestedFallback(): Promise<string> {
    const responses = [
      "I understand, and I appreciate your time. Thank you for being direct. Have a great day!",
      "No problem at all. Thank you for letting me know. Have a wonderful day!",
      "I completely understand. Thanks for your time, and have a great rest of your day!",
      "That's perfectly fine. I appreciate you taking my call. Take care!",
    ];

    return this.selectRandom(responses);
  }

  /**
   * Get fallback for wrong number
   */
  async getWrongNumberFallback(): Promise<string> {
    const responses = [
      "I apologize for the inconvenience. I must have dialed the wrong number. Sorry to bother you!",
      "I'm sorry about that. It seems I've reached the wrong person. Have a great day!",
      "My apologies for the confusion. I'll make sure to update our records. Sorry for disturbing you!",
    ];

    return this.selectRandom(responses);
  }

  // Helper methods

  /**
   * Check if message is an information request
   */
  private isInformationRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const keywords = [
      'what',
      'how',
      'when',
      'where',
      'why',
      'tell me',
      'explain',
      'information',
      'details',
    ];

    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if message is a yes/no question
   */
  private isYesNoQuestion(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('?') &&
      (lowerMessage.includes('can') ||
        lowerMessage.includes('could') ||
        lowerMessage.includes('would') ||
        lowerMessage.includes('is') ||
        lowerMessage.includes('are') ||
        lowerMessage.includes('do') ||
        lowerMessage.includes('does'))
    );
  }

  /**
   * Check if message is an objection
   */
  private isObjection(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const objectionKeywords = [
      'not interested',
      "don't want",
      "don't need",
      'too expensive',
      'no money',
      'no time',
      'not now',
    ];

    return objectionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Select random item from array
   */
  private selectRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
