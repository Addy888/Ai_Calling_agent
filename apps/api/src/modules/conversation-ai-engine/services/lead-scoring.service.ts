import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);
}
