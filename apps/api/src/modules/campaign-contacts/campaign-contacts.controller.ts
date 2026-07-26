import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CampaignContactsService } from './campaign-contacts.service';
import { ContactUploadService } from './services/contact-upload.service';
import { ContactParserService } from './services/contact-parser.service';
import { CampaignContactFilterDto } from './dto/campaign-contact.dto';

@ApiTags('Campaign Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/campaigns/:campaignId/contacts')
export class CampaignContactsController {
  constructor(
    private readonly campaignContactsService: CampaignContactsService,
    private readonly contactUploadService: ContactUploadService,
    private readonly contactParserService: ContactParserService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload contacts file (CSV/XLSX) for campaign' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Contacts file uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('campaignId') campaignId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.contactUploadService.uploadContactFile({
      campaignId,
      companyId,
      userId,
      file,
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Contacts file uploaded successfully',
      data: result,
    };
  }

  @Get('uploads')
  @ApiOperation({ summary: 'Get all contact uploads for campaign' })
  @ApiResponse({ status: 200, description: 'Contact uploads retrieved successfully' })
  async getUploads(
    @Param('campaignId') campaignId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const uploads = await this.contactUploadService.getCampaignUploads(campaignId, companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Contact uploads retrieved successfully',
      data: uploads,
    };
  }

  @Get('uploads/:uploadId')
  @ApiOperation({ summary: 'Get upload status' })
  @ApiResponse({ status: 200, description: 'Upload status retrieved successfully' })
  async getUploadStatus(
    @Param('uploadId') uploadId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const upload = await this.contactUploadService.getUploadStatus(uploadId, companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Upload status retrieved successfully',
      data: upload,
    };
  }

  @Get('template')
  @ApiOperation({ summary: 'Download CSV template for contact upload' })
  @ApiResponse({ status: 200, description: 'Template downloaded successfully' })
  async downloadTemplate(@Res() res: Response) {
    const csv = this.contactParserService.generateTemplate();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contact-template.csv');
    res.send(csv);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get campaign contact statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Param('campaignId') campaignId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const stats = await this.campaignContactsService.getStatistics(campaignId, companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all contacts for campaign' })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  async findAll(
    @Param('campaignId') campaignId: string,
    @CurrentUser('companyId') companyId: string,
    @Query() filters: CampaignContactFilterDto,
  ) {
    const result = await this.campaignContactsService.findAll(campaignId, companyId, filters);
    return {
      statusCode: HttpStatus.OK,
      message: 'Contacts retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  async findOne(
    @Param('campaignId') campaignId: string,
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const contact = await this.campaignContactsService.findOne(id, campaignId, companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Contact retrieved successfully',
      data: contact,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiResponse({ status: 204, description: 'Contact deleted successfully' })
  async delete(
    @Param('campaignId') campaignId: string,
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.campaignContactsService.delete(id, campaignId, companyId);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete contacts' })
  @ApiResponse({ status: 200, description: 'Contacts deleted successfully' })
  async bulkDelete(
    @Param('campaignId') campaignId: string,
    @CurrentUser('companyId') companyId: string,
    @Body('contactIds') contactIds: string[],
  ) {
    const result = await this.campaignContactsService.bulkDelete(contactIds, campaignId, companyId);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
    };
  }
}
