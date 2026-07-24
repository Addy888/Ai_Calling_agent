import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SpeechEventType } from '../interfaces/speech-events.interface';

interface RuntimeSubscription {
  sessionId: string;
  callSessionId: string;
  listeners: Array<{ event: string; handler: (...args: unknown[]) => void }>;
  createdAt: Date;
}

@Injectable()
export class SpeechRuntimeManager {
  private readonly logger = new Logger(SpeechRuntimeManager.name);
  private readonly subscriptions = new Map<string, RuntimeSubscription>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Register a runtime context for a session, hooking into all STT events
   */
  registerSession(
    sessionId: string,
    callSessionId: string,
    callbacks: {
      onSpeechStarted?: (payload: unknown) => void;
      onSpeechEnded?: (payload: unknown) => void;
      onPartialTranscript?: (payload: unknown) => void;
      onFinalTranscript?: (payload: unknown) => void;
      onSilenceDetected?: (payload: unknown) => void;
      onNoiseDetected?: (payload: unknown) => void;
      onLanguageDetected?: (payload: unknown) => void;
      onTranscriptCompleted?: (payload: unknown) => void;
    },
  ): void {
    const listeners: RuntimeSubscription['listeners'] = [];

    const register = (event: SpeechEventType, handler?: (payload: unknown) => void) => {
      if (!handler) return;

      const filterHandler = (payload: any) => {
        if (payload?.sessionId !== sessionId) return;
        handler(payload);
      };

      this.eventEmitter.on(event, filterHandler);
      listeners.push({ event, handler: filterHandler as any });
    };

    register(SpeechEventType.SPEECH_STARTED, callbacks.onSpeechStarted);
    register(SpeechEventType.SPEECH_ENDED, callbacks.onSpeechEnded);
    register(SpeechEventType.PARTIAL_TRANSCRIPT, callbacks.onPartialTranscript);
    register(SpeechEventType.FINAL_TRANSCRIPT, callbacks.onFinalTranscript);
    register(SpeechEventType.SILENCE_DETECTED, callbacks.onSilenceDetected);
    register(SpeechEventType.NOISE_DETECTED, callbacks.onNoiseDetected);
    register(SpeechEventType.LANGUAGE_DETECTED, callbacks.onLanguageDetected);
    register(SpeechEventType.TRANSCRIPT_COMPLETED, callbacks.onTranscriptCompleted);

    this.subscriptions.set(sessionId, {
      sessionId,
      callSessionId,
      listeners,
      createdAt: new Date(),
    });

    this.logger.log(`Runtime session registered: ${sessionId} (call: ${callSessionId}), listeners: ${listeners.length}`);
  }

  /**
   * Deregister a session and remove all event listeners
   */
  deregisterSession(sessionId: string): void {
    const subscription = this.subscriptions.get(sessionId);
    if (!subscription) {
      this.logger.warn(`Attempted to deregister unknown session: ${sessionId}`);
      return;
    }

    for (const { event, handler } of subscription.listeners) {
      this.eventEmitter.removeListener(event, handler as (...args: unknown[]) => void);
    }

    this.subscriptions.delete(sessionId);
    this.logger.log(`Runtime session deregistered: ${sessionId}`);
  }

  /**
   * Check if a session is currently registered
   */
  isRegistered(sessionId: string): boolean {
    return this.subscriptions.has(sessionId);
  }

  /**
   * Get all registered session IDs
   */
  getRegisteredSessions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get count of active runtime sessions
   */
  getActiveCount(): number {
    return this.subscriptions.size;
  }
}
