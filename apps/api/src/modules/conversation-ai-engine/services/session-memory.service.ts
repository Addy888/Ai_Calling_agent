import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SessionMemoryService {
  private readonly logger = new Logger(SessionMemoryService.name);
}
