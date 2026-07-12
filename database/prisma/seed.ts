import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default company
  const company = await prisma.company.upsert({
    where: { email: 'admin@aicallingagent.com' },
    update: {},
    create: {
      name: 'AI Calling Agent',
      email: 'admin@aicallingagent.com',
      phone: '+1-555-0123',
      address: '123 Tech Street, San Francisco, CA 94105',
      website: 'https://aicallingagent.com',
      status: 'ACTIVE',
      isActive: true,
      createdBy: 'system',
    },
  });

  console.log('✅ Created default company:', company.name);

  // Create permissions
  const permissions = [
    // User Management
    { name: 'View Users', slug: 'users.view', module: 'users' },
    { name: 'Create Users', slug: 'users.create', module: 'users' },
    { name: 'Update Users', slug: 'users.update', module: 'users' },
    { name: 'Delete Users', slug: 'users.delete', module: 'users' },

    // Role Management
    { name: 'View Roles', slug: 'roles.view', module: 'roles' },
    { name: 'Create Roles', slug: 'roles.create', module: 'roles' },
    { name: 'Update Roles', slug: 'roles.update', module: 'roles' },
    { name: 'Delete Roles', slug: 'roles.delete', module: 'roles' },

    // Permission Management
    { name: 'View Permissions', slug: 'permissions.view', module: 'permissions' },
    { name: 'Create Permissions', slug: 'permissions.create', module: 'permissions' },
    { name: 'Update Permissions', slug: 'permissions.update', module: 'permissions' },
    { name: 'Delete Permissions', slug: 'permissions.delete', module: 'permissions' },

    // Company Management
    { name: 'View Companies', slug: 'companies.view', module: 'companies' },
    { name: 'Create Companies', slug: 'companies.create', module: 'companies' },
    { name: 'Update Companies', slug: 'companies.update', module: 'companies' },
    { name: 'Delete Companies', slug: 'companies.delete', module: 'companies' },

    // Contact Management
    { name: 'View Contacts', slug: 'contacts.view', module: 'contacts' },
    { name: 'Create Contacts', slug: 'contacts.create', module: 'contacts' },
    { name: 'Update Contacts', slug: 'contacts.update', module: 'contacts' },
    { name: 'Delete Contacts', slug: 'contacts.delete', module: 'contacts' },
    { name: 'Import Contacts', slug: 'contacts.import', module: 'contacts' },
    { name: 'Export Contacts', slug: 'contacts.export', module: 'contacts' },
    { name: 'Bulk Update Contacts', slug: 'contacts.bulk-update', module: 'contacts' },

    // Campaign Management
    { name: 'View Campaigns', slug: 'campaigns.view', module: 'campaigns' },
    { name: 'Create Campaigns', slug: 'campaigns.create', module: 'campaigns' },
    { name: 'Update Campaigns', slug: 'campaigns.update', module: 'campaigns' },
    { name: 'Delete Campaigns', slug: 'campaigns.delete', module: 'campaigns' },
    { name: 'Execute Campaigns', slug: 'campaigns.execute', module: 'campaigns' },

    // Call Management
    { name: 'View Calls', slug: 'calls.view', module: 'calls' },
    { name: 'Create Calls', slug: 'calls.create', module: 'calls' },
    { name: 'Update Calls', slug: 'calls.update', module: 'calls' },
    { name: 'Delete Calls', slug: 'calls.delete', module: 'calls' },

    // Script Management
    { name: 'View Scripts', slug: 'scripts.view', module: 'scripts' },
    { name: 'Create Scripts', slug: 'scripts.create', module: 'scripts' },
    { name: 'Update Scripts', slug: 'scripts.update', module: 'scripts' },
    { name: 'Delete Scripts', slug: 'scripts.delete', module: 'scripts' },

    // Prompt Management
    { name: 'View Prompts', slug: 'prompts.view', module: 'prompts' },
    { name: 'Create Prompts', slug: 'prompts.create', module: 'prompts' },
    { name: 'Update Prompts', slug: 'prompts.update', module: 'prompts' },
    { name: 'Delete Prompts', slug: 'prompts.delete', module: 'prompts' },

    // Knowledge Base Management
    { name: 'View Knowledge Base', slug: 'knowledge-base.view', module: 'knowledge-base' },
    { name: 'Create Knowledge Base', slug: 'knowledge-base.create', module: 'knowledge-base' },
    { name: 'Update Knowledge Base', slug: 'knowledge-base.update', module: 'knowledge-base' },
    { name: 'Delete Knowledge Base', slug: 'knowledge-base.delete', module: 'knowledge-base' },

    // Voice Profile Management
    { name: 'View Voice Profiles', slug: 'voice-profiles.view', module: 'voice-profiles' },
    { name: 'Create Voice Profiles', slug: 'voice-profiles.create', module: 'voice-profiles' },
    { name: 'Update Voice Profiles', slug: 'voice-profiles.update', module: 'voice-profiles' },
    { name: 'Delete Voice Profiles', slug: 'voice-profiles.delete', module: 'voice-profiles' },

    // Analytics
    { name: 'View Analytics', slug: 'analytics.view', module: 'analytics' },
    { name: 'Export Analytics', slug: 'analytics.export', module: 'analytics' },

    // Settings
    { name: 'View Settings', slug: 'settings.view', module: 'settings' },
    { name: 'Update Settings', slug: 'settings.update', module: 'settings' },

    // Activity Logs
    { name: 'View Activity Logs', slug: 'activity-logs.view', module: 'activity-logs' },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((permission) =>
      prisma.permission.upsert({
        where: { slug: permission.slug },
        update: {},
        create: {
          ...permission,
          status: 'ACTIVE',
          createdBy: 'system',
        },
      }),
    ),
  );

  console.log('✅ Created permissions:', createdPermissions.length);

  // Create roles
  const superAdminRole = await prisma.role.upsert({
    where: { slug: 'super-admin' },
    update: {},
    create: {
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Full system access with all permissions',
      status: 'ACTIVE',
      isActive: true,
      createdBy: 'system',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { slug: 'admin' },
    update: {},
    create: {
      name: 'Admin',
      slug: 'admin',
      description: 'Administrative access without user management',
      status: 'ACTIVE',
      isActive: true,
      createdBy: 'system',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { slug: 'manager' },
    update: {},
    create: {
      name: 'Manager',
      slug: 'manager',
      description: 'Campaign and contact management access',
      status: 'ACTIVE',
      isActive: true,
      createdBy: 'system',
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { slug: 'viewer' },
    update: {},
    create: {
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access to most features',
      status: 'ACTIVE',
      isActive: true,
      createdBy: 'system',
    },
  });

  console.log('✅ Created roles');

  // Assign all permissions to Super Admin
  await Promise.all(
    createdPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  // Assign most permissions to Admin (excluding user/role management)
  const adminPermissions = createdPermissions.filter(
    (p) => !['users', 'roles', 'permissions'].includes(p.module),
  );
  await Promise.all(
    adminPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  // Assign management permissions to Manager
  const managerPermissions = createdPermissions.filter((p) =>
    ['contacts', 'campaigns', 'calls', 'scripts', 'prompts', 'analytics'].includes(p.module),
  );
  await Promise.all(
    managerPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  // Assign view permissions to Viewer
  const viewPermissions = createdPermissions.filter((p) => p.slug.endsWith('.view'));
  await Promise.all(
    viewPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: viewerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      }),
    ),
  );

  console.log('✅ Assigned permissions to roles');

  // Create default super admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@aicallingagent.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@aicallingagent.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      isActive: true,
      emailVerified: true,
      createdBy: 'system',
    },
  });

  // Assign Super Admin role to the user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('✅ Created super admin user');
  console.log('📧 Email: admin@aicallingagent.com');
  console.log('🔑 Password: Admin@123');

  console.log('🌱 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });