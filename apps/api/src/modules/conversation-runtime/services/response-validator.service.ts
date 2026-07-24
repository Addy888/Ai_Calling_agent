/**
 * Response Validator Service
 * Validates AI-generated responses before sending them to customers
 */

import { Injectable, Logger } from '@nestjs/common';
import { ResponseGenerationResult } from '../interfaces/conversation-session.interface';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  issues?: string[];
}

@Injectable()
export class ResponseValidatorService {
  private readonly logger = new Logger(ResponseValidatorService.name);

  // Validation configuration
  private readonly maxResponseLength = 500; // characters
  private readonly minResponseLength = 5;
  private readonly maxSentences = 5;

  // Forbidden patterns (adjust based on your requirements)
  private readonly forbiddenPatterns = [
    /\bAI\b/i,
    /\bartificial intelligence\b/i,
    /\bI('m| am) (a |an )?bot\b/i,
    /\bI('m| am) (a |an )?robot\b/i,
    /\bI('m| am) not (a )?human\b/i,
    /\b(sorry|apologize).*(malfunction|error|bug)\b/i,
    /\bsystem error\b/i,
    /\<.*?\>/g, // HTML tags
    /\[.*?\]/g, // Stage directions
  ];

  // Warning patterns (log but don't fail)
  private readonly warningPatterns = [
    /\bum+\b/i,
    /\buh+\b/i,
    /\.{3,}/g, // Multiple ellipsis
    /\?{2,}/g, // Multiple question marks
    /!{2,}/g, // Multiple exclamation marks
  ];

  /**
   * Validate response before sending
   */
  async validateResponse(
    response: ResponseGenerationResult,
    sessionId: string,
  ): Promise<ValidationResult> {
    const issues: string[] = [];

    // Check if response generation was successful
    if (!response.success) {
      return {
        isValid: false,
        reason: 'Response generation failed',
        issues: [response.error || 'Unknown error'],
      };
    }

    const text = response.response.trim();

    // Check if response is empty
    if (!text || text.length === 0) {
      return {
        isValid: false,
        reason: 'Response is empty',
        issues: ['Empty response'],
      };
    }

    // Check minimum length
    if (text.length < this.minResponseLength) {
      issues.push(`Response too short (${text.length} characters)`);
    }

    // Check maximum length
    if (text.length > this.maxResponseLength) {
      issues.push(`Response too long (${text.length} characters)`);
    }

    // Check sentence count
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > this.maxSentences) {
      issues.push(`Too many sentences (${sentences.length})`);
    }

    // Check for forbidden patterns
    for (const pattern of this.forbiddenPatterns) {
      if (pattern.test(text)) {
        issues.push(`Contains forbidden pattern: ${pattern.source}`);
      }
    }

    // Check for incomplete sentences
    if (!this.endsWithProperPunctuation(text)) {
      issues.push('Response does not end with proper punctuation');
    }

    // Check for multiple consecutive spaces
    if (/\s{2,}/.test(text)) {
      issues.push('Contains multiple consecutive spaces');
    }

    // Check for warning patterns (log but don't fail)
    for (const pattern of this.warningPatterns) {
      if (pattern.test(text)) {
        this.logger.warn(
          `Response contains warning pattern: ${pattern.source} in session ${sessionId}`,
        );
      }
    }

    // Check confidence score
    if (response.confidence < 0.3) {
      issues.push(`Low confidence score (${response.confidence})`);
    }

    // Validate coherence (basic check)
    if (!this.isCoherent(text)) {
      issues.push('Response appears incoherent');
    }

    // Check for profanity or inappropriate content
    if (this.containsInappropriateContent(text)) {
      return {
        isValid: false,
        reason: 'Response contains inappropriate content',
        issues: ['Inappropriate content detected'],
      };
    }

    // Determine if valid
    const isValid = issues.length === 0;

    if (!isValid) {
      this.logger.warn(
        `Response validation failed for session ${sessionId}: ${issues.join(', ')}`,
      );
    }

    return {
      isValid,
      reason: issues.length > 0 ? issues[0] : undefined,
      issues,
    };
  }

  /**
   * Sanitize response (clean up minor issues)
   */
  sanitizeResponse(text: string): string {
    let sanitized = text;

    // Remove HTML tags
    sanitized = sanitized.replace(/\<.*?\>/g, '');

    // Remove stage directions [like this]
    sanitized = sanitized.replace(/\[.*?\]/g, '');

    // Remove action descriptions (Action: ...)
    sanitized = sanitized.replace(/\(.*?\)/g, '');

    // Remove multiple consecutive spaces
    sanitized = sanitized.replace(/\s{2,}/g, ' ');

    // Remove multiple ellipsis
    sanitized = sanitized.replace(/\.{4,}/g, '...');

    // Remove multiple question marks
    sanitized = sanitized.replace(/\?{2,}/g, '?');

    // Remove multiple exclamation marks
    sanitized = sanitized.replace(/!{2,}/g, '!');

    // Trim
    sanitized = sanitized.trim();

    // Ensure proper sentence ending if missing
    if (!this.endsWithProperPunctuation(sanitized)) {
      sanitized += '.';
    }

    return sanitized;
  }

  /**
   * Check if text ends with proper punctuation
   */
  private endsWithProperPunctuation(text: string): boolean {
    return /[.!?]$/.test(text.trim());
  }

  /**
   * Check if response is coherent (basic heuristic)
   */
  private isCoherent(text: string): boolean {
    // Check for very short responses with no context
    if (text.length < 10 && !/^(yes|no|okay|sure|thanks)$/i.test(text)) {
      return false;
    }

    // Check for gibberish (too many consonants in a row)
    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(text)) {
      return false;
    }

    // Check for repeated characters
    if (/(.)\1{5,}/.test(text)) {
      return false;
    }

    return true;
  }

  /**
   * Check for inappropriate content
   */
  private containsInappropriateContent(text: string): boolean {
    // Basic profanity filter
    const profanityPatterns = [
      // Add your profanity patterns here
      // This is a placeholder - implement based on your requirements
    ];

    for (const pattern of profanityPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate greeting specifically
   */
  async validateGreeting(
    response: ResponseGenerationResult,
    sessionId: string,
  ): Promise<ValidationResult> {
    const validation = await this.validateResponse(response, sessionId);

    if (!validation.isValid) {
      return validation;
    }

    const text = response.response.toLowerCase();

    // Greeting should contain greeting words
    const greetingWords = ['hello', 'hi', 'good morning', 'good afternoon', 'good evening'];
    const containsGreeting = greetingWords.some(word => text.includes(word));

    if (!containsGreeting) {
      return {
        isValid: false,
        reason: 'Greeting does not contain appropriate greeting words',
        issues: ['Missing greeting words'],
      };
    }

    return validation;
  }

  /**
   * Validate goodbye specifically
   */
  async validateGoodbye(
    response: ResponseGenerationResult,
    sessionId: string,
  ): Promise<ValidationResult> {
    const validation = await this.validateResponse(response, sessionId);

    if (!validation.isValid) {
      return validation;
    }

    const text = response.response.toLowerCase();

    // Goodbye should contain closing words
    const closingWords = ['goodbye', 'bye', 'thank you', 'thanks', 'take care', 'have a'];
    const containsClosing = closingWords.some(word => text.includes(word));

    if (!containsClosing) {
      return {
        isValid: false,
        reason: 'Goodbye does not contain appropriate closing words',
        issues: ['Missing closing words'],
      };
    }

    return validation;
  }
}
