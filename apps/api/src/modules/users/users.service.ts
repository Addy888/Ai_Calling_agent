import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  UserQueryDto, 
  UserResponse, 
  UserListResponse,
  AssignRoleDto,
  ChangePasswordDto,
  ResetPasswordDto
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, createdBy?: string): Promise<UserResponse> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: createUserDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // Create user
    const { roleIds, ...userData } = createUserDto;
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        createdBy,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Assign roles if provided
    if (roleIds && roleIds.length > 0) {
      await this.assignRoles(user.id, roleIds);
    }

    // Fetch updated user with roles
    return this.findOne(user.id);
  }

  async findAll(query: UserQueryDto): Promise<UserListResponse> {
    const { search, companyId, status, roleId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (roleId) {
      where.roles = {
        some: {
          roleId: roleId,
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, updatedBy?: string): Promise<UserResponse> {
    const existingUser = await this.findOne(id);

    // Check if email is being updated and if it conflicts with another user
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: { 
          email: updateUserDto.email, 
          id: { not: id },
          deletedAt: null 
        },
      });

      if (emailConflict) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        updatedBy,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return user;
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    const user = await this.findOne(id);

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    });
  }

  async activate(id: string, updatedBy?: string): Promise<UserResponse> {
    return this.update(id, { isActive: true, status: 'ACTIVE' }, updatedBy);
  }

  async deactivate(id: string, updatedBy?: string): Promise<UserResponse> {
    return this.update(id, { isActive: false, status: 'INACTIVE' }, updatedBy);
  }

  async assignRoles(id: string, roleIds: string[], updatedBy?: string): Promise<UserResponse> {
    const user = await this.findOne(id);

    // Validate all roles exist
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more roles not found');
    }

    // Remove existing roles and add new ones
    await this.prisma.userRole.deleteMany({
      where: { userId: id },
    });

    await this.prisma.userRole.createMany({
      data: roleIds.map(roleId => ({
        userId: id,
        roleId,
      })),
    });

    return this.findOne(id);
  }

  async removeRole(id: string, roleId: string): Promise<UserResponse> {
    const user = await this.findOne(id);

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId: id,
          roleId,
        },
      },
    });

    return this.findOne(id);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto, updatedBy?: string): Promise<void> {
    const user = await this.findOne(id);

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedBy,
      },
    });
  }

  async resetPassword(id: string, resetPasswordDto: ResetPasswordDto, updatedBy?: string): Promise<void> {
    const user = await this.findOne(id);

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedBy,
      },
    });
  }

  async getProfile(id: string): Promise<UserResponse> {
    return this.findOne(id);
  }

  async updateProfile(id: string, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    return this.update(id, updateUserDto, id);
  }

  async getByEmail(email: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        company: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
