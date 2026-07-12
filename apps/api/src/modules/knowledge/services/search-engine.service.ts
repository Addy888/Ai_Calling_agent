import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SearchType } from '../dto/knowledge.dto';

interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  keywordScore?: number;
  semanticScore?: number;
  metadataScore?: number;
  rank: number;
  metadata?: any;
}

@Injectable()
export class SearchEngineService {
  constructor(private prisma: PrismaService) {}

  async search(
    companyId: string,
    query: string,
    searchType: SearchType,
    filters: any = {},
    topK: number = 10,
    minScore: number = 0.0,
  ): Promise<SearchResult[]> {
    let results: SearchResult[] = [];

    switch (searchType) {
      case SearchType.KEYWORD:
        results = await this.keywordSearch(companyId, query, filters);
        break;
      case SearchType.SEMANTIC:
        results = await this.semanticSearch(companyId, query, filters);
        break;
      case SearchType.HYBRID:
        results = await this.hybridSearch(companyId, query, filters);
        break;
      case SearchType.METADATA:
        results = await this.metadataSearch(companyId, filters);
        break;
    }

    results = results.filter((r) => r.score >= minScore);
    results = this.rankResults(results);
    return results.slice(0, topK);
  }

  private async keywordSearch(
    companyId: string,
    query: string,
    filters: any,
  ): Promise<SearchResult[]> {
    const keywords = this.extractKeywords(query);
    const chunks = await this.getFilteredChunks(companyId, filters);

    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      const score = this.calculateKeywordScore(chunk.content, keywords);
      if (score > 0) {
        results.push({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          score,
          keywordScore: score,
          rank: 0,
          metadata: chunk.metadata,
        });
      }
    }

    return results;
  }

  private async semanticSearch(
    companyId: string,
    query: string,
    filters: any,
  ): Promise<SearchResult[]> {
    const chunks = await this.getFilteredChunks(companyId, filters);
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      const score = this.calculateSemanticScore(query, chunk.content);
      if (score > 0) {
        results.push({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          score,
          semanticScore: score,
          rank: 0,
          metadata: chunk.metadata,
        });
      }
    }

    return results;
  }

  private async hybridSearch(
    companyId: string,
    query: string,
    filters: any,
  ): Promise<SearchResult[]> {
    const keywordResults = await this.keywordSearch(companyId, query, filters);
    const semanticResults = await this.semanticSearch(companyId, query, filters);

    const mergedResults = new Map<string, SearchResult>();

    for (const result of keywordResults) {
      mergedResults.set(result.chunkId, result);
    }

    for (const result of semanticResults) {
      const existing = mergedResults.get(result.chunkId);
      if (existing) {
        existing.semanticScore = result.semanticScore;
        existing.score = (existing.keywordScore! * 0.6) + (result.semanticScore! * 0.4);
      } else {
        mergedResults.set(result.chunkId, {
          ...result,
          keywordScore: 0,
          score: result.semanticScore! * 0.4,
        });
      }
    }

    return Array.from(mergedResults.values());
  }

  private async metadataSearch(
    companyId: string,
    filters: any,
  ): Promise<SearchResult[]> {
    const chunks = await this.getFilteredChunks(companyId, filters);

    return chunks.map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      content: chunk.content,
      score: 1.0,
      metadataScore: 1.0,
      rank: 0,
      metadata: chunk.metadata,
    }));
  }

  private async getFilteredChunks(companyId: string, filters: any): Promise<any[]> {
    const where: any = {
      companyId,
      isActive: true,
    };

    if (filters.documentIds && filters.documentIds.length > 0) {
      where.documentId = { in: filters.documentIds };
    }

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            name: true,
            category: true,
            language: true,
            fileType: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      take: 1000,
    });

    let filtered = chunks;

    if (filters.category) {
      filtered = filtered.filter((c) => c.document.category === filters.category);
    }

    if (filters.language) {
      filtered = filtered.filter((c) => c.document.language === filters.language);
    }

    if (filters.fileType) {
      filtered = filtered.filter((c) => c.document.fileType === filters.fileType);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((c) => {
        const docTags = (c.document as any).tags || [];
        return filters.tags.some((tag: string) => docTags.includes(tag));
      });
    }

    return filtered;
  }

  private extractKeywords(query: string): string[] {
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    return Array.from(new Set(words));
  }

  private calculateKeywordScore(content: string, keywords: string[]): number {
    const lowerContent = content.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        score += matches.length * (1.0 / keywords.length);
      }
    }

    return Math.min(score, 1.0);
  }

  private calculateSemanticScore(query: string, content: string): number {
    const queryWords = this.extractKeywords(query);
    const contentWords = this.extractKeywords(content);

    if (queryWords.length === 0 || contentWords.length === 0) {
      return 0;
    }

    const intersection = queryWords.filter((w) => contentWords.includes(w));
    const union = Array.from(new Set([...queryWords, ...contentWords]));

    return intersection.length / union.length;
  }

  private rankResults(results: SearchResult[]): SearchResult[] {
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const aPriority = (a.metadata?.priority as number) || 0;
      const bPriority = (b.metadata?.priority as number) || 0;
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }

      const aDate = new Date((a.metadata?.updatedAt as string) || 0).getTime();
      const bDate = new Date((b.metadata?.updatedAt as string) || 0).getTime();
      return bDate - aDate;
    });

    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  }

  async saveSearchHistory(
    companyId: string,
    userId: string | undefined,
    query: string,
    searchType: SearchType,
    filters: any,
    results: SearchResult[],
    executionTime: number,
  ): Promise<string> {
    const searchHistory = await this.prisma.searchHistory.create({
      data: {
        companyId,
        userId,
        query,
        searchType,
        filters,
        resultCount: results.length,
        executionTime,
      },
    });

    if (results.length > 0) {
      const searchResults = results.map((result) => ({
        searchHistoryId: searchHistory.id,
        chunkId: result.chunkId,
        rank: result.rank,
        score: result.score,
        keywordScore: result.keywordScore,
        semanticScore: result.semanticScore,
        metadataScore: result.metadataScore,
        combinedScore: result.score,
        metadata: result.metadata,
      }));

      await this.prisma.searchResult.createMany({
        data: searchResults,
      });
    }

    return searchHistory.id;
  }
}
