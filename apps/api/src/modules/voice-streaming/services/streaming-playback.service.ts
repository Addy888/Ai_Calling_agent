import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlaybackController } from './playback-controller.service';
import { SpeechQueueManager } from './speech-queue-manager.service';
import { AudioChunkManager } from './audio-chunk-manager.service';
import { LatencyOptimizer } from './latency-optimizer.service';

@Injectable()
export class StreamingPlaybackService {
  private readonly logger = new Logger(StreamingPlaybackService.name);
  
  // Track active intervals simulating real-time playback streaming per session
  private activeStreams = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly playbackController: PlaybackController,
    private readonly queueManager: SpeechQueueManager,
    private readonly chunkManager: AudioChunkManager,
    private readonly latencyOptimizer: LatencyOptimizer,
  ) {}

  /**
   * Queue a response text and audio buffer, then start playing it
   */
  async queueAndPlay(sessionId: string, text: string, audio: Buffer): Promise<void> {
    const segmentId = Math.random().toString(36).substring(7);
    
    // Add to speech queue
    this.queueManager.enqueue(sessionId, {
      id: segmentId,
      text,
      audio,
      timestamp: Date.now(),
    });

    // Start playing if not already playing
    if (!this.playbackController.isPlaying(sessionId)) {
      this.startPlaybackLoop(sessionId);
    }
  }

  /**
   * Start streaming audio chunks sequentially
   */
  private startPlaybackLoop(sessionId: string): void {
    if (this.activeStreams.has(sessionId)) return;

    this.playbackController.play(sessionId);
    this.latencyOptimizer.recordPlaybackStart(sessionId);

    // Get the next segment in the queue
    const segment = this.queueManager.dequeue(sessionId);
    if (!segment) {
      this.playbackController.stop(sessionId);
      return;
    }

    // Chunk the segment's audio (20ms chunks)
    const chunks = this.chunkManager.chunkAudio(segment.audio, 20);
    let chunkIndex = 0;

    this.logger.debug(`Streaming playback: started segment ${segment.id} (${chunks.length} chunks)`);

    // Stream chunks every 20ms to simulate real-time playback
    const streamInterval = setInterval(() => {
      const state = this.playbackController.getState(sessionId);
      
      if (state === 'PAUSED') {
        // Just wait, don't send chunks
        return;
      }

      if (state === 'STOPPED' || chunkIndex >= chunks.length) {
        // Finished or cancelled
        clearInterval(streamInterval);
        this.activeStreams.delete(sessionId);
        
        // If there are more items in queue, continue, else stop
        if (this.queueManager.getQueueLength(sessionId) > 0) {
          this.startPlaybackLoop(sessionId);
        } else {
          this.playbackController.stop(sessionId);
        }
        return;
      }

      const chunk = chunks[chunkIndex++];
      
      // Emit the audio chunk out
      this.eventEmitter.emit('AudioPlaybackChunk', {
        sessionId,
        chunk,
        format: 'PCM',
        sampleRate: 16000,
      });

    }, 20);

    this.activeStreams.set(sessionId, streamInterval);
  }

  /**
   * Stop active streaming immediately
   */
  stopPlayback(sessionId: string): void {
    const stream = this.activeStreams.get(sessionId);
    if (stream) {
      clearInterval(stream);
      this.activeStreams.delete(sessionId);
    }
    this.playbackController.stop(sessionId);
  }

  /**
   * Pause streaming
   */
  pausePlayback(sessionId: string): void {
    this.playbackController.pause(sessionId);
  }

  /**
   * Resume streaming
   */
  resumePlayback(sessionId: string): void {
    this.playbackController.resume(sessionId);
  }

  /**
   * Clean up resources
   */
  destroySession(sessionId: string): void {
    const stream = this.activeStreams.get(sessionId);
    if (stream) {
      clearInterval(stream);
      this.activeStreams.delete(sessionId);
    }
    this.queueManager.destroySession(sessionId);
  }
}
