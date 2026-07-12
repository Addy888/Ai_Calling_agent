import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [FileStorageController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}