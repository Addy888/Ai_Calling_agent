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
      phone: '+1-555-0100',
      website: 'https://aicallingagent.com',
      isActive: true,
    },
  });
  console.log('✅ Company created:', company.name);

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { slug: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      slug: 'admin',
      description: 'Full system access',
      isActive: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { slug: 'manager' },
    update: {},
    create: {
      name: 'Manager',
      slug: 'manager',
      description: 'Campaign and team management access',
      isActive: true,
    },
  });

  const agentRole = await prisma.role.upsert({
    where: { slug: 'agent' },
    update: {},
    create: {
      name: 'Agent',
      slug: 'agent',
      description: 'Basic campaign access',
      isActive: true,
    },
  });
  console.log('✅ Roles created: Admin, Manager, Agent');

  // Create default permissions
  const permissions = [
    // User Management
    { name: 'View Users', slug: 'users.view', module: 'users' },
    { name: 'Create Users', slug: 'users.create', module: 'users' },
    { name: 'Edit Users', slug: 'users.edit', module: 'users' },
    { name: 'Delete Users', slug: 'users.delete', module: 'users' },
    
    // Campaign Management
    { name: 'View Campaigns', slug: 'campaigns.view', module: 'campaigns' },
    { name: 'Create Campaigns', slug: 'campaigns.create', module: 'campaigns' },
    { name: 'Edit Campaigns', slug: 'campaigns.edit', module: 'campaigns' },
    { name: 'Delete Campaigns', slug: 'campaigns.delete', module: 'campaigns' },
    
    // Contact Management
    { name: 'View Contacts', slug: 'contacts.view', module: 'contacts' },
    { name: 'Create Contacts', slug: 'contacts.create', module: 'contacts' },
    { name: 'Edit Contacts', slug: 'contacts.edit', module: 'contacts' },
    { name: 'Delete Contacts', slug: 'contacts.delete', module: 'contacts' },
    
    // Script Management
    { name: 'View Scripts', slug: 'scripts.view', module: 'scripts' },
    { name: 'Create Scripts', slug: 'scripts.create', module: 'scripts' },
    { name: 'Edit Scripts', slug: 'scripts.edit', module: 'scripts' },
    { name: 'Delete Scripts', slug: 'scripts.delete', module: 'scripts' },
    
    // Knowledge Base
    { name: 'View Knowledge Base', slug: 'knowledge.view', module: 'knowledge' },
    { name: 'Create Knowledge Base', slug: 'knowledge.create', module: 'knowledge' },
    { name: 'Edit Knowledge Base', slug: 'knowledge.edit', module: 'knowledge' },
    { name: 'Delete Knowledge Base', slug: 'knowledge.delete', module: 'knowledge' },
    
    // Settings
    { name: 'View Settings', slug: 'settings.view', module: 'settings' },
    { name: 'Edit Settings', slug: 'settings.edit', module: 'settings' },
    
    // Analytics
    { name: 'View Analytics', slug: 'analytics.view', module: 'analytics' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: {
        name: perm.name,
        slug: perm.slug,
        module: perm.module,
      },
    });
  }
  console.log(`✅ ${permissions.length} permissions created`);

  // Assign all permissions to admin role
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
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
    });
  }
  console.log('✅ Admin role permissions assigned');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aicallingagent.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@aicallingagent.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log('✅ Admin role assigned to admin user');

  // Create sample script
  await prisma.script.create({
    data: {
      companyId: company.id,
      name: 'Welcome Script',
      language: 'en',
      description: 'Default welcome script for new campaigns',
      content: 'Hello, this is a call from {{company_name}}. How can I help you today?',
      version: '1.0.0',
      isActive: true,
    },
  });
  console.log('✅ Sample script created');

  // Create sample prompt
  await prisma.prompt.create({
    data: {
      companyId: company.id,
      name: 'Customer Service Prompt',
      description: 'Default prompt for customer service calls',
      content: 'You are a helpful customer service agent. Be polite and professional.',
      version: '1.0.0',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Sample prompt created');

  // Create sample knowledge base entries
  await prisma.knowledgeBase.createMany({
    data: [
      {
        companyId: company.id,
        title: 'Product Pricing',
        type: 'PRICING',
        content: 'Our pricing starts at $99/month for the basic plan.',
        category: 'Sales',
      },
      {
        companyId: company.id,
        title: 'Refund Policy',
        type: 'POLICY',
        content: 'We offer a 30-day money-back guarantee.',
        category: 'Support',
      },
      {
        companyId: company.id,
        title: 'What is your service?',
        type: 'FAQ',
        content: 'We provide AI-powered calling solutions for businesses.',
        category: 'General',
      },
    ],
  });
  console.log('✅ Sample knowledge base entries created');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Admin Credentials:');
  console.log('   Email: admin@aicallingagent.com');
  console.log('   Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
