import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentParserService } from './services/document-parser.service';
import { ChunkEngineService } from './services/chunk-engine.service';
import { KnowledgeIndexService } from './services/knowledge-index.service';
import { SearchEngineService } from './services/search-engine.service';
import { KnowledgeCacheService } from './services/knowledge-cache.service';
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
  DocumentStatus,
  ProcessingStatus,
  EmbeddingStatus,
} from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private documentParser: DocumentParserService,
    private chunkEngine: ChunkEngineService,
    private knowledgeIndex: KnowledgeIndexService,
    private searchEngine: SearchEngineService,
    private cacheService: KnowledgeCacheService,
  ) {}

  async uploadDocument(dto: UploadDocumentDto, content: string, filePath: string, fileSize: number, mimeType: string) {
    const isValid = await this.documentParser.validateDocument(content, dto.fileType);
    if (!isValid) {
      throw new BadRequestException('Invalid document content');
    }

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        originalName: dto.name,
        filePath,
        fileType: dto.fileType,
        mimeType,
        fileSize: BigInt(fileSize),
        category: dto.category,
        language: dto.language || 'en',
        tags: dto.tags || [],
        author: dto.author,
        priority: dto.priority || 0,
        version: '1.0.0',
        status: DocumentStatus.PENDING,
        processingStatus: ProcessingStatus.PENDING,
        content,
      },
    });

    await this.knowledgeIndex.createIndexes(document.id, dto.companyId, document);

    return document;
  }

  async processDocument(dto: ProcessDocumentDto) {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: {
        id: dto.documentId,
        companyId: dto.companyId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.knowledgeDocument.update({
      where: { id: dto.documentId },
      data: { processingStatus: ProcessingStatus.PROCESSING },
    });

    try {
      const extractedText = await this.documentParser.parseDocument(
        document.content || '',
        document.fileType as any,
      );

      const metadata = this.documentParser.extractMetadata(
        document.content || '',
        document.fileType as any,
      );

      await this.prisma.knowledgeDocument.update({
        where: { id: dto.documentId },
        data: {
          extractedText,
          metadata,
        },
      });

      const chunks = await this.chunkEngine.createChunks(
        extractedText,
        dto.chunkType || 'PARAGRAPH' as any,
        dto.chunkSize || 512,
        dto.chunkOverlap || 50,
      );

      for (const chunk of chunks) {
        await this.prisma.knowledgeChunk.create({
          data: {
            documentId: dto.documentId,
            companyId: dto.companyId,
            chunkIndex: chunk.chunkIndex,
            chunkType: dto.chunkType || 'PARAGRAPH' as any,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            metadata: chunk.metadata,
            embeddingStatus: EmbeddingStatus.PENDING,
            version: '1.0.0',
          },
        });
      }

      await this.prisma.knowledgeDocument.update({
        where: { id: dto.documentId },
        data: {
          processingStatus: ProcessingStatus.COMPLETED,
          status: DocumentStatus.ACTIVE,
          processedAt: new Date(),
        },
      });

      await this.cacheService.invalidate(dto.companyId, 'document');

      return {
        documentId: dto.documentId,
        chunksCreated: chunks.length,
        status: ProcessingStatus.COMPLETED,
      };
    } catch (error) {
      await this.prisma.knowledgeDocument.update({
        where: { id: dto.documentId },
        data: { processingStatus: ProcessingStatus.FAILED },
      });
      throw error;
    }
  }

  async reprocessDocument(documentId: string, companyId: string) {
    await this.prisma.knowledgeChunk.deleteMany({
      where: { documentId, companyId },
    });

    return this.processDocument({
      documentId,
      companyId,
      chunkType: 'PARAGRAPH' as any,
      chunkSize: 512,
      chunkOverlap: 50,
    });
  }

  async createChunks(dto: CreateChunksDto) {
    const chunks = await this.chunkEngine.createChunks(
      dto.content,
      dto.chunkType,
      dto.chunkSize || 512,
      dto.chunkOverlap || 50,
    );

    const created = [];
    for (const chunk of chunks) {
      const createdChunk = await this.prisma.knowledgeChunk.create({
        data: {
          documentId: dto.documentId,
          companyId: dto.companyId,
          chunkIndex: chunk.chunkIndex,
          chunkType: dto.chunkType,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
          metadata: chunk.metadata,
          embeddingStatus: EmbeddingStatus.PENDING,
          version: '1.0.0',
        },
      });
      created.push(createdChunk);
    }

    return created;
  }

  async getChunks(dto: GetChunksDto) {
    const where: any = {
      documentId: dto.documentId,
      companyId: dto.companyId,
      isActive: true,
    };

    if (dto.chunkType) {
      where.chunkType = dto.chunkType;
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [chunks, total] = await Promise.all([
      this.prisma.knowledgeChunk.findMany({
        where,
        skip,
        take: limit,
        orderBy: { chunkIndex: 'asc' },
      }),
      this.prisma.knowledgeChunk.count({ where }),
    ]);

    return {
      data: chunks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchKnowledge(dto: SearchKnowledgeDto, userId?: string) {
    const cacheKey = `search:${dto.query}:${dto.searchType}:${JSON.stringify(dto)}`;
    const cached = await this.cacheService.get(dto.companyId, cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const startTime = Date.now();

    const filters: any = {};
    if (dto.category) filters.category = dto.category;
    if (dto.language) filters.language = dto.language;
    if (dto.fileType) filters.fileType = dto.fileType;
    if (dto.tags) filters.tags = dto.tags;

    const results = await this.searchEngine.search(
      dto.companyId,
      dto.query,
      dto.searchType,
      filters,
      dto.topK || 10,
      dto.minScore || 0.0,
    );

    const executionTime = Date.now() - startTime;

    await this.searchEngine.saveSearchHistory(
      dto.companyId,
      userId,
      dto.query,
      dto.searchType,
      filters,
      results,
      executionTime,
    );

    const response = {
      query: dto.query,
      searchType: dto.searchType,
      results,
      resultCount: results.length,
      executionTime,
    };

    await this.cacheService.set(
      dto.companyId,
      cacheKey,
      JSON.stringify(response),
      'search',
      3600,
    );

    return response;
  }

  async getDocuments(dto: GetDocumentsDto) {
    const where: any = {
      companyId: dto.companyId,
      isActive: true,
    };

    if (dto.category) where.category = dto.category;
    if (dto.language) where.language = dto.language;
    if (dto.fileType) where.fileType = dto.fileType;
    if (dto.status) where.status = dto.status;
    if (dto.processingStatus) where.processingStatus = dto.processingStatus;

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ]);

    return {
      data: documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDocument(documentId: string, companyId: string) {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, companyId },
      include: {
        chunks: {
          take: 10,
          orderBy: { chunkIndex: 'asc' },
        },
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async updateDocument(documentId: string, companyId: string, dto: UpdateDocumentDto) {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const updated = await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: dto,
    });

    if (dto.category || dto.tags) {
      await this.knowledgeIndex.updateIndexes(documentId, companyId, updated);
    }

    await this.cacheService.invalidate(companyId, 'document');

    return updated;
  }

  async deleteDocument(documentId: string, companyId: string) {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        isActive: false,
        status: DocumentStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    await this.cacheService.invalidate(companyId, 'document');

    return { message: 'Document deleted successfully' };
  }

  async getDocumentVersions(documentId: string, companyId: string) {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEmbeddingJob(dto: CreateEmbeddingJobDto) {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id: dto.documentId, companyId: dto.companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const chunksCount = await this.prisma.knowledgeChunk.count({
      where: { documentId: dto.documentId, companyId: dto.companyId },
    });

    const job = await this.prisma.embeddingJob.create({
      data: {
        documentId: dto.documentId,
        companyId: dto.companyId,
        provider: dto.provider || 'openai',
        model: dto.model || 'text-embedding-ada-002',
        status: EmbeddingStatus.PENDING,
        totalChunks: chunksCount,
        processedChunks: 0,
        failedChunks: 0,
      },
    });

    return job;
  }

  async getSearchHistory(dto: GetSearchHistoryDto) {
    const where: any = {
      companyId: dto.companyId,
    };

    if (dto.userId) where.userId = dto.userId;
    if (dto.searchType) where.searchType = dto.searchType;

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.searchHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.searchHistory.count({ where }),
    ]);

    return {
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSearchResults(searchHistoryId: string, companyId: string) {
    const searchHistory = await this.prisma.searchHistory.findFirst({
      where: { id: searchHistoryId, companyId },
    });

    if (!searchHistory) {
      throw new NotFoundException('Search history not found');
    }

    return this.prisma.searchResult.findMany({
      where: { searchHistoryId },
      include: {
        chunk: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                category: true,
                fileType: true,
              },
            },
          },
        },
      },
      orderBy: { rank: 'asc' },
    });
  }

  async getStatistics(companyId: string) {
    const [
      totalDocuments,
      activeDocuments,
      totalChunks,
      pendingProcessing,
      completedProcessing,
      totalSearches,
    ] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: { companyId } }),
      this.prisma.knowledgeDocument.count({ where: { companyId, isActive: true, status: DocumentStatus.ACTIVE } }),
      this.prisma.knowledgeChunk.count({ where: { companyId, isActive: true } }),
      this.prisma.knowledgeDocument.count({ where: { companyId, processingStatus: ProcessingStatus.PENDING } }),
      this.prisma.knowledgeDocument.count({ where: { companyId, processingStatus: ProcessingStatus.COMPLETED } }),
      this.prisma.searchHistory.count({ where: { companyId } }),
    ]);

    const cacheStats = await this.cacheService.getCacheStats(companyId);

    return {
      documents: {
        total: totalDocuments,
        active: activeDocuments,
        pendingProcessing,
        completedProcessing,
      },
      chunks: {
        total: totalChunks,
      },
      searches: {
        total: totalSearches,
      },
      cache: cacheStats,
    };
  }
}
