import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class CallService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return {
      success: true,
      data: [],
      message: 'Calls retrieved successfully',
    };
  }

  async findOne(id: string) {
    return {
      success: true,
      data: null,
      message: 'Call retrieved successfully',
    };
  }

  async create(data: any) {
    return {
      success: true,
      data: null,
      message: 'Call created successfully',
    };
  }

  async update(id: string, data: any) {
    return {
      success: true,
      data: null,
      message: 'Call updated successfully',
    };
  }

  async remove(id: string) {
    return {
      success: true,
      message: 'Call deleted successfully',
    };
  }
}
