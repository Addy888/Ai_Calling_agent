import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContextWindowService {
  private readonly logger = new Logger(ContextWindowService.name);
}
