/**
 * Telephony Engine Module
 * Enterprise telephony system with provider abstraction
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import {
  TelephonyEngineController,
  TelephonyWebhookController,
} from './telephony-engine.controller';

// Services
import { TelephonyManagerService } from './services/telephony-manager.service';
import { ProviderManagerService } from './services/provider-manager.service';
import { ProviderRegistryService } from './services/provider-registry.service';
import { CallManagerService } from './services/call-manager.service';
import { CallSessionManagerService } from './services/call-session-manager.service';
import { OutgoingCallService } from './services/outgoing-call.service';
import { IncomingCallService } from './services/incoming-call.service';
import { RecordingManagerService } from './services/recording-manager.service';
import { WebhookManagerService } from './services/webhook-manager.service';
import { PipelineIntegrationService } from './services/pipeline-integration.service';

// Providers
import { TwilioProvider } from './providers/twilio.provider';
import { ExotelProvider } from './providers/exotel.provider';
import { PlivoProvider } from './providers/plivo.provider';

@Module({
  imports: [ConfigModule, EventEmitterModule],
  controllers: [TelephonyEngineController, TelephonyWebhookController],
  providers: [
    // Main Manager
    TelephonyManagerService,

    // Core Services
    ProviderManagerService,
    ProviderRegistryService,
    CallManagerService,
    CallSessionManagerService,
    OutgoingCallService,
    IncomingCallService,
    RecordingManagerService,
    WebhookManagerService,
    PipelineIntegrationService,

    // Provider Implementations
    TwilioProvider,
    ExotelProvider,
    PlivoProvider,
  ],
  exports: [
    TelephonyManagerService,
    CallManagerService,
    OutgoingCallService,
    RecordingManagerService,
    PipelineIntegrationService,
  ],
})
export class TelephonyEngineModule {}
