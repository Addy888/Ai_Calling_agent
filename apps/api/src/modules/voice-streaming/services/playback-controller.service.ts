import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type PlaybackState = 'PLAYING' | 'PAUSED' | 'STOPPED';

@Injectable()
export class PlaybackController {
  private readonly logger = new Logger(PlaybackController.name);
  private sessionStates = new Map<string, PlaybackState>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  isPlaying(sessionId: string): boolean {
    return this.sessionStates.get(sessionId) === 'PLAYING';
  }

  getState(sessionId: string): PlaybackState {
    return this.sessionStates.get(sessionId) || 'STOPPED';
  }

  play(sessionId: string): void {
    this.sessionStates.set(sessionId, 'PLAYING');
    this.eventEmitter.emit('PlaybackStarted', { sessionId, timestamp: Date.now() });
    this.logger.debug(`Playback started for session: ${sessionId}`);
  }

  pause(sessionId: string): void {
    if (this.sessionStates.get(sessionId) === 'PLAYING') {
      this.sessionStates.set(sessionId, 'PAUSED');
      this.eventEmitter.emit('PlaybackPaused', { sessionId, timestamp: Date.now() });
      this.logger.debug(`Playback paused for session: ${sessionId}`);
    }
  }

  resume(sessionId: string): void {
    if (this.sessionStates.get(sessionId) === 'PAUSED') {
      this.sessionStates.set(sessionId, 'PLAYING');
      this.eventEmitter.emit('PlaybackResumed', { sessionId, timestamp: Date.now() });
      this.logger.debug(`Playback resumed for session: ${sessionId}`);
    }
  }

  stop(sessionId: string): void {
    const currentState = this.sessionStates.get(sessionId);
    if (currentState && currentState !== 'STOPPED') {
      this.sessionStates.set(sessionId, 'STOPPED');
      this.eventEmitter.emit('PlaybackCompleted', { sessionId, timestamp: Date.now() });
      this.logger.debug(`Playback stopped for session: ${sessionId}`);
    }
  }

  cancel(sessionId: string): void {
    this.stop(sessionId);
    this.eventEmitter.emit('PlaybackCancelled', { sessionId, timestamp: Date.now() });
  }

  restart(sessionId: string): void {
    this.stop(sessionId);
    this.play(sessionId);
  }

  skip(sessionId: string): void {
    this.logger.log(`Skipping current playing chunk for session: ${sessionId}`);
    this.eventEmitter.emit('PlaybackSkipped', { sessionId, timestamp: Date.now() });
  }
}
