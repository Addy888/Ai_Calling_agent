import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { 
  CreatePermissionDto, 
  UpdatePermissionDto, 
  PermissionQueryDto, 
  PermissionResponse, 
  PermissionListResponse,
  ModulePermissionsResponse
} from './dto/permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPermissionDto: CreatePermissionDto, createdBy?: string): Promise<PermissionResponse> {
    // Check if permission name or slug already exists
    const existingPermission = await this.prisma.permission.findFirst({
      where: {
        OR: [
          { name: createPermissionDto.name },
          { slug: createPermissionDto.slug }
        ],
        deletedAt: null,
      },
    });

    if (existingPermission) {
      throw new ConflictException('Permission with this name or slug already exists');
    }

    const permission = await this.prisma.permission.create({
      data: {
        ...createPermissionDto,
        createdBy,
      },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    return permission;
  }

  async findAll(query: PermissionQueryDto): Promise<PermissionListResponse> {
    const { search, module, status, page = 1, limit = 10, sortBy = 'module', sortOrder = 'asc' } = query;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (module) {
      where.module = module;
    }

    if (status) {
      where.status = status;
    }

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        include: {
          _count: {
            select: {
              roles: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      permissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<PermissionResponse> {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto, updatedBy?: string): Promise<PermissionResponse> {
    const existingPermission = await this.findOne(id);

    // Check if name or slug is being updated and if it conflicts with another permission
    if ((updatePermissionDto.name && updatePermissionDto.name !== existingPermission.name) || 
        (updatePermissionDto.slug && updatePermissionDto.slug !== existingPermission.slug)) {
      const conflictPermission = await this.prisma.permission.findFirst({
        where: { 
          OR: [
            { name: updatePermissionDto.name },
            { slug: updatePermissionDto.slug }
          ],
          id: { not: id },
          deletedAt: null 
        },
      });

      if (conflictPermission) {
        throw new ConflictException('Permission with this name or slug already exists');
      }
    }

    const permission = await this.prisma.permission.update({
      where: { id },
      data: {
        ...updatePermissionDto,
        updatedBy,
      },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    return permission;
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    const permission = await this.findOne(id);

    // Check if permission has roles assigned
    const rolesCount = await this.prisma.rolePermission.count({
      where: { permissionId: id },
    });

    if (rolesCount > 0) {
      throw new BadRequestException('Cannot delete permission that is assigned to roles');
    }

    // Soft delete
    await this.prisma.permission.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    });
  }

  async findByModule(module: string): Promise<ModulePermissionsResponse> {
    const permissions = await this.prisma.permission.findMany({
      where: { 
        module,
        deletedAt: null 
      },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      module,
      permissions,
    };
  }

  async getAllModules(): Promise<string[]> {
    const result = await this.prisma.permission.groupBy({
      by: ['module'],
      where: { deletedAt: null },
      orderBy: { module: 'asc' },
    });

    return result.map(item => item.module);
  }

  async seedDefaultPermissions(): Promise<void> {
    const modules = [
      {
        name: 'companies',
        permissions: [
          { name: 'View Companies', slug: 'view-companies', description: 'Can view company list and details' },
          { name: 'Create Companies', slug: 'create-companies', description: 'Can create new companies' },
          { name: 'Edit Companies', slug: 'edit-companies', description: 'Can edit company information' },
          { name: 'Delete Companies', slug: 'delete-companies', description: 'Can delete companies' },
          { name: 'Upload Company Logo', slug: 'upload-company-logo', description: 'Can upload company logos' },
          { name: 'Manage Company Settings', slug: 'manage-company-settings', description: 'Can manage company settings' },
        ]
      },
      {
        name: 'users',
        permissions: [
          { name: 'View Users', slug: 'view-users', description: 'Can view user list and profiles' },
          { name: 'Create Users', slug: 'create-users', description: 'Can create new users' },
          { name: 'Edit Users', slug: 'edit-users', description: 'Can edit user information' },
          { name: 'Delete Users', slug: 'delete-users', description: 'Can delete users' },
          { name: 'Activate Users', slug: 'activate-users', description: 'Can activate/deactivate users' },
          { name: 'Reset User Passwords', slug: 'reset-user-passwords', description: 'Can reset user passwords' },
          { name: 'Assign User Roles', slug: 'assign-user-roles', description: 'Can assign roles to users' },
          { name: 'View User Profiles', slug: 'view-user-profiles', description: 'Can view user profiles' },
        ]
      },
      {
        name: 'roles',
        permissions: [
          { name: 'View Roles', slug: 'view-roles', description: 'Can view role list and details' },
          { name: 'Create Roles', slug: 'create-roles', description: 'Can create new roles' },
          { name: 'Edit Roles', slug: 'edit-roles', description: 'Can edit role information' },
          { name: 'Delete Roles', slug: 'delete-roles', description: 'Can delete roles' },
          { name: 'Assign Role Permissions', slug: 'assign-role-permissions', description: 'Can assign permissions to roles' },
          { name: 'View Permission Matrix', slug: 'view-permission-matrix', description: 'Can view role permission matrix' },
        ]
      },
      {
        name: 'permissions',
        permissions: [
          { name: 'View Permissions', slug: 'view-permissions', description: 'Can view permission list and details' },
          { name: 'Create Permissions', slug: 'create-permissions', description: 'Can create new permissions' },
          { name: 'Edit Permissions', slug: 'edit-permissions', description: 'Can edit permission information' },
          { name: 'Delete Permissions', slug: 'delete-permissions', description: 'Can delete permissions' },
          { name: 'Seed Permissions', slug: 'seed-permissions', description: 'Can seed default permissions' },
        ]
      },
      {
        name: 'campaigns',
        permissions: [
          { name: 'View Campaigns', slug: 'view-campaigns', description: 'Can view campaign list and details' },
          { name: 'Create Campaigns', slug: 'create-campaigns', description: 'Can create new campaigns' },
          { name: 'Edit Campaigns', slug: 'edit-campaigns', description: 'Can edit campaign information' },
          { name: 'Delete Campaigns', slug: 'delete-campaigns', description: 'Can delete campaigns' },
          { name: 'Manage Campaign Status', slug: 'manage-campaign-status', description: 'Can start/stop campaigns' },
          { name: 'View Campaign Analytics', slug: 'view-campaign-analytics', description: 'Can view campaign analytics' },
        ]
      },
      {
        name: 'contacts',
        permissions: [
          { name: 'View Contacts', slug: 'view-contacts', description: 'Can view contact list and details' },
          { name: 'Create Contacts', slug: 'create-contacts', description: 'Can create new contacts' },
          { name: 'Edit Contacts', slug: 'edit-contacts', description: 'Can edit contact information' },
          { name: 'Delete Contacts', slug: 'delete-contacts', description: 'Can delete contacts' },
          { name: 'Import Contacts', slug: 'import-contacts', description: 'Can import contact lists' },
          { name: 'Export Contacts', slug: 'export-contacts', description: 'Can export contact lists' },
        ]
      },
      {
        name: 'analytics',
        permissions: [
          { name: 'View Analytics', slug: 'view-analytics', description: 'Can view system analytics' },
          { name: 'View Reports', slug: 'view-reports', description: 'Can view detailed reports' },
          { name: 'Export Reports', slug: 'export-reports', description: 'Can export analytics reports' },
        ]
      },
    ];

    for (const module of modules) {
      for (const permission of module.permissions) {
        await this.prisma.permission.upsert({
          where: { slug: permission.slug },
          create: {
            ...permission,
            module: module.name,
            status: 'ACTIVE',
          },
          update: {
            name: permission.name,
            description: permission.description,
          },
        });
      }
    }
  }
}