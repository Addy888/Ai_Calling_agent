import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { DatasetBuilderController } from './dataset-builder.controller';
import { DatasetBuilderService } from './dataset-builder.service';

@Module({
  imports: [PrismaModule],
  controllers: [DatasetBuilderController],
  providers: [DatasetBuilderService],
  exports: [DatasetBuilderService],
})
export class DatasetBuilderModule {}
