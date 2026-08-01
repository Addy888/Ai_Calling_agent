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

    console.log('🏢 COMPANY CREATION STARTED');
    console.log('   Company Data:', { name: companyData.name, email: companyData.email });
    console.log('   Admin Data:', { 
      fullName: administrator.fullName, 
      adminEmail: administrator.adminEmail,
    });

    // Validate passwords match
    if (administrator.password !== administrator.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // IMPORTANT: Use company email as the admin user email for simplified login
    // This allows company admins to log in with the company email directly
    const adminEmail = companyData.email; // Use company email for admin login
    
    console.log('   🔑 Admin Login Email:', adminEmail);

    // Check if company email already exists (exclude soft-deleted companies)
    const existingCompany = await this.prisma.company.findFirst({
      where: { email: companyData.email, deletedAt: null },
    });

    if (existingCompany) {
      throw new ConflictException(`Company with email '${companyData.email}' already exists`);
    }

    // Check if email is from a soft-deleted company
    const softDeletedCompany = await this.prisma.company.findFirst({
      where: { 
        email: companyData.email, 
        deletedAt: { not: null } 
      },
      select: {
        id: true,
        name: true,
        email: true,
        deletedAt: true,
      },
    });

    if (softDeletedCompany) {
      throw new ConflictException(
        `Email '${companyData.email}' was previously used by company '${softDeletedCompany.name}' ` +
        `(deleted on ${softDeletedCompany.deletedAt.toISOString().split('T')[0]}). ` +
        `Please contact support to restore the old company or permanently remove it.`
      );
    }

    // Check if admin email already exists (exclude soft-deleted users)
    const existingUser = await this.prisma.user.findFirst({
      where: { 
        email: adminEmail,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException(`User with email '${adminEmail}' already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(administrator.password, 10);
    console.log('   🔒 Password hashed successfully');

    // Generate unique company code
    const companyCode = await this.generateCompanyCode();

    // Split admin full name
    const [firstName, ...lastNameParts] = administrator.fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    console.log('🏢 COMPANY CREATION STARTED');
    console.log('   Company Data:', { name: companyData.name, email: companyData.email });
    console.log('   Admin Data:', { 
      fullName: administrator.fullName, 
      adminEmail: administrator.adminEmail,
      firstName,
      lastName 
    });

    try {
      // Execute everything in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        console.log('📝 Step 1: Creating Company...');
        
        // 1. Create Company
        const company = await prisma.company.create({
          data: {
            ...companyData,
            createdBy: 'system',
          },
        });

        console.log('✅ Company Created:', {
          id: company.id,
          name: company.name,
          email: company.email,
          isActive: company.isActive,
          status: company.status,
        });

        console.log('📝 Step 2: Finding company-admin role...');
        
        // 2. Get company-admin role
        const companyAdminRole = await prisma.role.findUnique({
          where: { slug: 'company-admin' },
        });

        if (!companyAdminRole) {
          console.error('❌ company-admin role NOT FOUND!');
          throw new BadRequestException('Company admin role not found. Please run database seed.');
        }

        console.log('✅ Role Found:', {
          id: companyAdminRole.id,
          name: companyAdminRole.name,
          slug: companyAdminRole.slug,
        });

        console.log('📝 Step 3: Creating Company Admin User...');
        console.log('   User data to create:', {
          companyId: company.id,
          email: adminEmail,
          firstName,
          lastName,
          status: 'ACTIVE',
          isActive: true,
        });

        // 3. Create Company Admin User with COMPANY EMAIL for simplified login
        const adminUser = await prisma.user.create({
          data: {
            companyId: company.id,
            email: adminEmail, // Using company email for admin login
            password: hashedPassword,
            firstName,
            lastName,
            status: 'ACTIVE',
            isActive: true,
            emailVerified: !administrator.sendWelcomeEmail, // Verify if no welcome email
            createdBy: 'system',
          },
        });

        console.log('✅ Company Admin User Created:', {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          companyId: adminUser.companyId,
          isActive: adminUser.isActive,
          status: adminUser.status,
          passwordHash: adminUser.password.substring(0, 20) + '...',
        });

        console.log('📝 Step 4: Assigning Company Admin Role...');
        
        // 4. Assign Company Admin Role
        await prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: companyAdminRole.id,
          },
        });

        console.log('✅ Role Assigned: company-admin → User ' + adminUser.email);

        console.log('📝 Steps 5-10: Creating default resources...');
        
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

        console.log('✅ Default settings created');

        // 6. Contact Groups are not part of the current schema - skip

        // 7. Create Default Knowledge Base
        await prisma.knowledgeBase.create({
          data: {
            companyId: company.id,
            title: 'Default Knowledge Base',
            type: 'CUSTOM',
            content: 'Default knowledge base for company',
            status: 'ACTIVE',
            createdBy: adminUser.id,
          },
        });

        console.log('✅ Default knowledge base created');

        // 8. Create Default AI Agent
        const defaultPrompt = await prisma.prompt.findFirst({
          where: { companyId: company.id },
        });

        await prisma.aIAgent.create({
          data: {
            companyId: company.id,
            agentName: 'Default AI Agent',
            agentType: 'CONVERSATIONAL',
            promptId: defaultPrompt?.id,
            configuration: {},
            metadata: {},
            status: 'IDLE',
            version: '1.0.0',
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
        });

        console.log('✅ Default AI agent created');

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

        console.log('✅ Default prompt created');

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

        console.log('✅ Default script created');

        console.log('📝 Step 11-12: Creating audit logs...');
        
        // 11. Create Audit Log
        await prisma.auditLog.create({
          data: {
            companyId: company.id,
            action: 'COMPANY_CREATED',
            entityType: 'companies',
            entityId: company.id,
            metadata: {
              companyId: company.id,
              companyName: company.name,
              adminEmail: administrator.adminEmail,
              companyCode,
              description: `Company ${company.name} created with administrator ${administrator.fullName}`,
            },
          },
        });

        // 12. Create Activity Log
        await prisma.activityLog.create({
          data: {
            companyId: company.id,
            userId: adminUser.id,
            action: 'USER_CREATED',
            module: 'users',
            details: {
              userId: adminUser.id,
              userEmail: administrator.adminEmail,
              role: 'company-admin',
              description: `Company administrator ${administrator.fullName} created`,
            },
          },
        });

        console.log('✅ Audit logs created');

        // TODO: Send welcome email if requested
        if (administrator.sendWelcomeEmail) {
          // Email service integration
          console.log(`Welcome email should be sent to: ${administrator.adminEmail}`);
        }

        console.log('🎉 TRANSACTION COMPLETE - All steps successful');
        console.log('');
        console.log('🔑 LOGIN CREDENTIALS:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: [As provided during creation]`);
        console.log(`   Role: Company Admin`);
        console.log('');
        console.log('📊 Database Records:');
        console.log(`   Company ID: ${company.id}`);
        console.log(`   Company Email: ${company.email}`);
        console.log(`   Admin User ID: ${adminUser.id}`);
        console.log(`   Admin User Email: ${adminUser.email}`);
        console.log(`   Match: ${company.email === adminUser.email ? '✅ YES' : '❌ NO'}`);
        console.log('');

        return {
          company,
          adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
          },
          companyCode,
          loginCredentials: {
            email: adminEmail,
            message: 'Use this email to log in as Company Admin',
          },
        };
      });

      console.log('✅ COMPANY CREATION SUCCESS');
      console.log('   Company ID:', result.company.id);
      console.log('   Company Name:', result.company.name);
      console.log('   Company Email:', result.company.email);
      console.log('   Admin User ID:', result.adminUser.id);
      console.log('   Admin Login Email:', result.adminUser.email);
      console.log('   📧 Login with:', result.loginCredentials.email);
      console.log('');

      return {
        success: true,
        data: result,
        message: `Company and administrator created successfully. Login with: ${result.loginCredentials.email}`,
      };
    } catch (error: any) {
      console.error('❌ COMPANY CREATION FAILED');
      console.error('   Error Name:', error?.name);
      console.error('   Error Code:', error?.code);
      console.error('   Error Message:', error?.message);
      
      // Transaction will auto-rollback on error
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      // Handle Prisma unique constraint violations (P2002)
      if (error?.code === 'P2002') {
        const field = error?.meta?.target?.[0] || 'field';
        const fieldValue = error?.meta?.target?.[0] === 'email' ? companyData.email : 'unknown';
        
        // Log complete Prisma error for debugging
        console.error('❌ Prisma P2002 Unique Constraint Error:', {
          code: error.code,
          meta: error.meta,
          message: error.message,
          clientVersion: error.clientVersion,
        });

        throw new ConflictException(
          `A record with ${field} '${fieldValue}' already exists. ` +
          `This might be from a previously deleted company. Please contact support for assistance.`
        );
      }

      // Log other errors
      console.error('❌ Complete Error Details:', {
        errorName: error?.name,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorStack: error?.stack,
      });

      throw new BadRequestException(`Failed to create company: ${error?.message || 'Transaction rolled back.'}`);
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

  async findAll(paginationDto: PaginationDto, companyId?: string) {
    const { page, limit, search, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (companyId) {
      where.id = companyId;
    }

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

    // Soft delete with email modification to free up the email for future use
    // This allows the same email to be used for a new company registration
    const timestamp = Date.now();
    const modifiedEmail = `${company.email}__deleted_${timestamp}`;

    await this.prisma.company.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        email: modifiedEmail, // Modify email to release unique constraint
      },
    });

    // Also soft-delete all users in this company
    await this.prisma.user.updateMany({
      where: { 
        companyId: id,
        deletedAt: null,
      },
      data: { 
        deletedAt: new Date(),
      },
    });

    // Create audit log for deletion
    await this.prisma.auditLog.create({
      data: {
        companyId: id,
        action: 'COMPANY_DELETED',
        entityType: 'companies',
        entityId: id,
        metadata: {
          companyId: id,
          companyName: company.name,
          originalEmail: company.email,
          modifiedEmail,
          description: `Company ${company.name} soft-deleted. Email modified to ${modifiedEmail} to allow reuse.`,
        },
      },
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
