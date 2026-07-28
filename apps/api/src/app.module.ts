import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

// Common
import { PrismaModule } from './common/prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import redisConfig from './common/config/redis.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { VoiceProfilesModule } from './modules/voice-profiles/voice-profiles.module';
import { CallsModule } from './modules/calls/calls.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SystemHealthModule } from './modules/system-health/system-health.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { ScriptEngineModule } from './modules/script-engine/script-engine.module';
import { MemoryModule } from './modules/memory/memory.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { DecisionEngineModule } from './modules/decision-engine/decision-engine.module';
import { ConversationManagerModule } from './modules/conversation-manager/conversation-manager.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { TrainingManagerModule } from './modules/training-manager/training-manager.module';
import { DatasetBuilderModule } from './modules/dataset-builder/dataset-builder.module';
import { ValidationEngineModule } from './modules/validation-engine/validation-engine.module';
import { AIAgentModule } from './modules/ai-agent/ai-agent.module';
import { CallingPipelineModule } from './modules/calling-pipeline/calling-pipeline.module';
import { SpeechRecognitionModule } from './modules/speech-recognition/speech-recognition.module';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { SpeechModule } from './modules/speech/speech.module';
import { ConversationEngineModule } from './modules/conversation-engine/conversation-engine.module';
import { CallOrchestratorModule } from './modules/call-orchestrator/call-orchestrator.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { CampaignApiModule } from './modules/campaign-api/campaign-api.module';
import { TelephonyEngineModule } from './modules/telephony-engine/telephony-engine.module';
import { ConversationRuntimeModule } from './modules/conversation-runtime/conversation-runtime.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { VoiceStreamingModule } from './modules/voice-streaming/voice-streaming.module';
import { TelephonyProfileModule } from './modules/telephony-profile/telephony-profile.module';
import { CampaignContactsModule } from './modules/campaign-contacts/campaign-contacts.module';
// import { GSMGatewayModule } from './modules/gsm-gateway/gsm-gateway.module'; // TODO: Fix compilation errors

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      load: [redisConfig],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    CompaniesModule,
    CampaignsModule,
    ContactsModule,
    ScriptsModule,
    PromptsModule,
    KnowledgeBaseModule,
    VoiceProfilesModule,
    CallsModule,
    AnalyticsModule,
    SettingsModule,
    ActivityLogsModule,
    ReportsModule,
    NotificationsModule,
    SystemHealthModule,
    AuditLogsModule,
    FileStorageModule,
    ScriptEngineModule,
    MemoryModule,
    KnowledgeModule,
    DecisionEngineModule,
    ConversationManagerModule,
    EvaluationModule,
    TrainingManagerModule,
    DatasetBuilderModule,
    ValidationEngineModule,
    AIAgentModule,
    CallingPipelineModule,
    SpeechRecognitionModule,
    TelephonyModule,
    SpeechModule,
    ConversationEngineModule,
    CallOrchestratorModule,
    WebhooksModule,
    CampaignApiModule,
    TelephonyEngineModule,
    ConversationRuntimeModule,
    VoiceStreamingModule,
    TelephonyProfileModule,
    CampaignContactsModule,
    // GSMGatewayModule, // TODO: Fix compilation errors
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
