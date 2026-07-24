import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AudioBufferManager {
  private readonly logger = new Logger(AudioBufferManager.name);

  private incomingBuffers = new Map<string, Buffer[]>();
  private outgoingBuffers = new Map<string, Buffer[]>();

  initSession(sessionId: string): void {
    this.incomingBuffers.set(sessionId, []);
    this.outgoingBuffers.set(sessionId, []);
  }

  appendIncoming(sessionId: string, chunk: Buffer): void {
    if (!this.incomingBuffers.has(sessionId)) {
      this.incomingBuffers.set(sessionId, []);
    }
    this.incomingBuffers.get(sessionId)!.push(chunk);
  }

  appendOutgoing(sessionId: string, chunk: Buffer): void {
    if (!this.outgoingBuffers.has(sessionId)) {
      this.outgoingBuffers.set(sessionId, []);
    }
    this.outgoingBuffers.get(sessionId)!.push(chunk);
  }

  getIncoming(sessionId: string): Buffer[] {
    return this.incomingBuffers.get(sessionId) || [];
  }

  getOutgoing(sessionId: string): Buffer[] {
    return this.outgoingBuffers.get(sessionId) || [];
  }

  clearIncoming(sessionId: string): void {
    this.incomingBuffers.set(sessionId, []);
  }

  clearOutgoing(sessionId: string): void {
    this.outgoingBuffers.set(sessionId, []);
  }

  flushIncoming(sessionId: string): Buffer {
    const buffers = this.incomingBuffers.get(sessionId) || [];
    const concatenated = Buffer.concat(buffers);
    this.incomingBuffers.set(sessionId, []);
    return concatenated;
  }

  flushOutgoing(sessionId: string): Buffer {
    const buffers = this.outgoingBuffers.get(sessionId) || [];
    const concatenated = Buffer.concat(buffers);
    this.outgoingBuffers.set(sessionId, []);
    return concatenated;
  }

  destroySession(sessionId: string): void {
    this.incomingBuffers.delete(sessionId);
    this.outgoingBuffers.delete(sessionId);
    this.logger.debug(`Buffers cleared for session: ${sessionId}`);
  }
}
