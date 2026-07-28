import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StreamingLlmService {
  private readonly logger = new Logger(StreamingLlmService.name);
}
