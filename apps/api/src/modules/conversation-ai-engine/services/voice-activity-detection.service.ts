import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VoiceActivityDetectionService {
  private readonly logger = new Logger(VoiceActivityDetectionService.name);
}
