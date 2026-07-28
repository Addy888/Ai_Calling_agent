import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DynamicPromptService {
  private readonly logger = new Logger(DynamicPromptService.name);
}
