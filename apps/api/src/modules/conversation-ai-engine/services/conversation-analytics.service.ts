import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConversationAnalyticsService {
  private readonly logger = new Logger(ConversationAnalyticsService.name);
}
