import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TrainingManagerController } from './training-manager.controller';
import { TrainingManagerService } from './training-manager.service';
import { ModelSelectionController } from './controllers/model-selection.controller';
import { ModelSelectionService } from './services/model-selection.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingManagerController, ModelSelectionController],
  providers: [TrainingManagerService, ModelSelectionService],
  exports: [TrainingManagerService, ModelSelectionService],
})
export class TrainingManagerModule {}
