import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AudioBufferService {
  private readonly logger = new Logger(AudioBufferService.name);
}
