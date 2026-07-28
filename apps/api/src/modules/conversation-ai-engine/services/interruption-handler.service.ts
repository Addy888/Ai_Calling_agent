import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InterruptionHandlerService {
  private readonly logger = new Logger(InterruptionHandlerService.name);

  async detectInterruption(sessionId: string): Promise<boolean> {
    this.logger.debug(`Detecting interruption for session ${sessionId}`);
    // Stub implementation - no interruption detected
    return false;
  }

  async handleInterruption(sessionId: string): Promise<void> {
    this.logger.log(`Handling interruption for session ${sessionId}`);
    // Stub implementation - pause AI speech
  }
}
