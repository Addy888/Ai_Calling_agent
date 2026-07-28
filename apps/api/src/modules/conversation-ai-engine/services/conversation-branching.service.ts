import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConversationBranchingService {
  private readonly logger = new Logger(ConversationBranchingService.name);
}
