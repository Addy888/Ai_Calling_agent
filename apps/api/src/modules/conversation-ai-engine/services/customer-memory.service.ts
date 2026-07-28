import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomerMemoryService {
  private readonly logger = new Logger(CustomerMemoryService.name);
}
