/**
 * Verification script to confirm the company email constraint fix is working
 */

const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

async function verifyFix() {
  console.log('='.repeat(80));
  console.log('COMPANY EMAIL CONSTRAINT FIX - VERIFICATION');
  console.log('='.repeat(80));
  console.log('');

  // Test 1: Verify all soft-deleted companies have modified emails
  console.log('✅ TEST 1: Soft-deleted companies have modified emails');
  console.log('-'.repeat(80));
  
  const softDeletedCompanies = await prisma.company.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, name: true, email: true, deletedAt: true },
  });

  let test1Pass = true;
  softDeletedCompanies.forEach(company => {
    const hasDeletedSuffix = company.email.includes('__deleted_');
    const status = hasDeletedSuffix ? '✅' : '❌';
    console.log(`${status} ${company.name}: ${company.email}`);
    if (!hasDeletedSuffix) test1Pass = false;
  });
  
  console.log('');
  console.log(`Test 1: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 2: Verify no duplicate emails in active companies
  console.log('✅ TEST 2: No duplicate emails in active companies');
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
  const test2Pass = duplicates.length === 0;

  if (test2Pass) {
    console.log('✅ No duplicate emails found');
  } else {
    console.log('❌ Duplicate emails found:');
    duplicates.forEach(([email, count]) => {
      console.log(`   - ${email}: ${count} records`);
    });
  }

  console.log('');
  console.log(`Test 2: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 3: Verify emails are available for reuse
  console.log('✅ TEST 3: Previously blocked emails are now available');
  console.log('-'.repeat(80));

  const previouslyBlockedEmails = [
    'skyrocketinfosys@gmail.com',
    'company1@test.com',
    'test123@gmail.com',
  ];

  let test3Pass = true;
  for (const email of previouslyBlockedEmails) {
    const activeCompany = await prisma.company.findFirst({
      where: { email, deletedAt: null },
    });

    const isAvailable = !activeCompany;
    const status = isAvailable ? '✅' : '❌';
    console.log(`${status} ${email}: ${isAvailable ? 'Available' : 'Still blocked'}`);
    
    if (!isAvailable) test3Pass = false;
  }

  console.log('');
  console.log(`Test 3: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 4: Verify audit logs were created
  console.log('✅ TEST 4: Audit logs created for email modifications');
  console.log('-'.repeat(80));

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: 'COMPANY_EMAIL_MODIFIED',
      entityType: 'companies',
    },
    select: {
      entityId: true,
      action: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const test4Pass = auditLogs.length >= 3;

  if (test4Pass) {
    console.log(`✅ Found ${auditLogs.length} audit log entries`);
    auditLogs.forEach(log => {
      const meta = log.metadata;
      console.log(`   - ${meta.originalEmail} → ${meta.modifiedEmail}`);
    });
  } else {
    console.log(`❌ Expected at least 3 audit logs, found ${auditLogs.length}`);
  }

  console.log('');
  console.log(`Test 4: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 5: Check database statistics
  console.log('📊 DATABASE STATISTICS');
  console.log('-'.repeat(80));

  const totalCompanies = await prisma.company.count();
  const activeCompaniesCount = await prisma.company.count({ where: { deletedAt: null } });
  const deletedCompaniesCount = await prisma.company.count({ where: { deletedAt: { not: null } } });

  console.log(`Total companies: ${totalCompanies}`);
  console.log(`Active companies: ${activeCompaniesCount}`);
  console.log(`Soft-deleted companies: ${deletedCompaniesCount}`);
  console.log('');

  // Final summary
  console.log('='.repeat(80));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const allTestsPass = test1Pass && test2Pass && test3Pass && test4Pass;

  console.log(`Test 1 (Modified emails): ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (No duplicates): ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (Emails available): ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 4 (Audit logs): ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  if (allTestsPass) {
    console.log('🎉 ALL TESTS PASSED! The fix is working correctly.');
    console.log('');
    console.log('✅ Summary:');
    console.log('   - Soft-deleted companies have modified emails');
    console.log('   - No duplicate emails in active companies');
    console.log('   - Previously blocked emails are available for reuse');
    console.log('   - Audit trail is complete');
    console.log('');
    console.log('🚀 The platform is ready for production use!');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Please review the results above.');
  }
  console.log('');
  console.log('='.repeat(80));
}

verifyFix()
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
