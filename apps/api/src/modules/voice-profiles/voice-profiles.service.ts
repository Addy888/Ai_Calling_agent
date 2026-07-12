import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class VoiceProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return {
      success: true,
      data: [],
      message: 'VoiceProfiles retrieved successfully',
    };
  }

  async findOne(id: string) {
    return {
      success: true,
      data: null,
      message: 'VoiceProfile retrieved successfully',
    };
  }

  async create(data: any) {
    return {
      success: true,
      data: null,
      message: 'VoiceProfile created successfully',
    };
  }

  async update(id: string, data: any) {
    return {
      success: true,
      data: null,
      message: 'VoiceProfile updated successfully',
    };
  }

  async remove(id: string) {
    return {
      success: true,
      message: 'VoiceProfile deleted successfully',
    };
  }
}
