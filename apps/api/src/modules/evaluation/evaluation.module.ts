import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EvaluationController } from './evaluation.controller';
import { EvaluationEngineService } from './services/evaluation-engine.service';
import { ConversationScoringService } from './services/conversation-scoring.service';
import { ScriptComplianceService } from './services/script-compliance.service';
import { KnowledgeAccuracyService } from './services/knowledge-accuracy.service';
import { DecisionAccuracyService } from './services/decision-accuracy.service';
import { LeadQualityService } from './services/lead-quality.service';
import { MemoryEvaluationService } from './services/memory-evaluation.service';
import { BusinessRuleEvaluationService } from './services/business-rule-evaluation.service';
import { SafetyEvaluationService } from './services/safety-evaluation.service';
import { ConfidenceAnalyzerService } from './services/confidence-analyzer.service';

@Module({
  imports: [PrismaModule],
  controllers: [EvaluationController],
  providers: [
    EvaluationEngineService,
    ConversationScoringService,
    ScriptComplianceService,
    KnowledgeAccuracyService,
    DecisionAccuracyService,
    LeadQualityService,
    MemoryEvaluationService,
    BusinessRuleEvaluationService,
    SafetyEvaluationService,
    ConfidenceAnalyzerService,
  ],
  exports: [EvaluationEngineService],
})
export class EvaluationModule {}
