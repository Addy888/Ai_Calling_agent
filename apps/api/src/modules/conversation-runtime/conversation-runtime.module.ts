/**
 * Conversation Runtime Module
 * Enterprise real-time conversation management system
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controller
import { ConversationRuntimeController } from './conversation-runtime.controller';

// Services
import { ConversationRuntimeManagerService } from './services/conversation-runtime-manager.service';
import { ConversationSessionService } from './services/conversation-session.service';
import { ConversationProcessorService } from './services/conversation-processor.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ResponseGeneratorService } from './services/response-generator.service';
import { ResponseValidatorService } from './services/response-validator.service';
import { IntentRouterService } from './services/intent-router.service';
import { FallbackManagerService } from './services/fallback-manager.service';
import { SessionPersistenceService } from './services/session-persistence.service';

// Shared Modules
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    PrismaModule,
  ],
  controllers: [ConversationRuntimeController],
  providers: [
    // Main Manager
    ConversationRuntimeManagerService,

    // Core Services
    ConversationSessionService,
    ConversationProcessorService,
    PromptBuilderService,
    ResponseGeneratorService,
    ResponseValidatorService,
    IntentRouterService,
    FallbackManagerService,
    SessionPersistenceService,
  ],
  exports: [
    ConversationRuntimeManagerService,
    ConversationSessionService,
    ConversationProcessorService,
    SessionPersistenceService,
  ],
})
export class ConversationRuntimeModule {}
