/**
 * Response Generation Service
 * Validates and enhances AI responses for natural conversation
 */

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ResponseGenerationService {
  private readonly logger = new Logger(ResponseGenerationService.name);

  async validateAndEnhance(response: string, context: {
    intent?: any;
    emotion?: string;
  }): Promise<string> {
    try {
      let validatedResponse = response;

      // Remove any markdown formatting
      validatedResponse = this.removeMarkdown(validatedResponse);

      // Remove JSON artifacts if present
      validatedResponse = this.removeJSONArtifacts(validatedResponse);

      // Trim whitespace
      validatedResponse = validatedResponse.trim();

      // Ensure proper punctuation
      validatedResponse = this.ensureProperPunctuation(validatedResponse);

      // Ensure response is not too long
      validatedResponse = this.limitLength(validatedResponse, 500);

      // Ensure response is conversational
      validatedResponse = this.makeConversational(validatedResponse);

      return validatedResponse;
    } catch (error) {
      this.logger.error(`Failed to validate response: ${error.message}`);
      return response; // Return original if validation fails
    }
  }

  private removeMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/`(.*?)`/g, '$1')       // Code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Links
  }

  private removeJSONArtifacts(text: string): string {
    // Remove JSON-like structures
    return text.replace(/\{[\s\S]*?"function"[\s\S]*?\}/g, '');
  }

  private ensureProperPunctuation(text: string): string {
    // Ensure ends with punctuation
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }
    return text;
  }

  private limitLength(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;

    // Find last sentence that fits
    const sentences = text.split(/([.!?]+\s+)/);
    let result = '';

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      if ((result + sentence).length <= maxChars) {
        result += sentence;
      } else {
        break;
      }
    }

    return result || text.substring(0, maxChars) + '...';
  }

  private makeConversational(text: string): string {
    // Remove overly formal phrases
    let conversational = text
      .replace(/^(I would like to|I wish to|I want to)/i, 'I\'d like to')
      .replace(/^(Do not|Cannot|Will not)/i, (match) => match.replace('not', 'n\'t'));

    return conversational;
  }
}
