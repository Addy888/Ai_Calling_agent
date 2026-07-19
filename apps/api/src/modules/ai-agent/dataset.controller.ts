import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DatasetService } from './services/dataset.service';
import { DatasetValidationService } from './services/dataset-validation.service';
import { DatasetTranscriptionService } from './services/dataset-transcription.service';
import { DatasetProcessingService } from './services/dataset-processing.service';
import {
  UploadDatasetDto,
  BulkUploadDto,
  DatasetQueryDto,
  CreateDatasetJobDto,
  DatasetJobQueryDto,
  CreateExportDto,
  TranscriptionOptionsDto,
} from './dto/dataset.dto';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { diskStorage } from 'multer';

@ApiTags('Dataset Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/dataset')
export class DatasetController {
  constructor(
    private readonly datasetService: DatasetService,
    private readonly validationService: DatasetValidationService,
    private readonly transcriptionService: DatasetTranscriptionService,
    private readonly processingService: DatasetProcessingService,
  ) {}

  // ============================================
  // UPLOAD ENDPOINTS
  // ============================================

  @Post('upload')
  @ApiOperation({ summary: 'Upload single audio file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: path.join(process.cwd(), 'Ai voice Dataset', 'raw_calls'),
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Only audio files are allowed.'), false);
        }
      },
    }),
  )
  async uploadFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const companyId = req.user.companyId;

    // Calculate file hash
    const fileBuffer = await fs.readFile(file.path);
    const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

    const uploadDto: UploadDatasetDto = {
      fileName: file.filename,
      fileSize: file.size,
      fileHash,
      mimeType: file.mimetype,
    };

    return this.datasetService.uploadDataset(companyId, uploadDto, req.user.email);
  }

  @Post('upload/bulk')
  @ApiOperation({ summary: 'Bulk upload multiple files' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async bulkUpload(@Req() req: any, @Body() bulkDto: BulkUploadDto) {
    const companyId = req.user.companyId;
    return this.datasetService.bulkUpload(companyId, bulkDto, req.user.email);
  }

  // ============================================
  // DATASET QUERIES
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all datasets' })
  @ApiResponse({ status: 200, description: 'Datasets retrieved successfully' })
  async getDatasets(@Req() req: any, @Query() query: DatasetQueryDto) {
    const companyId = req.user.companyId;
    return this.datasetService.getDatasets(companyId, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dataset dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.datasetService.getDashboard(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dataset by ID' })
  @ApiResponse({ status: 200, description: 'Dataset retrieved successfully' })
  async getDatasetById(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.datasetService.getDatasetById(companyId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dataset' })
  @ApiResponse({ status: 200, description: 'Dataset deleted successfully' })
  async deleteDataset(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.datasetService.deleteDataset(companyId, id);
  }

  // ============================================
  // PROCESSING ENDPOINTS
  // ============================================

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate audio file' })
  @ApiResponse({ status: 200, description: 'Validation complete' })
  async validateAudio(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    return this.validationService.validateAudio(id);
  }

  @Post(':id/transcribe')
  @ApiOperation({ summary: 'Transcribe audio file' })
  @ApiResponse({ status: 200, description: 'Transcription complete' })
  async transcribeAudio(
    @Req() req: any,
    @Param('id') id: string,
    @Body() options?: TranscriptionOptionsDto,
  ) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    return this.transcriptionService.transcribeAudio(id, options);
  }

  @Post(':id/diarize')
  @ApiOperation({ summary: 'Perform speaker diarization' })
  @ApiResponse({ status: 200, description: 'Diarization complete' })
  async diarizeAudio(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    return this.processingService.diarizeAudio(id);
  }

  @Post(':id/parse-conversation')
  @ApiOperation({ summary: 'Parse conversation structure' })
  @ApiResponse({ status: 200, description: 'Conversation parsed successfully' })
  async parseConversation(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    return this.processingService.parseConversation(id);
  }

  @Post(':id/extract-entities')
  @ApiOperation({ summary: 'Extract entities from conversation' })
  @ApiResponse({ status: 200, description: 'Entities extracted successfully' })
  async extractEntities(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    return this.processingService.extractEntities(id);
  }

  @Post(':id/detect-intents')
  @ApiOperation({ summary: 'Detect intents in conversation' })
  @ApiResponse({ status: 200, description: 'Intents detected successfully' })
  async detectIntents(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    return this.processingService.detectIntents(id);
  }

  @Post(':id/classify-lead')
  @ApiOperation({ summary: 'Classify lead quality' })
  @ApiResponse({ status: 200, description: 'Lead classified successfully' })
  async classifyLead(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    return this.processingService.classifyLead(id);
  }

  @Post(':id/mask-pii')
  @ApiOperation({ summary: 'Mask PII data' })
  @ApiResponse({ status: 200, description: 'PII masked successfully' })
  async maskPII(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.datasetService.getDatasetById(companyId, id); // Verify access
    await this.processingService.maskPII(id);
    return { success: true, message: 'PII masked successfully' };
  }

  @Post(':id/process-all')
  @ApiOperation({ summary: 'Run full processing pipeline' })
  @ApiResponse({ status: 200, description: 'Processing started' })
  async processAll(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const dataset = await this.datasetService.getDatasetById(companyId, id);

    // Create jobs for all processing stages
    const jobTypes = [
      'VALIDATION',
      'TRANSCRIPTION',
      'DIARIZATION',
      'CONVERSATION_PARSING',
      'ENTITY_EXTRACTION',
      'INTENT_DETECTION',
      'LEAD_CLASSIFICATION',
      'PII_MASKING',
    ];

    const jobs = [];
    for (const jobType of jobTypes) {
      const job = await this.datasetService.createJob(companyId, {
        datasetRecordId: dataset.id,
        jobType: jobType as any,
        priority: 10,
      });
      jobs.push(job);
    }

    return {
      success: true,
      message: 'Processing pipeline started',
      jobs,
    };
  }

  // ============================================
  // JOB MANAGEMENT
  // ============================================

  @Get('jobs/list')
  @ApiOperation({ summary: 'Get all processing jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobs(@Req() req: any, @Query() query: DatasetJobQueryDto) {
    const companyId = req.user.companyId;
    return this.datasetService.getJobs(companyId, query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  async getJobById(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.datasetService.getJobById(companyId, id);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create processing job' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  async createJob(@Req() req: any, @Body() createDto: CreateDatasetJobDto) {
    const companyId = req.user.companyId;
    return this.datasetService.createJob(companyId, createDto);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry failed job' })
  @ApiResponse({ status: 200, description: 'Job retried successfully' })
  async retryJob(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.datasetService.retryJob(companyId, id);
  }

  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancel running job' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  async cancelJob(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.datasetService.cancelJob(companyId, id);
  }

  // ============================================
  // EXPORT ENDPOINTS
  // ============================================

  @Post('export')
  @ApiOperation({ summary: 'Create dataset export' })
  @ApiResponse({ status: 201, description: 'Export created successfully' })
  async createExport(@Req() req: any, @Body() createDto: CreateExportDto) {
    const companyId = req.user.companyId;
    return this.datasetService.createExport(companyId, createDto, req.user.email);
  }

  @Get('export/list')
  @ApiOperation({ summary: 'Get all exports' })
  @ApiResponse({ status: 200, description: 'Exports retrieved successfully' })
  async getExports(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.datasetService.getExports(companyId, page, limit);
  }

  @Get('export/:id')
  @ApiOperation({ summary: 'Get export by ID' })
  @ApiResponse({ status: 200, description: 'Export retrieved successfully' })
  async getExportById(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.datasetService.getExportById(companyId, id);
  }

  @Delete('export/:id')
  @ApiOperation({ summary: 'Delete export' })
  @ApiResponse({ status: 200, description: 'Export deleted successfully' })
  async deleteExport(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.datasetService.deleteExport(companyId, id);
  }

  // ============================================
  // LOGS ENDPOINT
  // ============================================

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get processing logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getLogs(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.datasetService.getLogs(companyId, id, page, limit);
  }

  // ============================================
  // TRANSCRIPT & CONVERSATION VIEWERS
  // ============================================

  @Get(':id/transcript')
  @ApiOperation({ summary: 'Get transcript' })
  @ApiResponse({ status: 200, description: 'Transcript retrieved successfully' })
  async getTranscript(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const dataset = await this.datasetService.getDatasetById(companyId, id);
    return dataset.transcript;
  }

  @Get(':id/conversation')
  @ApiOperation({ summary: 'Get structured conversation' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  async getConversation(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const dataset = await this.datasetService.getDatasetById(companyId, id);
    return dataset.conversation;
  }

  @Get(':id/entities')
  @ApiOperation({ summary: 'Get extracted entities' })
  @ApiResponse({ status: 200, description: 'Entities retrieved successfully' })
  async getEntities(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const dataset = await this.datasetService.getDatasetById(companyId, id);
    return dataset.entities;
  }

  @Get(':id/intents')
  @ApiOperation({ summary: 'Get detected intents' })
  @ApiResponse({ status: 200, description: 'Intents retrieved successfully' })
  async getIntents(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const dataset = await this.datasetService.getDatasetById(companyId, id);
    return dataset.intents;
  }
}
