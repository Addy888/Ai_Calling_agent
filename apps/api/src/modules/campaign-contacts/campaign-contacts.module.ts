import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CampaignContactsController } from './campaign-contacts.controller';
import { CampaignContactsService } from './campaign-contacts.service';
import { ContactUploadService } from './services/contact-upload.service';
import { ContactValidationService } from './services/contact-validation.service';
import { ContactParserService } from './services/contact-parser.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: diskStorage({
        destination: process.env.UPLOAD_PATH || './storage/uploads/contacts',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `contact-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV, XLSX, and XLS files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [CampaignContactsController],
  providers: [
    CampaignContactsService,
    ContactUploadService,
    ContactValidationService,
    ContactParserService,
  ],
  exports: [CampaignContactsService],
})
export class CampaignContactsModule {}
