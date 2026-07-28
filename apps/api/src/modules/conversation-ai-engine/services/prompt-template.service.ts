import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);
}
