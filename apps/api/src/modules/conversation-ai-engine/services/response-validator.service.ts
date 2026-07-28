import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ResponseValidatorService {
  private readonly logger = new Logger(ResponseValidatorService.name);
}
