import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelephonyService } from './telephony.service';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  imports: [ConfigModule],
  providers: [TelephonyService, TwilioProvider],
  exports: [TelephonyService],
})
export class TelephonyModule {}
