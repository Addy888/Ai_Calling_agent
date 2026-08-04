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
import { TelephonyHealthController } from './telephony-health.controller';
import { AsteriskAdminController } from './asterisk-admin.controller';

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

// Advanced Services
import { AsteriskAMIService } from './services/asterisk-ami.service';
import { SystemDiagnosticsService } from './services/system-diagnostics.service';

// Production Services
import { AsteriskProductionAMIService } from './services/asterisk-production-ami.service';
import { CampaignCallDispatcherService } from './services/campaign-call-dispatcher.service';
import { AsteriskDiagnosticsService } from './services/asterisk-diagnostics.service';

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
    TelephonyHealthController,
    AsteriskAdminController,
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

    // Advanced Services
    AsteriskAMIService,
    SystemDiagnosticsService,

    // Production Services
    AsteriskProductionAMIService,
    CampaignCallDispatcherService,
    AsteriskDiagnosticsService,

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
    AsteriskAMIService,
    SystemDiagnosticsService,
    AsteriskProductionAMIService,
    CampaignCallDispatcherService,
    AsteriskDiagnosticsService,
  ],
})
export class TelephonyEngineModule {}
