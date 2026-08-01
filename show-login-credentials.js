/**
 * Display login credentials for all active users
 * Shows what emails can be used to log in
 */

const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

async function showLoginCredentials() {
  console.log('='.repeat(80));
  console.log('LOGIN CREDENTIALS - ACTIVE USERS');
  console.log('='.repeat(80));
  console.log('');

  const companies = await prisma.company.findMany({
    where: { deletedAt: null, isActive: true },
    include: {
      users: {
        where: { deletedAt: null, isActive: true },
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
    console.log(`📦 Company: ${company.name}`);
    console.log(`   Email: ${company.email}`);
    console.log(`   Created: ${company.createdAt.toISOString().split('T')[0]}`);
    console.log('');

    if (company.users.length === 0) {
      console.log('   ❌ NO ACTIVE USERS - Cannot log in!');
    } else {
      console.log(`   👥 Login Credentials (${company.users.length} users):`);
      console.log('');

      company.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      Name: ${user.firstName} ${user.lastName}`);
        console.log(`      Role: ${user.roles.map(r => r.role.name).join(', ')}`);
        console.log(`      Status: ${user.isActive ? '✅ Active' : '❌ Inactive'}`);
        console.log(`      Created: ${user.createdAt.toISOString().split('T')[0]}`);
        console.log(`      Password: [Set during creation]`);
        console.log('');
      });
    }

    console.log('-'.repeat(80));
    console.log('');
  }

  console.log('📋 LOGIN INSTRUCTIONS:');
  console.log('');
  console.log('To log in:');
  console.log('  1. Use the EMAIL shown above');
  console.log('  2. Use the PASSWORD provided during company creation');
  console.log('  3. If password forgotten, use password reset flow');
  console.log('');
  console.log('Common Passwords (if set during testing):');
  console.log('  - Admin@123');
  console.log('  - Password@123');
  console.log('  - [Check with person who created the company]');
  console.log('');

  // Summary
  const totalUsers = companies.reduce((sum, c) => sum + c.users.length, 0);
  const companiesWithoutUsers = companies.filter(c => c.users.length === 0);

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Active Companies: ${companies.length}`);
  console.log(`Total Active Users: ${totalUsers}`);
  console.log(`Companies without users: ${companiesWithoutUsers.length} ${companiesWithoutUsers.length > 0 ? '❌' : '✅'}`);
  console.log('');

  if (companiesWithoutUsers.length > 0) {
    console.log('⚠️  WARNING: The following companies have no users:');
    companiesWithoutUsers.forEach(c => {
      console.log(`   - ${c.name} (${c.email})`);
    });
    console.log('   These companies cannot be logged into!');
  } else {
    console.log('✅ All companies have active users and can be logged into');
  }
  console.log('');
}

showLoginCredentials()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
