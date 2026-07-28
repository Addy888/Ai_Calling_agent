import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StreamingTtsService {
  private readonly logger = new Logger(StreamingTtsService.name);
}
