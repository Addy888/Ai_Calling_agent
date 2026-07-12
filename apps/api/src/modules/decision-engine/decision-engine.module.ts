import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { DecisionEngineController } from './controllers/decision-engine.controller';
import { IntentDetectionController } from './controllers/intent-detection.controller';
import { EntityExtractionController } from './controllers/entity-extraction.controller';
import { BusinessRuleController } from './controllers/business-rule.controller';
import { LeadQualificationController } from './controllers/lead-qualification.controller';
import { FallbackController } from './controllers/fallback.controller';
import { ConversationPlannerController } from './controllers/conversation-planner.controller';
import { DecisionEngineService } from './services/decision-engine.service';
import { IntentDetectionService } from './services/intent-detection.service';
import { EntityExtractionService } from './services/entity-extraction.service';
import { BusinessRuleEngineService } from './services/business-rule-engine.service';
import { ConfidenceEngineService } from './services/confidence-engine.service';
import { LeadQualificationService } from './services/lead-qualification.service';
import { FallbackEngineService } from './services/fallback-engine.service';
import { ConversationPlannerService } from './services/conversation-planner.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    DecisionEngineController,
    IntentDetectionController,
    EntityExtractionController,
    BusinessRuleController,
    LeadQualificationController,
    FallbackController,
    ConversationPlannerController,
  ],
  providers: [
    DecisionEngineService,
    IntentDetectionService,
    EntityExtractionService,
    BusinessRuleEngineService,
    ConfidenceEngineService,
    LeadQualificationService,
    FallbackEngineService,
    ConversationPlannerService,
  ],
  exports: [
    DecisionEngineService,
    IntentDetectionService,
    EntityExtractionService,
    BusinessRuleEngineService,
    ConfidenceEngineService,
    LeadQualificationService,
    FallbackEngineService,
    ConversationPlannerService,
  ],
})
export class DecisionEngineModule {}
