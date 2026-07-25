/**
 * Telephony Module
 * Uses Twilio provider for production telephony
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { TelephonyService } from './telephony.service';
import { TelephonyController } from './telephony.controller';
import { TwilioTelephonyProvider } from './providers/twilio-telephony.provider';
import { ITelephonyProvider } from './interfaces/telephony-provider.interface';

/**
 * Provider factory
 * Uses Twilio provider for all telephony operations
 */
const telephonyProviderFactory = {
  provide: 'TELEPHONY_PROVIDER',
  useFactory: (
    configService: ConfigService,
    eventEmitter: EventEmitter2,
  ): ITelephonyProvider => {
    console.log('🔧 Configuring telephony provider: TWILIO');
    return new TwilioTelephonyProvider(configService, eventEmitter);
  },
  inject: [ConfigService, EventEmitter2],
};

@Module({
  imports: [ConfigModule, EventEmitterModule],
  controllers: [TelephonyController],
  providers: [
    telephonyProviderFactory,
    TelephonyService,
    TwilioTelephonyProvider,
  ],
  exports: [TelephonyService, 'TELEPHONY_PROVIDER'],
})
export class TelephonyModule {}
