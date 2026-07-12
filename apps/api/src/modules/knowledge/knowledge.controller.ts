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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { KnowledgeService } from './knowledge.service';
import {
  UploadDocumentDto,
  ProcessDocumentDto,
  CreateChunksDto,
  SearchKnowledgeDto,
  UpdateDocumentDto,
  GetDocumentsDto,
  GetChunksDto,
  CreateEmbeddingJobDto,
  GetSearchHistoryDto,
} from './dto/knowledge.dto';

@ApiTags('Knowledge')
@ApiBearerAuth()
@Controller('knowledge')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('knowledge:create')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    const content = file.buffer.toString('utf-8');
    const filePath = `uploads/knowledge/${dto.companyId}/${Date.now()}-${file.originalname}`;
    
    return this.knowledgeService.uploadDocument(
      dto,
      content,
      filePath,
      file.size,
      file.mimetype,
    );
  }

  @Post('process')
  @Permissions('knowledge:create')
  @ApiOperation({ summary: 'Process a document' })
  @ApiResponse({ status: 200, description: 'Document processed successfully' })
  async processDocument(@Body() dto: ProcessDocumentDto) {
    return this.knowledgeService.processDocument(dto);
  }

  @Post('reprocess/:documentId')
  @Permissions('knowledge:update')
  @ApiOperation({ summary: 'Reprocess a document' })
  @ApiResponse({ status: 200, description: 'Document reprocessed successfully' })
  async reprocessDocument(
    @Param('documentId') documentId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.knowledgeService.reprocessDocument(documentId, companyId);
  }

  @Post('chunks')
  @Permissions('knowledge:create')
  @ApiOperation({ summary: 'Create chunks from content' })
  @ApiResponse({ status: 201, description: 'Chunks created successfully' })
  async createChunks(@Body() dto: CreateChunksDto) {
    return this.knowledgeService.createChunks(dto);
  }

  @Get('chunks')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Get document chunks' })
  @ApiResponse({ status: 200, description: 'Chunks retrieved successfully' })
  async getChunks(@Query() dto: GetChunksDto) {
    return this.knowledgeService.getChunks(dto);
  }

  @Post('search')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Search knowledge base' })
  @ApiResponse({ status: 200, description: 'Search completed successfully' })
  async searchKnowledge(
    @Body() dto: SearchKnowledgeDto,
    @CurrentUser() user: any,
  ) {
    return this.knowledgeService.searchKnowledge(dto, user?.id);
  }

  @Get('documents')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getDocuments(@Query() dto: GetDocumentsDto) {
    return this.knowledgeService.getDocuments(dto);
  }

  @Get('documents/:id')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  async getDocument(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.knowledgeService.getDocument(id, companyId);
  }

  @Put('documents/:id')
  @Permissions('knowledge:update')
  @ApiOperation({ summary: 'Update a document' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async updateDocument(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.knowledgeService.updateDocument(id, companyId, dto);
  }

  @Delete('documents/:id')
  @Permissions('knowledge:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  async deleteDocument(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.knowledgeService.deleteDocument(id, companyId);
  }

  @Get('documents/:id/versions')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Get document versions' })
  @ApiResponse({ status: 200, description: 'Versions retrieved successfully' })
  async getDocumentVersions(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.knowledgeService.getDocumentVersions(id, companyId);
  }

  @Post('embedding-jobs')
  @Permissions('knowledge:create')
  @ApiOperation({ summary: 'Create an embedding job' })
  @ApiResponse({ status: 201, description: 'Embedding job created successfully' })
  async createEmbeddingJob(@Body() dto: CreateEmbeddingJobDto) {
    return this.knowledgeService.createEmbeddingJob(dto);
  }

  @Get('search-history')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Get search history' })
  @ApiResponse({ status: 200, description: 'Search history retrieved successfully' })
  async getSearchHistory(@Query() dto: GetSearchHistoryDto) {
    return this.knowledgeService.getSearchHistory(dto);
  }

  @Get('search-history/:id/results')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Get search results' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async getSearchResults(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.knowledgeService.getSearchResults(id, companyId);
  }

  @Get('statistics')
  @Permissions('knowledge:read')
  @ApiOperation({ summary: 'Get knowledge statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Query('companyId') companyId: string) {
    return this.knowledgeService.getStatistics(companyId);
  }
}
