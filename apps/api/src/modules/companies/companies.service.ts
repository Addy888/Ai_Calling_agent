import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '../../common/dto/pagination.dto';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new company with administrator and default resources
   * Everything happens in a single transaction
   */
  async create(createCompanyDto: CreateCompanyDto) {
    const { administrator, ...companyData } = createCompanyDto;

    // Validate passwords match
    if (administrator.password !== administrator.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if company email already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { email: companyData.email },
    });

    if (existingCompany) {
      throw new ConflictException('Company with this email already exists');
    }

    // Check if admin email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: administrator.adminEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(administrator.password, 10);

    // Generate unique company code
    const companyCode = await this.generateCompanyCode();

    // Split admin full name
    const [firstName, ...lastNameParts] = administrator.fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    try {
      // Execute everything in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // 1. Create Company
        const company = await prisma.company.create({
          data: {
            ...companyData,
            createdBy: 'system',
          },
        });

        // 2. Get company-admin role
        const companyAdminRole = await prisma.role.findUnique({
          where: { slug: 'company-admin' },
        });

        if (!companyAdminRole) {
          throw new BadRequestException('Company admin role not found. Please run database seed.');
        }

        // 3. Create Company Admin User
        const adminUser = await prisma.user.create({
          data: {
            companyId: company.id,
            email: administrator.adminEmail,
            password: hashedPassword,
            firstName,
            lastName,
            status: 'ACTIVE',
            isActive: true,
            emailVerified: !administrator.sendWelcomeEmail, // Verify if no welcome email
            createdBy: 'system',
          },
        });

        // 4. Assign Company Admin Role
        await prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: companyAdminRole.id,
          },
        });

        // 5. Create Default Settings
        await prisma.setting.createMany({
          data: [
            {
              companyId: company.id,
              key: 'company_timezone',
              value: 'UTC',
              type: 'string',
            },
            {
              companyId: company.id,
              key: 'company_language',
              value: 'en',
              type: 'string',
            },
            {
              companyId: company.id,
              key: 'default_call_timeout',
              value: '30',
              type: 'number',
            },
          ],
        });

        // 6. Create Default Contact Group
        await prisma.contactGroup.create({
          data: {
            companyId: company.id,
            name: 'All Contacts',
            description: 'Default contact group',
            createdBy: adminUser.id,
          },
        });

        // 7. Create Default Knowledge Base
        await prisma.knowledgeBase.create({
          data: {
            companyId: company.id,
            name: 'Default Knowledge Base',
            description: 'Default knowledge base for company',
            status: 'ACTIVE',
            createdBy: adminUser.id,
          },
        });

        // 8. Create Default AI Agent
        const defaultPrompt = await prisma.prompt.findFirst({
          where: { companyId: company.id },
        });

        await prisma.aIAgent.create({
          data: {
            companyId: company.id,
            agentName: 'Default AI Agent',
            agentType: 'CALLING',
            promptId: defaultPrompt?.id,
            configuration: {},
            metadata: {},
            status: 'IDLE',
            version: '1.0.0',
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
        });

        // 9. Create Default Prompt Folder (using tags for now)
        await prisma.prompt.create({
          data: {
            companyId: company.id,
            name: 'Default Sales Prompt',
            description: 'Default prompt template for sales calls',
            content: 'Hello, this is {agentName} calling from {companyName}. How can I assist you today?',
            status: 'ACTIVE',
            version: '1.0.0',
            createdBy: adminUser.id,
          },
        });

        // 10. Create Default Script Folder
        await prisma.script.create({
          data: {
            companyId: company.id,
            name: 'Default Call Script',
            description: 'Default call script template',
            content: 'Greeting: Hello {firstName}, this is {agentName}.\nIntroduction: I am calling from {companyName}.\nPurpose: The purpose of my call is to...',
            language: 'en',
            version: '1.0.0',
            isActive: true,
            status: 'ACTIVE',
            createdBy: adminUser.id,
          },
        });

        // 11. Create Audit Log
        await prisma.auditLog.create({
          data: {
            companyId: company.id,
            action: 'COMPANY_CREATED',
            module: 'companies',
            description: `Company ${company.name} created with administrator ${administrator.fullName}`,
            metadata: {
              companyId: company.id,
              companyName: company.name,
              adminEmail: administrator.adminEmail,
              companyCode,
            },
            performedBy: 'system',
          },
        });

        // 12. Create Activity Log
        await prisma.activityLog.create({
          data: {
            companyId: company.id,
            userId: adminUser.id,
            action: 'USER_CREATED',
            module: 'users',
            description: `Company administrator ${administrator.fullName} created`,
            metadata: {
              userId: adminUser.id,
              userEmail: administrator.adminEmail,
              role: 'company-admin',
            },
          },
        });

        // TODO: Send welcome email if requested
        if (administrator.sendWelcomeEmail) {
          // Email service integration
          console.log(`Welcome email should be sent to: ${administrator.adminEmail}`);
        }

        return {
          company,
          adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
          },
          companyCode,
        };
      });

      return {
        success: true,
        data: result,
        message: 'Company and administrator created successfully. Admin can now log in.',
      };
    } catch (error) {
      // Transaction will auto-rollback on error
      console.error('Company creation failed:', error);
      
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to create company. Transaction rolled back.');
    }
  }

  /**
   * Generate unique company code
   */
  private async generateCompanyCode(): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `COMP${timestamp}${random}`;
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
