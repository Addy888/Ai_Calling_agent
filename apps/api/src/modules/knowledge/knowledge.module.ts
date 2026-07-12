import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentParserService } from './services/document-parser.service';
import { ChunkEngineService } from './services/chunk-engine.service';
import { KnowledgeIndexService } from './services/knowledge-index.service';
import { SearchEngineService } from './services/search-engine.service';
import { KnowledgeCacheService } from './services/knowledge-cache.service';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentParserService,
    ChunkEngineService,
    KnowledgeIndexService,
    SearchEngineService,
    KnowledgeCacheService,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
