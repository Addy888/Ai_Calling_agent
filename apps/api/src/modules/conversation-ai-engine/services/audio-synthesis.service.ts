import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AudioSynthesisService {
  private readonly logger = new Logger(AudioSynthesisService.name);
}
