import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '../../common/dto/pagination.dto';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Check if email already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { email: createCompanyDto.email },
    });

    if (existingCompany) {
      throw new ConflictException('Company with this email already exists');
    }

    const company = await this.prisma.company.create({
      data: createCompanyDto,
    });

    return {
      success: true,
      data: company,
      message: 'Company created successfully',
    };
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit, search, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { website: { contains: search } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              campaigns: true,
              contacts: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(companies, total, page, limit),
    };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            campaigns: true,
            contacts: true,
            scripts: true,
            prompts: true,
            knowledgeBase: true,
          },
        },
      },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    return {
      success: true,
      data: company,
    };
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    // Check email uniqueness if email is being updated
    if (updateCompanyDto.email && updateCompanyDto.email !== company.email) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { email: updateCompanyDto.email },
      });

      if (existingCompany) {
        throw new ConflictException('Company with this email already exists');
      }
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });

    return {
      success: true,
      data: updatedCompany,
      message: 'Company updated successfully',
    };
  }

  async remove(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    // Soft delete
    await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Company deleted successfully',
    };
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed (JPEG, PNG, WebP)');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'storage', 'company-logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);
    const fileName = `company-${id}-${timestamp}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Delete old logo if exists
    if (company.logo) {
      const oldLogoPath = path.join(process.cwd(), company.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Update company with new logo path
    const logoPath = `storage/company-logos/${fileName}`;
    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: { logo: logoPath },
    });

    return {
      success: true,
      data: { logo: logoPath },
      message: 'Logo uploaded successfully',
    };
  }

  async getSettings(id: string) {
    const settings = await this.prisma.setting.findMany({
      where: {
        companyId: id,
      },
    });

    return {
      success: true,
      data: settings,
    };
  }

  async updateSettings(id: string, settings: Record<string, any>) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    const updatedSettings = [];

    for (const [key, value] of Object.entries(settings)) {
      const setting = await this.prisma.setting.upsert({
        where: {
          companyId_key: {
            companyId: id,
            key,
          },
        },
        update: {
          value: String(value),
          type: typeof value,
        },
        create: {
          companyId: id,
          key,
          value: String(value),
          type: typeof value,
        },
      });
      updatedSettings.push(setting);
    }

    return {
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully',
    };
  }
}
