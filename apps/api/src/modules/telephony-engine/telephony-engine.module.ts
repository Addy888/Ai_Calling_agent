/**
 * Telephony Engine Module
 * Enterprise telephony system with provider abstraction
 * Enhanced with GSM Gateway, SIM Management, and Connection Management
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../common/prisma/prisma.module';

// Controllers
import {
  TelephonyEngineController,
  TelephonyWebhookController,
} from './telephony-engine.controller';
import { GSMGatewayController } from './gsm-gateway.controller';

// Core Services
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

// GSM Gateway & SIM Management Services
import { GatewayManagerService } from './services/gateway-manager.service';
import { SIMManagerService } from './services/sim-manager.service';
import { ConnectionManagerService } from './services/connection-manager.service';

// Telephony Providers
import { TwilioProvider } from './providers/twilio.provider';
import { ExotelProvider } from './providers/exotel.provider';
import { PlivoProvider } from './providers/plivo.provider';
import { AsteriskProvider } from './providers/asterisk.provider';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    PrismaModule,
  ],
  controllers: [
    TelephonyEngineController,
    TelephonyWebhookController,
    GSMGatewayController,
  ],
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

    // GSM Gateway & SIM Management
    GatewayManagerService,
    SIMManagerService,
    ConnectionManagerService,

    // Telephony Provider Implementations
    TwilioProvider,
    ExotelProvider,
    PlivoProvider,
    AsteriskProvider,
  ],
  exports: [
    TelephonyManagerService,
    CallManagerService,
    OutgoingCallService,
    RecordingManagerService,
    PipelineIntegrationService,
    GatewayManagerService,
    SIMManagerService,
    ConnectionManagerService,
  ],
})
export class TelephonyEngineModule {}
