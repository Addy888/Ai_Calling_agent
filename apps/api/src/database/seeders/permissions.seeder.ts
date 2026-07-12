import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPermissions() {
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
      name: 'scripts',
      permissions: [
        { name: 'View Scripts', slug: 'view-scripts', description: 'Can view script list and details' },
        { name: 'Create Scripts', slug: 'create-scripts', description: 'Can create new scripts' },
        { name: 'Edit Scripts', slug: 'edit-scripts', description: 'Can edit script content' },
        { name: 'Delete Scripts', slug: 'delete-scripts', description: 'Can delete scripts' },
        { name: 'Test Scripts', slug: 'test-scripts', description: 'Can test script functionality' },
      ]
    },
    {
      name: 'analytics',
      permissions: [
        { name: 'View Analytics', slug: 'view-analytics', description: 'Can view system analytics' },
        { name: 'View Reports', slug: 'view-reports', description: 'Can view detailed reports' },
        { name: 'Export Reports', slug: 'export-reports', description: 'Can export analytics reports' },
        { name: 'Configure Analytics', slug: 'configure-analytics', description: 'Can configure analytics settings' },
      ]
    },
  ];

  console.log('🌱 Seeding permissions...');

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const module of modules) {
    for (const permission of module.permissions) {
      const result = await prisma.permission.upsert({
        where: { slug: permission.slug },
        create: {
          ...permission,
          module: module.name,
          status: 'ACTIVE',
        },
        update: {
          name: permission.name,
          description: permission.description,
          module: module.name,
        },
      });

      if (result.createdAt === result.updatedAt) {
        totalCreated++;
      } else {
        totalUpdated++;
      }
    }
  }

  console.log(`✅ Permissions seeded: ${totalCreated} created, ${totalUpdated} updated`);
}

export async function seedRoles() {
  const roles = [
    {
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Full system access with all permissions',
      permissions: 'ALL', // Special flag to assign all permissions
    },
    {
      name: 'Administrator',
      slug: 'admin',
      description: 'Administrative access to most system features',
      permissions: [
        'view-companies', 'create-companies', 'edit-companies', 'upload-company-logo', 'manage-company-settings',
        'view-users', 'create-users', 'edit-users', 'activate-users', 'reset-user-passwords', 'assign-user-roles', 'view-user-profiles',
        'view-roles', 'create-roles', 'edit-roles', 'assign-role-permissions', 'view-permission-matrix',
        'view-permissions',
        'view-campaigns', 'create-campaigns', 'edit-campaigns', 'delete-campaigns', 'manage-campaign-status', 'view-campaign-analytics',
        'view-contacts', 'create-contacts', 'edit-contacts', 'delete-contacts', 'import-contacts', 'export-contacts',
        'view-scripts', 'create-scripts', 'edit-scripts', 'delete-scripts', 'test-scripts',
        'view-analytics', 'view-reports', 'export-reports',
      ],
    },
    {
      name: 'Manager',
      slug: 'manager',
      description: 'Management level access to campaigns and team operations',
      permissions: [
        'view-companies', 'edit-companies',
        'view-users', 'create-users', 'edit-users', 'view-user-profiles',
        'view-roles',
        'view-campaigns', 'create-campaigns', 'edit-campaigns', 'manage-campaign-status', 'view-campaign-analytics',
        'view-contacts', 'create-contacts', 'edit-contacts', 'import-contacts', 'export-contacts',
        'view-scripts', 'create-scripts', 'edit-scripts', 'test-scripts',
        'view-analytics', 'view-reports',
      ],
    },
    {
      name: 'Agent',
      slug: 'agent',
      description: 'Basic access for campaign agents',
      permissions: [
        'view-companies',
        'view-users', 'view-user-profiles',
        'view-campaigns', 'view-campaign-analytics',
        'view-contacts', 'create-contacts', 'edit-contacts',
        'view-scripts',
        'view-analytics',
      ],
    },
    {
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access to most system features',
      permissions: [
        'view-companies',
        'view-users',
        'view-campaigns',
        'view-contacts',
        'view-scripts',
        'view-analytics',
      ],
    },
  ];

  console.log('🌱 Seeding roles...');

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const roleData of roles) {
    // Create or update role
    const role = await prisma.role.upsert({
      where: { slug: roleData.slug },
      create: {
        name: roleData.name,
        slug: roleData.slug,
        description: roleData.description,
        status: 'ACTIVE',
      },
      update: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    if (role.createdAt === role.updatedAt) {
      totalCreated++;
    } else {
      totalUpdated++;
    }

    // Clear existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Assign permissions
    let permissionsToAssign: string[] = [];

    if (roleData.permissions === 'ALL') {
      // Get all permission slugs
      const allPermissions = await prisma.permission.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      permissionsToAssign = allPermissions.map(p => p.id);
    } else {
      // Get specific permissions by slug
      const permissions = await prisma.permission.findMany({
        where: {
          slug: { in: roleData.permissions as string[] },
          deletedAt: null,
        },
        select: { id: true },
      });
      permissionsToAssign = permissions.map(p => p.id);
    }

    // Create role permissions
    if (permissionsToAssign.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToAssign.map(permissionId => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
  }

  console.log(`✅ Roles seeded: ${totalCreated} created, ${totalUpdated} updated`);
}

export async function seedAll() {
  try {
    await seedPermissions();
    await seedRoles();
    console.log('🎉 All seeds completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedAll()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}