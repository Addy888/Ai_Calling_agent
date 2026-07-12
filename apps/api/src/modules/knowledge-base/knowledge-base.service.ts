import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return {
      success: true,
      data: [],
      message: 'KnowledgeBases retrieved successfully',
    };
  }

  async findOne(id: string) {
    return {
      success: true,
      data: null,
      message: 'KnowledgeBase retrieved successfully',
    };
  }

  async create(data: any) {
    return {
      success: true,
      data: null,
      message: 'KnowledgeBase created successfully',
    };
  }

  async update(id: string, data: any) {
    return {
      success: true,
      data: null,
      message: 'KnowledgeBase updated successfully',
    };
  }

  async remove(id: string) {
    return {
      success: true,
      message: 'KnowledgeBase deleted successfully',
    };
  }
}
