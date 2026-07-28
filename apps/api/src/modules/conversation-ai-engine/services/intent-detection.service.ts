import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IntentDetectionService {
  private readonly logger = new Logger(IntentDetectionService.name);

  async detectIntent(text: string): Promise<any> {
    this.logger.debug(`Detecting intent from: ${text.substring(0, 50)}...`);
    // Stub implementation - returns default intent
    return {
      intent: 'UNKNOWN',
      confidence: 0.5,
      entities: [],
    };
  }
}
