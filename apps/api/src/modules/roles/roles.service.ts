import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { 
  CreateRoleDto, 
  UpdateRoleDto, 
  RoleQueryDto, 
  RoleResponse, 
  RoleListResponse,
  AssignPermissionsDto,
  PermissionMatrixResponse
} from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto, createdBy?: string): Promise<RoleResponse> {
    // Check if role name or slug already exists
    const existingRole = await this.prisma.role.findFirst({
      where: {
        OR: [
          { name: createRoleDto.name },
          { slug: createRoleDto.slug }
        ],
        deletedAt: null,
      },
    });

    if (existingRole) {
      throw new ConflictException('Role with this name or slug already exists');
    }

    // Create role
    const { permissionIds, ...roleData } = createRoleDto;
    const role = await this.prisma.role.create({
      data: {
        ...roleData,
        createdBy,
      },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                slug: true,
                module: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      await this.assignPermissions(role.id, permissionIds);
    }

    // Fetch updated role with permissions
    return this.findOne(role.id);
  }

  async findAll(query: RoleQueryDto): Promise<RoleListResponse> {
    const { search, status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  module: true,
                  description: true,
                },
              },
            },
          },
          _count: {
            select: {
              users: true,
              permissions: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      roles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<RoleResponse> {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                slug: true,
                module: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, updatedBy?: string): Promise<RoleResponse> {
    const existingRole = await this.findOne(id);

    // Check if name or slug is being updated and if it conflicts with another role
    if ((updateRoleDto.name && updateRoleDto.name !== existingRole.name) || 
        (updateRoleDto.slug && updateRoleDto.slug !== existingRole.slug)) {
      const conflictRole = await this.prisma.role.findFirst({
        where: { 
          OR: [
            { name: updateRoleDto.name },
            { slug: updateRoleDto.slug }
          ],
          id: { not: id },
          deletedAt: null 
        },
      });

      if (conflictRole) {
        throw new ConflictException('Role with this name or slug already exists');
      }
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        ...updateRoleDto,
        updatedBy,
      },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                slug: true,
                module: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    return role;
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    const role = await this.findOne(id);

    // Check if role has users assigned
    const usersCount = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (usersCount > 0) {
      throw new BadRequestException('Cannot delete role that has users assigned to it');
    }

    // Soft delete
    await this.prisma.role.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    });
  }

  async assignPermissions(id: string, permissionIds: string[], updatedBy?: string): Promise<RoleResponse> {
    const role = await this.findOne(id);

    // Validate all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { 
        id: { in: permissionIds },
        deletedAt: null 
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Remove existing permissions and add new ones
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    await this.prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({
        roleId: id,
        permissionId,
      })),
    });

    return this.findOne(id);
  }

  async removePermission(id: string, permissionId: string): Promise<RoleResponse> {
    const role = await this.findOne(id);

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: id,
          permissionId,
        },
      },
    });

    return this.findOne(id);
  }

  async getPermissionMatrix(id: string): Promise<PermissionMatrixResponse> {
    const role = await this.findOne(id);

    // Get all permissions grouped by module
    const allPermissions = await this.prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: [
        { module: 'asc' },
        { name: 'asc' }
      ],
    });

    // Get assigned permissions for this role
    const assignedPermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: id },
      select: { permissionId: true },
    });

    const assignedPermissionIds = new Set(assignedPermissions.map(p => p.permissionId));

    // Group permissions by module
    const permissionsByModule = allPermissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push({
        id: permission.id,
        name: permission.name,
        slug: permission.slug,
        description: permission.description,
        assigned: assignedPermissionIds.has(permission.id),
      });
      return acc;
    }, {} as Record<string, any[]>);

    return {
      role: {
        id: role.id,
        name: role.name,
        slug: role.slug,
      },
      permissions: Object.entries(permissionsByModule).map(([module, permissions]) => ({
        module,
        permissions,
      })),
    };
  }

  async activate(id: string, updatedBy?: string): Promise<RoleResponse> {
    return this.update(id, { isActive: true, status: 'ACTIVE' }, updatedBy);
  }

  async deactivate(id: string, updatedBy?: string): Promise<RoleResponse> {
    return this.update(id, { isActive: false, status: 'INACTIVE' }, updatedBy);
  }
}