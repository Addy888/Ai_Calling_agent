import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TrainingManagerController } from './training-manager.controller';
import { TrainingManagerService } from './training-manager.service';
import { ModelSelectionController } from './controllers/model-selection.controller';
import { ModelSelectionService } from './services/model-selection.service';
import { CompatibilityController } from './controllers/compatibility.controller';
import { CompatibilityService } from './services/compatibility.service';
import { TrainingReadinessController } from './controllers/readiness.controller';
import { TrainingReadinessService } from './services/readiness.service';
import { TrainingPipelineController } from './controllers/training-pipeline.controller';
import { TrainingPipelineService } from './services/training-pipeline.service';
import { FineTuningConfigController } from './controllers/fine-tuning-config.controller';
import { FineTuningConfigService } from './services/fine-tuning-config.service';
import { HyperparameterConfigController } from './controllers/hyperparameter-config.controller';
import { HyperparameterConfigService } from './services/hyperparameter-config.service';
import { TrainingStrategyController } from './controllers/training-strategy.controller';
import { TrainingStrategyService } from './services/training-strategy.service';
import { CheckpointConfigController } from './controllers/checkpoint-config.controller';
import { CheckpointConfigService } from './services/checkpoint-config.service';
import { TrainingMonitorController } from './controllers/training-monitor.controller';
import { TrainingMonitorService } from './services/training-monitor.service';
import { TrainingMonitorGateway } from './gateways/training-monitor.gateway';
import { TrainingEvaluationController } from './controllers/training-evaluation.controller';
import { TrainingEvaluationService } from './services/training-evaluation.service';
import { ModelPackageController } from './controllers/model-package.controller';
import { ModelPackageService } from './services/model-package.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    TrainingManagerController,
    ModelSelectionController,
    CompatibilityController,
    TrainingReadinessController,
    TrainingPipelineController,
    FineTuningConfigController,
    HyperparameterConfigController,
    TrainingStrategyController,
    CheckpointConfigController,
    TrainingMonitorController,
    TrainingEvaluationController,
    ModelPackageController,
  ],
  providers: [
    TrainingManagerService,
    ModelSelectionService,
    CompatibilityService,
    TrainingReadinessService,
    TrainingPipelineService,
    FineTuningConfigService,
    HyperparameterConfigService,
    TrainingStrategyService,
    CheckpointConfigService,
    TrainingMonitorService,
    TrainingMonitorGateway,
    TrainingEvaluationService,
    ModelPackageService,
  ],
  exports: [
    TrainingManagerService,
    ModelSelectionService,
    CompatibilityService,
    TrainingReadinessService,
    TrainingPipelineService,
    FineTuningConfigService,
    HyperparameterConfigService,
    TrainingStrategyService,
    CheckpointConfigService,
    TrainingMonitorService,
    TrainingMonitorGateway,
    TrainingEvaluationService,
    ModelPackageService,
  ],
})
export class TrainingManagerModule {}
