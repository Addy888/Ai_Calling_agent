import { Injectable, Logger } from '@nestjs/common';

export interface SpeechSegment {
  id: string;
  text: string;
  audio: Buffer;
  timestamp: number;
}

@Injectable()
export class SpeechQueueManager {
  private readonly logger = new Logger(SpeechQueueManager.name);
  private queues = new Map<string, SpeechSegment[]>();

  /**
   * Enqueue a speech segment
   */
  enqueue(sessionId: string, segment: SpeechSegment): void {
    if (!this.queues.has(sessionId)) {
      this.queues.set(sessionId, []);
    }
    this.queues.get(sessionId)!.push(segment);
    this.logger.debug(`Enqueued speech segment for session ${sessionId}: "${segment.text.substring(0, 30)}..."`);
  }

  /**
   * Dequeue the next speech segment
   */
  dequeue(sessionId: string): SpeechSegment | undefined {
    const queue = this.queues.get(sessionId);
    if (!queue || queue.length === 0) return undefined;
    return queue.shift();
  }

  /**
   * Peek at the next speech segment
   */
  peek(sessionId: string): SpeechSegment | undefined {
    const queue = this.queues.get(sessionId);
    if (!queue || queue.length === 0) return undefined;
    return queue[0];
  }

  /**
   * Get total number of segments in queue
   */
  getQueueLength(sessionId: string): number {
    return this.queues.get(sessionId)?.length ?? 0;
  }

  /**
   * Clear the speech queue
   */
  clearQueue(sessionId: string): void {
    this.queues.set(sessionId, []);
    this.logger.debug(`Speech queue cleared for session ${sessionId}`);
  }

  /**
   * Destroy session queue
   */
  destroySession(sessionId: string): void {
    this.queues.delete(sessionId);
  }
}
