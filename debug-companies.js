/**
 * Debug script to investigate company duplicate email issue
 */

const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function investigate() {
  console.log('='.repeat(80));
  console.log('COMPANY EMAIL CONSTRAINT INVESTIGATION');
  console.log('='.repeat(80));
  console.log('');

  // 1. Check all companies
  console.log('1️⃣  ALL COMPANIES (including soft-deleted):');
  console.log('-'.repeat(80));
  const allCompanies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.table(allCompanies);
  console.log(`Total companies: ${allCompanies.length}`);
  console.log('');

  // 2. Check for duplicate emails
  console.log('2️⃣  DUPLICATE EMAIL CHECK:');
  console.log('-'.repeat(80));
  const emailGroups = allCompanies.reduce((acc, company) => {
    if (!acc[company.email]) {
      acc[company.email] = [];
    }
    acc[company.email].push(company);
    return acc;
  }, {});

  const duplicates = Object.entries(emailGroups).filter(([_, companies]) => companies.length > 1);
  
  if (duplicates.length > 0) {
    console.log('❌ DUPLICATES FOUND:');
    duplicates.forEach(([email, companies]) => {
      console.log(`\n📧 Email: ${email} (${companies.length} records)`);
      console.table(companies);
    });
  } else {
    console.log('✅ No duplicate emails found');
  }
  console.log('');

  // 3. Check active companies only
  console.log('3️⃣  ACTIVE COMPANIES (deletedAt IS NULL):');
  console.log('-'.repeat(80));
  const activeCompanies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.table(activeCompanies);
  console.log(`Total active companies: ${activeCompanies.length}`);
  console.log('');

  // 4. Check soft-deleted companies
  console.log('4️⃣  SOFT-DELETED COMPANIES (deletedAt IS NOT NULL):');
  console.log('-'.repeat(80));
  const deletedCompanies = await prisma.company.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { deletedAt: 'desc' },
  });

  if (deletedCompanies.length > 0) {
    console.table(deletedCompanies);
    console.log(`Total soft-deleted companies: ${deletedCompanies.length}`);
  } else {
    console.log('✅ No soft-deleted companies');
  }
  console.log('');

  // 5. Check database constraint
  console.log('5️⃣  DATABASE CONSTRAINT ANALYSIS:');
  console.log('-'.repeat(80));
  console.log('Schema constraint: @unique on email field');
  console.log('Expected behavior: Email must be unique across ALL records (including soft-deleted)');
  console.log('');
  console.log('⚠️  ISSUE IDENTIFIED:');
  console.log('The @unique constraint on the email field applies to ALL records,');
  console.log('including soft-deleted ones (where deletedAt IS NOT NULL).');
  console.log('');
  console.log('This means if a company is soft-deleted, the email is still blocked');
  console.log('and cannot be reused for a new company.');
  console.log('');

  // 6. Test scenario
  console.log('6️⃣  TEST SCENARIO:');
  console.log('-'.repeat(80));
  const testEmail = 'test@example.com';
  
  const companyWithTestEmail = await prisma.company.findFirst({
    where: { email: testEmail },
    select: {
      id: true,
      name: true,
      email: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  if (companyWithTestEmail) {
    console.log(`Found existing company with email: ${testEmail}`);
    console.table([companyWithTestEmail]);
    console.log('');
    if (companyWithTestEmail.deletedAt) {
      console.log('⚠️  This company is SOFT-DELETED but still blocks the email!');
    } else {
      console.log('ℹ️  This company is ACTIVE');
    }
  } else {
    console.log(`✅ No company found with email: ${testEmail}`);
  }
  console.log('');

  // 7. Solution recommendations
  console.log('7️⃣  SOLUTION RECOMMENDATIONS:');
  console.log('-'.repeat(80));
  console.log('');
  console.log('Option 1: PARTIAL UNIQUE INDEX (RECOMMENDED)');
  console.log('  - Modify schema to use @@unique([email]) with WHERE deletedAt IS NULL');
  console.log('  - Requires database migration');
  console.log('  - Allows email reuse after soft-delete');
  console.log('');
  console.log('Option 2: EMAIL MODIFICATION ON DELETE');
  console.log('  - When soft-deleting, append timestamp to email');
  console.log('  - e.g., test@example.com → test@example.com__deleted_1234567890');
  console.log('  - No schema change required');
  console.log('  - Quick fix but less elegant');
  console.log('');
  console.log('Option 3: HARD DELETE');
  console.log('  - Actually delete the record from database');
  console.log('  - Loses audit trail');
  console.log('  - Not recommended for production');
  console.log('');
  console.log('Option 4: IMPROVED ERROR MESSAGE');
  console.log('  - Check if blocking email is from soft-deleted company');
  console.log('  - Return specific error message to user');
  console.log('  - Offer to restore or permanently delete old company');
  console.log('');

  console.log('='.repeat(80));
  console.log('INVESTIGATION COMPLETE');
  console.log('='.repeat(80));
}

investigate()
  .catch((error) => {
    console.error('Investigation failed:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
