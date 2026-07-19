import { Module } from '@nestjs/common';
import { ConversationLearningController } from './conversation-learning.controller';
import { RecordingAnalysisService } from './services/recording-analysis.service';
import { TranscriptionService } from './services/transcription.service';
import { PatternDetectionService } from './services/pattern-detection.service';
import { PauseAnalysisService } from './services/pause-analysis.service';
import { TurnTakingAnalysisService } from './services/turn-taking-analysis.service';
import { AcknowledgementLearningService } from './services/acknowledgement-learning.service';
import { BehaviorProfileService } from './services/behavior-profile.service';
import { InsightGenerationService } from './services/insight-generation.service';
import { RuleLearningService } from './services/rule-learning.service';
import { ResponseStrategyService } from './services/response-strategy.service';
import { ScriptUnderstandingService } from './services/script-understanding.service';
import { QuestionAnsweringService } from './services/question-answering.service';
import { InterruptionDetectionService } from './services/interruption-detection.service';
import { LanguageSwitchingService } from './services/language-switching.service';
import { ConversationStyleService } from './services/conversation-style.service';
import { SalesLearningService } from './services/sales-learning.service';
import { LearningStatisticsService } from './services/learning-statistics.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [ConversationLearningController],
  providers: [
    PrismaService,
    RecordingAnalysisService,
    TranscriptionService,
    PatternDetectionService,
    PauseAnalysisService,
    TurnTakingAnalysisService,
    AcknowledgementLearningService,
    BehaviorProfileService,
    InsightGenerationService,
    RuleLearningService,
    ResponseStrategyService,
    ScriptUnderstandingService,
    QuestionAnsweringService,
    InterruptionDetectionService,
    LanguageSwitchingService,
    ConversationStyleService,
    SalesLearningService,
    LearningStatisticsService,
  ],
  exports: [
    RecordingAnalysisService,
    BehaviorProfileService,
    ResponseStrategyService,
    QuestionAnsweringService,
  ],
})
export class ConversationLearningModule {}
