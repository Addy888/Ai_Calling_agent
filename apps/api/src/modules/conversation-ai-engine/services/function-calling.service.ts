import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FunctionCallingService {
  private readonly logger = new Logger(FunctionCallingService.name);
}
