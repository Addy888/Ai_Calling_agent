import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SilenceDetectionService {
  private readonly logger = new Logger(SilenceDetectionService.name);
}
