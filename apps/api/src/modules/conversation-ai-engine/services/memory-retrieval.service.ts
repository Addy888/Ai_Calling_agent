import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MemoryRetrievalService {
  private readonly logger = new Logger(MemoryRetrievalService.name);
}
