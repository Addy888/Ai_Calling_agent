import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LanguageDetectionService {
  private readonly logger = new Logger(LanguageDetectionService.name);
}
