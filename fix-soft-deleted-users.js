/**
 * Fix soft-deleted users for active companies
 * This script restores users that were soft-deleted but belong to active companies
 */

const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function fixSoftDeletedUsers() {
  console.log('='.repeat(80));
  console.log('FIXING SOFT-DELETED USERS FOR ACTIVE COMPANIES');
  console.log('='.repeat(80));
  console.log('');

  // 1. Find all active companies
  console.log('1️⃣  Finding active companies...');
  console.log('-'.repeat(80));
  
  const activeCompanies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  console.log(`Found ${activeCompanies.length} active companies`);
  console.table(activeCompanies);
  console.log('');

  // 2. Find soft-deleted users for these companies
  console.log('2️⃣  Finding soft-deleted users for active companies...');
  console.log('-'.repeat(80));

  const softDeletedUsers = await prisma.user.findMany({
    where: {
      deletedAt: { not: null },
      companyId: { in: activeCompanies.map(c => c.id) },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyId: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (softDeletedUsers.length === 0) {
    console.log('✅ No soft-deleted users found for active companies');
    console.log('');
    return;
  }

  console.log(`Found ${softDeletedUsers.length} soft-deleted users for active companies:`);
  console.table(softDeletedUsers);
  console.log('');

  // 3. Restore these users
  console.log('3️⃣  Restoring soft-deleted users...');
  console.log('-'.repeat(80));

  const updates = [];

  for (const user of softDeletedUsers) {
    const company = activeCompanies.find(c => c.id === user.companyId);
    
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          deletedAt: null,
          isActive: true, // Ensure user is also active
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          action: 'USER_RESTORED',
          entityType: 'users',
          entityId: user.id,
          metadata: {
            reason: 'COMPANY_ACTIVE_USER_DELETED',
            email: user.email,
            companyName: company?.name,
            description: `User ${user.email} restored because company ${company?.name} is active`,
          },
        },
      });

      updates.push({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        company: company?.name,
        status: '✅ RESTORED',
      });

      console.log(`✅ Restored ${user.email} (Company: ${company?.name})`);
    } catch (error) {
      updates.push({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        company: company?.name,
        status: `❌ FAILED: ${error.message}`,
      });

      console.error(`❌ Failed to restore ${user.email}: ${error.message}`);
    }
  }

  console.log('');
  console.log('4️⃣  SUMMARY:');
  console.log('-'.repeat(80));
  console.table(updates);
  console.log('');

  const successCount = updates.filter(u => u.status === '✅ RESTORED').length;
  const failCount = updates.filter(u => u.status.startsWith('❌')).length;

  console.log(`Total: ${updates.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('');

  // 5. Verify restoration
  console.log('5️⃣  VERIFICATION:');
  console.log('-'.repeat(80));

  for (const company of activeCompanies) {
    const activeUsers = await prisma.user.count({
      where: {
        companyId: company.id,
        deletedAt: null,
        isActive: true,
      },
    });

    const status = activeUsers > 0 ? '✅' : '❌';
    console.log(`${status} ${company.name}: ${activeUsers} active user(s)`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('FIX COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  
  if (successCount > 0) {
    console.log('✅ Users have been restored and can now log in!');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('   1. Users can now log in with their original credentials');
    console.log('   2. If users forgot their password, use password reset flow');
    console.log('   3. Test login with restored user accounts');
  }
  console.log('');
}

fixSoftDeletedUsers()
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
