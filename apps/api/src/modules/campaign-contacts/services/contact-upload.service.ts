import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ContactParserService } from './contact-parser.service';
import { ContactValidationService } from './contact-validation.service';
import { UploadStatus, ContactCallStatus } from '@prisma/client';
import * as path from 'path';

@Injectable()
export class ContactUploadService {
  private readonly logger = new Logger(ContactUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ContactParserService,
    private readonly validator: ContactValidationService,
  ) {}

  /**
   * Upload and process contact file for a campaign
   */
  async uploadContactFile(params: {
    campaignId: string;
    companyId: string;
    userId: string;
    file: Express.Multer.File;
  }) {
    const { campaignId, companyId, userId, file } = params;

    this.logger.log(`Processing contact upload for campaign: ${campaignId}`);
    this.logger.log(`File: ${file.originalname}, Size: ${file.size} bytes`);

    // Verify campaign exists
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        companyId,
        deletedAt: null,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Determine file type
    const ext = path.extname(file.originalname).toLowerCase();
    let fileType: string;
    if (ext === '.csv') {
      fileType = 'CSV';
    } else if (ext === '.xlsx') {
      fileType = 'XLSX';
    } else if (ext === '.xls') {
      fileType = 'XLS';
    } else {
      throw new Error('Unsupported file type');
    }

    // Create upload record
    const upload = await this.prisma.campaignUpload.create({
      data: {
        campaignId,
        companyId,
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileType,
        fileSize: BigInt(file.size),
        status: UploadStatus.PENDING,
        uploadedBy: userId,
      },
    });

    // Process file asynchronously
    this.processUpload(upload.id, file.path, fileType, campaignId, companyId).catch((error) => {
      this.logger.error(`Failed to process upload ${upload.id}: ${error.message}`, error.stack);
    });

    return {
      uploadId: upload.id,
      fileName: file.originalname,
      fileSize: file.size,
      status: 'PENDING',
      message: 'File uploaded successfully. Processing contacts...',
    };
  }

  /**
   * Process uploaded contact file
   */
  private async processUpload(
    uploadId: string,
    filePath: string,
    fileType: string,
    campaignId: string,
    companyId: string,
  ) {
    this.logger.log(`Processing upload: ${uploadId}`);

    try {
      // Update status to validating
      await this.prisma.campaignUpload.update({
        where: { id: uploadId },
        data: { status: UploadStatus.VALIDATING },
      });

      // Parse file
      const parsedContacts = await this.parser.parseFile(filePath, fileType);
      const totalRows = parsedContacts.length;

      this.logger.log(`Parsed ${totalRows} contacts from file`);

      // Validate contacts
      const validatedContacts = await this.validator.validateContacts(
        parsedContacts,
        campaignId,
        companyId,
      );

      const validContacts = validatedContacts.filter(c => c.validationResult.isValid && !c.isDuplicate);
      const invalidContacts = validatedContacts.filter(c => !c.validationResult.isValid);
      const duplicateContacts = validatedContacts.filter(c => c.isDuplicate);

      // Collect validation errors
      const validationErrors = invalidContacts.map(c => ({
        row: c.rowNumber,
        phone: c.phone,
        errors: c.validationResult.errors,
      }));

      // Update upload status
      await this.prisma.campaignUpload.update({
        where: { id: uploadId },
        data: {
          totalRows,
          validRows: validContacts.length,
          invalidRows: invalidContacts.length,
          duplicateRows: duplicateContacts.length,
          status: validContacts.length > 0 ? UploadStatus.VALID : UploadStatus.INVALID,
          validationErrors: validationErrors,
        },
      });

      // If there are valid contacts, create them
      if (validContacts.length > 0) {
        await this.prisma.campaignUpload.update({
          where: { id: uploadId },
          data: { status: UploadStatus.PROCESSING },
        });

        await this.createCampaignContacts(validContacts, campaignId, companyId, uploadId);

        await this.prisma.campaignUpload.update({
          where: { id: uploadId },
          data: {
            status: UploadStatus.COMPLETED,
            processedRows: validContacts.length,
            processedAt: new Date(),
          },
        });

        this.logger.log(`Upload ${uploadId} completed. Created ${validContacts.length} contacts.`);
      } else {
        this.logger.warn(`Upload ${uploadId} has no valid contacts`);
      }
    } catch (error) {
      this.logger.error(`Failed to process upload ${uploadId}: ${error.message}`, error.stack);

      await this.prisma.campaignUpload.update({
        where: { id: uploadId },
        data: {
          status: UploadStatus.FAILED,
          validationErrors: [
            {
              row: 0,
              errors: [error.message],
            },
          ],
        },
      });
    }
  }

  /**
   * Create campaign contacts in database
   */
  private async createCampaignContacts(
    validatedContacts: any[],
    campaignId: string,
    companyId: string,
    uploadId: string,
  ) {
    const contactsData = validatedContacts.map(contact => ({
      campaignId,
      uploadId,
      companyId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
      phone: contact.phone,
      countryCode: contact.countryCode || '+91',
      email: contact.email,
      language: contact.language || 'en',
      city: contact.city,
      state: contact.state,
      country: contact.country || 'India',
      customFields: contact.customFields || {},
      status: ContactCallStatus.PENDING,
    }));

    // Batch insert (500 at a time to avoid hitting DB limits)
    const batchSize = 500;
    for (let i = 0; i < contactsData.length; i += batchSize) {
      const batch = contactsData.slice(i, i + batchSize);
      await this.prisma.campaignContact.createMany({
        data: batch,
        skipDuplicates: true,
      });
      this.logger.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contactsData.length / batchSize)}`);
    }
  }

  /**
   * Get upload status
   */
  async getUploadStatus(uploadId: string, companyId: string) {
    const upload = await this.prisma.campaignUpload.findFirst({
      where: {
        id: uploadId,
        companyId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    return upload;
  }

  /**
   * Get all uploads for a campaign
   */
  async getCampaignUploads(campaignId: string, companyId: string) {
    const uploads = await this.prisma.campaignUpload.findMany({
      where: {
        campaignId,
        companyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return uploads;
  }
}
