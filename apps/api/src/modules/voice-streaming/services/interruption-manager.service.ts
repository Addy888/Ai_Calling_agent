import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlaybackController } from './playback-controller.service';
import { SpeechQueueManager } from './speech-queue-manager.service';
import { LatencyOptimizer } from './latency-optimizer.service';

@Injectable()
export class InterruptionManager {
  private readonly logger = new Logger(InterruptionManager.name);
  private interruptedSessions = new Set<string>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly playbackController: PlaybackController,
    private readonly queueManager: SpeechQueueManager,
    private readonly latencyOptimizer: LatencyOptimizer,
  ) {}

  /**
   * Handle when customer starts speaking
   */
  handleCustomerSpeechStart(sessionId: string): void {
    const isPlaying = this.playbackController.isPlaying(sessionId);
    const hasQueuedItems = this.queueManager.getQueueLength(sessionId) > 0;

    if (isPlaying || hasQueuedItems) {
      this.logger.log(`Interruption detected in session ${sessionId}. Halting AI playback.`);
      
      // Mark as interrupted
      this.interruptedSessions.add(sessionId);

      // Capture interruption event timestamp
      this.latencyOptimizer.recordInterruption(sessionId);

      // Stop current playback immediately
      this.playbackController.stop(sessionId);

      // Clear speech queues so the old response is fully discarded
      this.queueManager.clearQueue(sessionId);

      // Emit event
      this.eventEmitter.emit('PlaybackInterrupted', {
        sessionId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Check if session was interrupted
   */
  isInterrupted(sessionId: string): boolean {
    return this.interruptedSessions.has(sessionId);
  }

  /**
   * Clear interruption state for a session
   */
  clearInterruption(sessionId: string): void {
    this.interruptedSessions.delete(sessionId);
  }
}
