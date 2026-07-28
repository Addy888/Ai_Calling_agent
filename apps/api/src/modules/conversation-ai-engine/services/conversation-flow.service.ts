import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConversationFlowService {
  private readonly logger = new Logger(ConversationFlowService.name);
}
