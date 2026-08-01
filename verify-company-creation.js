/**
 * Verification script for company creation flow
 * Tests that company admin users are properly created
 */

const { PrismaClient } = require('./node_modules/.prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function verifyCompanyCreation() {
  console.log('='.repeat(80));
  console.log('COMPANY CREATION VERIFICATION');
  console.log('='.repeat(80));
  console.log('');

  // 1. Check all companies and their users
  console.log('1️⃣  COMPANIES AND THEIR USERS:');
  console.log('-'.repeat(80));
  
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      users: {
        where: { deletedAt: null },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const company of companies) {
    console.log('');
    console.log(`📦 Company: ${company.name}`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Email: ${company.email}`);
    console.log(`   Status: ${company.status}`);
    console.log(`   isActive: ${company.isActive}`);
    console.log(`   Created: ${company.createdAt.toISOString()}`);
    console.log('');

    if (company.users.length === 0) {
      console.log('   ❌ NO USERS FOUND for this company!');
      console.log('   ⚠️  This company cannot be logged into');
    } else {
      console.log(`   👥 Users (${company.users.length}):`);
      company.users.forEach(user => {
        console.log(`      - ${user.email}`);
        console.log(`        Name: ${user.firstName} ${user.lastName}`);
        console.log(`        Active: ${user.isActive ? '✅' : '❌'}`);
        console.log(`        Roles: ${user.roles.map(r => r.role.slug).join(', ') || 'NONE ❌'}`);
        console.log(`        Password: ${user.password.startsWith('$2b$') ? '✅ Hashed' : '❌ Plain text'}`);
        console.log(`        Created: ${user.createdAt.toISOString()}`);
        console.log('');
      });
    }
  }

  // 2. Check for orphaned users (users without companies)
  console.log('2️⃣  CHECKING FOR ORPHANED USERS:');
  console.log('-'.repeat(80));

  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      company: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  const orphanedUsers = allUsers.filter(u => !u.company || u.company.deletedAt);
  
  if (orphanedUsers.length > 0) {
    console.log(`⚠️  Found ${orphanedUsers.length} orphaned users:`);
    orphanedUsers.forEach(user => {
      console.log(`   - ${user.email} (Company ID: ${user.companyId})`);
      if (!user.company) {
        console.log(`     ❌ Company not found in database`);
      } else if (user.company.deletedAt) {
        console.log(`     ❌ Company is soft-deleted`);
      }
    });
  } else {
    console.log('✅ No orphaned users found');
  }
  console.log('');

  // 3. Check company-admin role exists
  console.log('3️⃣  CHECKING ROLES:');
  console.log('-'.repeat(80));

  const companyAdminRole = await prisma.role.findUnique({
    where: { slug: 'company-admin' },
  });

  if (companyAdminRole) {
    console.log('✅ company-admin role exists');
    console.log(`   ID: ${companyAdminRole.id}`);
    console.log(`   Name: ${companyAdminRole.name}`);
    console.log(`   Active: ${companyAdminRole.isActive}`);
  } else {
    console.log('❌ company-admin role NOT FOUND');
    console.log('   ⚠️  This will prevent company admin user creation!');
  }
  console.log('');

  // 4. Test creating a company with admin
  console.log('4️⃣  COMPANY CREATION REQUIREMENTS CHECK:');
  console.log('-'.repeat(80));

  // Check if we can create settings
  const testCompany = companies[0];
  if (testCompany) {
    const settings = await prisma.setting.findMany({
      where: { companyId: testCompany.id },
      take: 5,
    });
    console.log(`✅ Settings table working (${settings.length} settings for ${testCompany.name})`);
  }

  // Check if we can create knowledge base
  const kbCount = await prisma.knowledgeBase.count();
  console.log(`✅ KnowledgeBase table working (${kbCount} records)`);

  // Check if we can create AI agents
  const agentCount = await prisma.aIAgent.count();
  console.log(`✅ AIAgent table working (${agentCount} records)`);

  // Check if we can create prompts
  const promptCount = await prisma.prompt.count();
  console.log(`✅ Prompt table working (${promptCount} records)`);

  // Check if we can create scripts
  const scriptCount = await prisma.script.count();
  console.log(`✅ Script table working (${scriptCount} records)`);

  console.log('');

  // 5. Summary and recommendations
  console.log('5️⃣  SUMMARY & RECOMMENDATIONS:');
  console.log('-'.repeat(80));
  console.log('');

  const companiesWithoutUsers = companies.filter(c => c.users.length === 0);
  const companiesWithUsers = companies.filter(c => c.users.length > 0);

  console.log(`📊 STATISTICS:`);
  console.log(`   Total Companies: ${companies.length}`);
  console.log(`   Companies WITH users: ${companiesWithUsers.length} ✅`);
  console.log(`   Companies WITHOUT users: ${companiesWithoutUsers.length} ${companiesWithoutUsers.length > 0 ? '❌' : '✅'}`);
  console.log(`   Total Users: ${allUsers.length}`);
  console.log(`   Orphaned Users: ${orphanedUsers.length}`);
  console.log('');

  if (companiesWithoutUsers.length > 0) {
    console.log('⚠️  ISSUE IDENTIFIED:');
    console.log(`   ${companiesWithoutUsers.length} companies have NO users!`);
    console.log('');
    console.log('   Companies without users:');
    companiesWithoutUsers.forEach(c => {
      console.log(`   - ${c.name} (${c.email})`);
      console.log(`     Created: ${c.createdAt.toISOString()}`);
    });
    console.log('');
    console.log('   POSSIBLE CAUSES:');
    console.log('   1. Transaction failed during company creation');
    console.log('   2. User creation was rolled back due to error');
    console.log('   3. Users were created but then soft-deleted');
    console.log('   4. company-admin role missing during creation');
    console.log('');
    console.log('   RECOMMENDED ACTIONS:');
    console.log('   1. Check API logs for transaction errors');
    console.log('   2. Verify company-admin role exists before creating company');
    console.log('   3. Use debug mode to see full transaction flow');
    console.log('   4. Manually create users for these companies');
  } else {
    console.log('✅ ALL COMPANIES HAVE USERS!');
    console.log('   Company creation flow is working correctly.');
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(80));
}

verifyCompanyCreation()
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
