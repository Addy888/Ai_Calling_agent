/**
 * Error Handler Service
 * Centralized error handling for the AI conversation engine
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum ErrorType {
  WHISPER_TIMEOUT = 'WHISPER_TIMEOUT',
  WHISPER_ERROR = 'WHISPER_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_ERROR = 'LLM_ERROR',
  TTS_TIMEOUT = 'TTS_TIMEOUT',
  TTS_ERROR = 'TTS_ERROR',
  KNOWLEDGE_ERROR = 'KNOWLEDGE_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  STREAMING_ERROR = 'STREAMING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

interface ErrorRecord {
  sessionId: string;
  type: ErrorType;
  message: string;
  timestamp: Date;
  retryCount: number;
  stack?: string;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);
  private errorHistory = new Map<string, ErrorRecord[]>();
  private maxRetries = 3;
  private retryDelay = 1000; // ms

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async handleError(
    sessionId: string,
    error: Error,
    context: {
      type: ErrorType;
      retryable?: boolean;
      retryFn?: () => Promise<any>;
    },
  ): Promise<any> {
    const errorRecord: ErrorRecord = {
      sessionId,
      type: context.type,
      message: error.message,
      timestamp: new Date(),
      retryCount: 0,
      stack: error.stack,
    };

    // Store error
    this.recordError(sessionId, errorRecord);

    // Log error
    this.logger.error(
      `[${sessionId}] ${context.type}: ${error.message}`,
      error.stack,
    );

    // Emit error event
    this.eventEmitter.emit('conversation.error', {
      sessionId,
      type: context.type,
      message: error.message,
    });

    // Retry if applicable
    if (context.retryable && context.retryFn) {
      return this.retryOperation(sessionId, errorRecord, context.retryFn);
    }

    throw error;
  }

  private async retryOperation(
    sessionId: string,
    errorRecord: ErrorRecord,
    retryFn: () => Promise<any>,
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Retry attempt ${attempt}/${this.maxRetries} for ${errorRecord.type}`);
        
        // Wait before retry
        if (attempt > 1) {
          await this.delay(this.retryDelay * attempt);
        }

        const result = await retryFn();
        
        this.logger.log(`Retry successful after ${attempt} attempts`);
        return result;
      } catch (error) {
        lastError = error as Error;
        errorRecord.retryCount = attempt;

        if (attempt === this.maxRetries) {
          this.logger.error(
            `Max retries (${this.maxRetries}) reached for ${errorRecord.type}`,
          );
          break;
        }
      }
    }

    throw lastError!;
  }

  private recordError(sessionId: string, error: ErrorRecord) {
    if (!this.errorHistory.has(sessionId)) {
      this.errorHistory.set(sessionId, []);
    }
    this.errorHistory.get(sessionId)!.push(error);

    // Limit history size
    const history = this.errorHistory.get(sessionId)!;
    if (history.length > 100) {
      history.shift();
    }
  }

  getErrorHistory(sessionId: string): ErrorRecord[] {
    return this.errorHistory.get(sessionId) || [];
  }

  clearErrorHistory(sessionId: string) {
    this.errorHistory.delete(sessionId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Error classification
  classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      if (message.includes('whisper')) return ErrorType.WHISPER_TIMEOUT;
      if (message.includes('llm') || message.includes('ollama')) return ErrorType.LLM_TIMEOUT;
      if (message.includes('tts')) return ErrorType.TTS_TIMEOUT;
    }

    if (message.includes('whisper')) return ErrorType.WHISPER_ERROR;
    if (message.includes('llm') || message.includes('ollama')) return ErrorType.LLM_ERROR;
    if (message.includes('tts')) return ErrorType.TTS_ERROR;
    if (message.includes('knowledge')) return ErrorType.KNOWLEDGE_ERROR;
    if (message.includes('memory')) return ErrorType.MEMORY_ERROR;
    if (message.includes('stream')) return ErrorType.STREAMING_ERROR;
    if (message.includes('network') || message.includes('econnrefused')) return ErrorType.NETWORK_ERROR;

    return ErrorType.UNKNOWN_ERROR;
  }

  isRetryable(errorType: ErrorType): boolean {
    return [
      ErrorType.WHISPER_TIMEOUT,
      ErrorType.LLM_TIMEOUT,
      ErrorType.TTS_TIMEOUT,
      ErrorType.NETWORK_ERROR,
    ].includes(errorType);
  }
}
