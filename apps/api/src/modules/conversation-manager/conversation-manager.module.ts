import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ConversationManagerController } from './conversation-manager.controller';
import { ConversationSessionService } from './services/conversation-session.service';
import { ConversationFlowService } from './services/conversation-flow.service';
import { TimelineService } from './services/timeline.service';
import { QuestionManagerService } from './services/question-manager.service';
import { ObjectionHandlerService } from './services/objection-handler.service';
import { GreetingManagerService } from './services/greeting-manager.service';
import { ClosingManagerService } from './services/closing-manager.service';
import { FollowUpManagerService } from './services/followup-manager.service';
import { SummaryBuilderService } from './services/summary-builder.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationManagerController],
  providers: [
    ConversationSessionService,
    ConversationFlowService,
    TimelineService,
    QuestionManagerService,
    ObjectionHandlerService,
    GreetingManagerService,
    ClosingManagerService,
    FollowUpManagerService,
    SummaryBuilderService,
  ],
  exports: [
    ConversationSessionService,
    ConversationFlowService,
    TimelineService,
    QuestionManagerService,
    ObjectionHandlerService,
    GreetingManagerService,
    ClosingManagerService,
    FollowUpManagerService,
    SummaryBuilderService,
  ],
})
export class ConversationManagerModule {}
