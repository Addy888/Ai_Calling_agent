import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VoiceEmotionService {
  private readonly logger = new Logger(VoiceEmotionService.name);
}
