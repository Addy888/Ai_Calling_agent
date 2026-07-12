import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class KnowledgeIndexService {
  constructor(private prisma: PrismaService) {}

  async createIndexes(
    documentId: string,
    companyId: string,
    document: any,
  ): Promise<void> {
    const indexes = [];

    if (document.category) {
      indexes.push({
        documentId,
        companyId,
        indexType: 'category',
        indexKey: 'category',
        indexValue: document.category,
      });
    }

    if (document.language) {
      indexes.push({
        documentId,
        companyId,
        indexType: 'language',
        indexKey: 'language',
        indexValue: document.language,
      });
    }

    if (document.fileType) {
      indexes.push({
        documentId,
        companyId,
        indexType: 'fileType',
        indexKey: 'fileType',
        indexValue: document.fileType,
      });
    }

    if (document.author) {
      indexes.push({
        documentId,
        companyId,
        indexType: 'author',
        indexKey: 'author',
        indexValue: document.author,
      });
    }

    if (document.tags && Array.isArray(document.tags)) {
      for (const tag of document.tags) {
        indexes.push({
          documentId,
          companyId,
          indexType: 'tag',
          indexKey: 'tag',
          indexValue: tag,
        });
      }
    }

    indexes.push({
      documentId,
      companyId,
      indexType: 'version',
      indexKey: 'version',
      indexValue: document.version || '1.0.0',
    });

    if (indexes.length > 0) {
      await this.prisma.knowledgeIndex.createMany({
        data: indexes,
      });
    }
  }

  async updateIndexes(
    documentId: string,
    companyId: string,
    document: any,
  ): Promise<void> {
    await this.prisma.knowledgeIndex.deleteMany({
      where: { documentId, companyId },
    });

    await this.createIndexes(documentId, companyId, document);
  }

  async searchByIndex(
    companyId: string,
    indexType: string,
    indexValue: string,
  ): Promise<string[]> {
    const indexes = await this.prisma.knowledgeIndex.findMany({
      where: {
        companyId,
        indexType,
        indexValue,
      },
      select: {
        documentId: true,
      },
    });

    return indexes.map((idx) => idx.documentId);
  }

  async getDocumentsByCategory(
    companyId: string,
    category: string,
  ): Promise<string[]> {
    return this.searchByIndex(companyId, 'category', category);
  }

  async getDocumentsByLanguage(
    companyId: string,
    language: string,
  ): Promise<string[]> {
    return this.searchByIndex(companyId, 'language', language);
  }

  async getDocumentsByTag(companyId: string, tag: string): Promise<string[]> {
    return this.searchByIndex(companyId, 'tag', tag);
  }

  async getDocumentsByFileType(
    companyId: string,
    fileType: string,
  ): Promise<string[]> {
    return this.searchByIndex(companyId, 'fileType', fileType);
  }

  async getAllIndexTypes(companyId: string): Promise<string[]> {
    const indexes = await this.prisma.knowledgeIndex.findMany({
      where: { companyId },
      select: { indexType: true },
      distinct: ['indexType'],
    });

    return indexes.map((idx) => idx.indexType);
  }

  async getIndexValues(
    companyId: string,
    indexType: string,
  ): Promise<string[]> {
    const indexes = await this.prisma.knowledgeIndex.findMany({
      where: { companyId, indexType },
      select: { indexValue: true },
      distinct: ['indexValue'],
    });

    return indexes.map((idx) => idx.indexValue);
  }

  async deleteIndexes(documentId: string, companyId: string): Promise<void> {
    await this.prisma.knowledgeIndex.deleteMany({
      where: { documentId, companyId },
    });
  }
}
