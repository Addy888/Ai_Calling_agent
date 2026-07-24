import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AudioSegment {
  buffer: Buffer;
  startTimeMs: number;
  endTimeMs: number;
  isSpeech: boolean;
}

@Injectable()
export class SpeechBufferManager {
  private readonly logger = new Logger(SpeechBufferManager.name);

  // per-session rolling buffer chunks (accumulate speech only)
  private readonly speechBuffers = new Map<string, Buffer[]>();
  private readonly sessionStartTime = new Map<string, number>();
  private readonly sessionElapsedMs = new Map<string, number>();

  // Max buffer size: 10 seconds of 16kHz 16-bit mono = 320,000 bytes
  private readonly maxBufferBytes: number;
  private readonly sampleRate: number;

  constructor(private readonly configService: ConfigService) {
    this.sampleRate = this.configService.get<number>('STT_SAMPLE_RATE', 16000);
    // Max 10s at 16kHz, 16-bit mono = 10 * 16000 * 2 bytes
    this.maxBufferBytes = this.sampleRate * 2 * 10;
  }

  /**
   * Initialize buffer context for a new session
   */
  initSession(sessionId: string): void {
    this.speechBuffers.set(sessionId, []);
    this.sessionStartTime.set(sessionId, Date.now());
    this.sessionElapsedMs.set(sessionId, 0);
    this.logger.debug(`Buffer session initialized: ${sessionId}`);
  }

  /**
   * Append a chunk of audio to the rolling speech buffer for a session
   */
  append(sessionId: string, chunk: Buffer): void {
    const buffers = this.speechBuffers.get(sessionId);
    if (!buffers) {
      this.logger.warn(`No buffer found for session: ${sessionId}`);
      return;
    }

    buffers.push(chunk);

    // Track elapsed time (each chunk at 16kHz 16-bit mono => bytes / 2 / sampleRate * 1000 ms)
    const chunkMs = (chunk.length / 2 / this.sampleRate) * 1000;
    const elapsed = (this.sessionElapsedMs.get(sessionId) ?? 0) + chunkMs;
    this.sessionElapsedMs.set(sessionId, elapsed);

    // Trim if over max buffer size
    const totalBytes = buffers.reduce((sum, b) => sum + b.length, 0);
    if (totalBytes > this.maxBufferBytes) {
      this.trimOldest(sessionId, totalBytes - this.maxBufferBytes);
    }
  }

  /**
   * Flush all buffered audio for a session and clear the buffer
   * Returns concatenated audio as a single Buffer ready for transcription
   */
  flush(sessionId: string): Buffer {
    const buffers = this.speechBuffers.get(sessionId);
    if (!buffers || buffers.length === 0) {
      return Buffer.alloc(0);
    }

    const concatenated = Buffer.concat(buffers);
    this.speechBuffers.set(sessionId, []);
    this.sessionElapsedMs.set(sessionId, 0);

    this.logger.debug(`Buffer flushed for session ${sessionId}: ${concatenated.length} bytes`);
    return concatenated;
  }

  /**
   * Peek at current buffer without clearing it
   */
  peek(sessionId: string): Buffer {
    const buffers = this.speechBuffers.get(sessionId);
    if (!buffers || buffers.length === 0) {
      return Buffer.alloc(0);
    }
    return Buffer.concat(buffers);
  }

  /**
   * Get the current elapsed speech time in milliseconds
   */
  getElapsedMs(sessionId: string): number {
    return this.sessionElapsedMs.get(sessionId) ?? 0;
  }

  /**
   * Get total buffered bytes for a session
   */
  getBufferedBytes(sessionId: string): number {
    const buffers = this.speechBuffers.get(sessionId);
    if (!buffers) return 0;
    return buffers.reduce((sum, b) => sum + b.length, 0);
  }

  /**
   * Destroy a session and release memory
   */
  destroySession(sessionId: string): void {
    this.speechBuffers.delete(sessionId);
    this.sessionStartTime.delete(sessionId);
    this.sessionElapsedMs.delete(sessionId);
    this.logger.debug(`Buffer session destroyed: ${sessionId}`);
  }

  private trimOldest(sessionId: string, bytesToTrim: number): void {
    const buffers = this.speechBuffers.get(sessionId);
    if (!buffers) return;

    let trimmed = 0;
    while (buffers.length > 0 && trimmed < bytesToTrim) {
      const oldest = buffers[0];
      if (oldest.length <= bytesToTrim - trimmed) {
        trimmed += oldest.length;
        buffers.shift();
      } else {
        // Trim partial chunk
        buffers[0] = oldest.slice(bytesToTrim - trimmed);
        trimmed = bytesToTrim;
      }
    }
  }
}
