/**
 * Fix soft-deleted companies by modifying their emails
 * This script updates all soft-deleted companies to append __deleted_timestamp to their email
 * This frees up the email addresses for future use
 */

const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function fixSoftDeletedCompanies() {
  console.log('='.repeat(80));
  console.log('FIXING SOFT-DELETED COMPANIES');
  console.log('='.repeat(80));
  console.log('');

  // 1. Find all soft-deleted companies
  console.log('1️⃣  Finding soft-deleted companies...');
  console.log('-'.repeat(80));
  
  const softDeletedCompanies = await prisma.company.findMany({
    where: {
      deletedAt: { not: null },
      email: { not: { contains: '__deleted_' } }, // Only fix if not already modified
    },
    select: {
      id: true,
      name: true,
      email: true,
      deletedAt: true,
    },
  });

  if (softDeletedCompanies.length === 0) {
    console.log('✅ No soft-deleted companies need fixing');
    console.log('');
    return;
  }

  console.log(`Found ${softDeletedCompanies.length} soft-deleted companies that need fixing:`);
  console.table(softDeletedCompanies);
  console.log('');

  // 2. Update each company
  console.log('2️⃣  Updating company emails...');
  console.log('-'.repeat(80));

  const updates = [];

  for (const company of softDeletedCompanies) {
    const timestamp = company.deletedAt.getTime();
    const modifiedEmail = `${company.email}__deleted_${timestamp}`;

    try {
      await prisma.company.update({
        where: { id: company.id },
        data: { email: modifiedEmail },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          companyId: company.id,
          action: 'COMPANY_EMAIL_MODIFIED',
          entityType: 'companies',
          entityId: company.id,
          metadata: {
            reason: 'SOFT_DELETE_FIX',
            originalEmail: company.email,
            modifiedEmail,
            description: `Email modified during soft-delete cleanup to free up '${company.email}' for reuse`,
          },
        },
      });

      updates.push({
        id: company.id,
        name: company.name,
        originalEmail: company.email,
        modifiedEmail,
        status: '✅ SUCCESS',
      });

      console.log(`✅ Updated ${company.name}: ${company.email} → ${modifiedEmail}`);
    } catch (error) {
      updates.push({
        id: company.id,
        name: company.name,
        originalEmail: company.email,
        modifiedEmail: 'N/A',
        status: `❌ FAILED: ${error.message}`,
      });

      console.error(`❌ Failed to update ${company.name}: ${error.message}`);
    }
  }

  console.log('');
  console.log('3️⃣  SUMMARY:');
  console.log('-'.repeat(80));
  console.table(updates);
  console.log('');

  const successCount = updates.filter(u => u.status === '✅ SUCCESS').length;
  const failCount = updates.filter(u => u.status.startsWith('❌')).length;

  console.log(`Total: ${updates.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('');

  // 4. Verify no duplicates
  console.log('4️⃣  Verifying no active companies have duplicate emails...');
  console.log('-'.repeat(80));

  const activeCompanies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { email: true },
  });

  const emailCounts = activeCompanies.reduce((acc, company) => {
    acc[company.email] = (acc[company.email] || 0) + 1;
    return acc;
  }, {});

  const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);

  if (duplicates.length > 0) {
    console.log('⚠️  WARNING: Duplicate emails found in active companies:');
    console.table(duplicates.map(([email, count]) => ({ email, count })));
  } else {
    console.log('✅ No duplicate emails in active companies');
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('CLEANUP COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('📝 NEXT STEPS:');
  console.log('   1. The emails from soft-deleted companies are now available for reuse');
  console.log('   2. Users can create new companies with these emails');
  console.log('   3. All future soft-deletes will automatically modify emails');
  console.log('');
}

fixSoftDeletedCompanies()
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
