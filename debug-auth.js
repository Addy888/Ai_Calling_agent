/**
 * Authentication Debug Script
 * Comprehensive investigation of login failure
 */

const { PrismaClient } = require('./node_modules/.prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function debugAuth() {
  console.log('='.repeat(80));
  console.log('AUTHENTICATION DEBUG - ROOT CAUSE INVESTIGATION');
  console.log('='.repeat(80));
  console.log('');

  // 1. Check all companies
  console.log('1️⃣  ALL COMPANIES:');
  console.log('-'.repeat(80));
  
  const allCompanies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      status: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.table(allCompanies);
  console.log('');

  // 2. Check all users
  console.log('2️⃣  ALL USERS:');
  console.log('-'.repeat(80));
  
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyId: true,
      isActive: true,
      status: true,
      emailVerified: true,
      password: true, // To check if it's hashed
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('Total users:', allUsers.length);
  allUsers.forEach(user => {
    console.log('');
    console.log(`User: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Company ID: ${user.companyId}`);
    console.log(`  Active: ${user.isActive}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Email Verified: ${user.emailVerified}`);
    console.log(`  Deleted: ${user.deletedAt ? 'Yes' : 'No'}`);
    console.log(`  Password Hash: ${user.password.substring(0, 20)}...`);
    console.log(`  Password Length: ${user.password.length}`);
    console.log(`  Starts with $2b$: ${user.password.startsWith('$2b$') ? 'YES ✅' : 'NO ❌'}`);
  });
  console.log('');

  // 3. Check user roles
  console.log('3️⃣  USER ROLES:');
  console.log('-'.repeat(80));
  
  const userRoles = await prisma.userRole.findMany({
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      role: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  console.table(userRoles.map(ur => ({
    userId: ur.userId,
    userEmail: ur.user.email,
    userName: `${ur.user.firstName} ${ur.user.lastName}`,
    roleId: ur.roleId,
    roleName: ur.role.name,
    roleSlug: ur.role.slug,
  })));
  console.log('');

  // 4. Check available roles
  console.log('4️⃣  AVAILABLE ROLES:');
  console.log('-'.repeat(80));
  
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  });

  console.table(roles);
  console.log('');

  // 5. Test login for each user
  console.log('5️⃣  LOGIN SIMULATION TEST:');
  console.log('-'.repeat(80));
  
  for (const user of allUsers) {
    console.log('');
    console.log(`Testing login for: ${user.email}`);
    console.log('-'.repeat(40));

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ FAIL: User is NOT active');
      continue;
    }

    // Check if deleted
    if (user.deletedAt) {
      console.log('❌ FAIL: User is soft-deleted');
      continue;
    }

    // Check company
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
    });

    if (!company) {
      console.log('❌ FAIL: Company not found');
      continue;
    }

    if (!company.isActive) {
      console.log('❌ FAIL: Company is NOT active');
      continue;
    }

    if (company.deletedAt) {
      console.log('❌ FAIL: Company is soft-deleted');
      continue;
    }

    // Check password hash format
    if (!user.password.startsWith('$2b$')) {
      console.log('❌ FAIL: Password is NOT a bcrypt hash');
      console.log(`   Password: ${user.password}`);
      continue;
    }

    console.log('✅ User is active');
    console.log('✅ Company is active');
    console.log('✅ Password is bcrypt hash');
    console.log('');
    console.log('❓ Password Test: Cannot test without plain text password');
    console.log('   To test login, you need to know the original password');
  }
  console.log('');

  // 6. Check company admin creation
  console.log('6️⃣  COMPANY ADMIN VERIFICATION:');
  console.log('-'.repeat(80));
  
  const activeCompanies = await prisma.company.findMany({
    where: { deletedAt: null, isActive: true },
  });

  for (const company of activeCompanies) {
    console.log('');
    console.log(`Company: ${company.name} (${company.email})`);
    
    const companyAdmins = await prisma.user.findMany({
      where: { companyId: company.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (companyAdmins.length === 0) {
      console.log('❌ NO USERS FOUND for this company');
      continue;
    }

    companyAdmins.forEach(admin => {
      console.log(`  User: ${admin.email}`);
      console.log(`    Active: ${admin.isActive ? '✅' : '❌'}`);
      console.log(`    Deleted: ${admin.deletedAt ? '❌ YES' : '✅ NO'}`);
      console.log(`    Roles: ${admin.roles.map(r => r.role.slug).join(', ') || 'NONE ❌'}`);
      console.log(`    Password: ${admin.password.startsWith('$2b$') ? '✅ Hashed' : '❌ Not hashed'}`);
    });
  }
  console.log('');

  // 7. Detailed company check
  console.log('7️⃣  DETAILED COMPANY CHECK:');
  console.log('-'.repeat(80));
  
  for (const company of activeCompanies) {
    console.log('');
    console.log(`Company: ${company.name}`);
    console.log(`  ID: ${company.id}`);
    console.log(`  Email: ${company.email}`);
    console.log(`  Status: ${company.status}`);
    console.log(`  isActive: ${company.isActive}`);
    console.log(`  deletedAt: ${company.deletedAt || 'NULL'}`);
    
    const users = await prisma.user.count({
      where: {
        companyId: company.id,
        deletedAt: null,
      },
    });
    
    console.log(`  Total Users: ${users}`);
    
    const activeUsers = await prisma.user.count({
      where: {
        companyId: company.id,
        deletedAt: null,
        isActive: true,
      },
    });
    
    console.log(`  Active Users: ${activeUsers}`);
  }
  console.log('');

  // 8. Test password comparison with sample
  console.log('8️⃣  PASSWORD BCRYPT TEST:');
  console.log('-'.repeat(80));
  
  const testPassword = 'Admin@123';
  const testHash = await bcrypt.hash(testPassword, 10);
  console.log(`Test Password: ${testPassword}`);
  console.log(`Test Hash: ${testHash}`);
  
  const isValid = await bcrypt.compare(testPassword, testHash);
  console.log(`Comparison Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log('');

  // Test with each user's hash
  console.log('Testing stored user passwords:');
  for (const user of allUsers) {
    if (!user.password.startsWith('$2b$')) {
      console.log(`❌ ${user.email}: Password is not a bcrypt hash`);
      continue;
    }

    // Try common passwords
    const commonPasswords = [
      'Admin@123',
      'admin@123',
      'Password123',
      'password123',
      testPassword,
    ];

    console.log(`\nUser: ${user.email}`);
    for (const pwd of commonPasswords) {
      try {
        const match = await bcrypt.compare(pwd, user.password);
        if (match) {
          console.log(`  ✅ MATCH: Password is "${pwd}"`);
          break;
        }
      } catch (error) {
        console.log(`  ❌ Error testing password: ${error.message}`);
      }
    }
  }
  console.log('');

  // 9. Summary and diagnosis
  console.log('9️⃣  DIAGNOSIS SUMMARY:');
  console.log('-'.repeat(80));
  console.log('');
  
  const totalCompanies = allCompanies.length;
  const activeCompaniesCount = allCompanies.filter(c => c.isActive && !c.deletedAt).length;
  const totalUsers = allUsers.length;
  const activeUsersCount = allUsers.filter(u => u.isActive && !u.deletedAt).length;
  const usersWithRoles = userRoles.length;
  const usersWithoutRoles = totalUsers - usersWithRoles;

  console.log(`📊 STATISTICS:`);
  console.log(`  Companies: ${totalCompanies} (${activeCompaniesCount} active)`);
  console.log(`  Users: ${totalUsers} (${activeUsersCount} active)`);
  console.log(`  Users with Roles: ${usersWithRoles}`);
  console.log(`  Users without Roles: ${usersWithoutRoles} ${usersWithoutRoles > 0 ? '⚠️' : ''}`);
  console.log('');

  console.log(`⚠️  POTENTIAL ISSUES:`);
  
  let issuesFound = false;

  // Check for users without roles
  if (usersWithoutRoles > 0) {
    issuesFound = true;
    console.log(`  ❌ ${usersWithoutRoles} user(s) have no roles assigned`);
    const usersNoRoles = allUsers.filter(u => !userRoles.some(ur => ur.userId === u.id));
    usersNoRoles.forEach(u => {
      console.log(`     - ${u.email}`);
    });
  }

  // Check for inactive users
  const inactiveUsers = allUsers.filter(u => !u.isActive && !u.deletedAt);
  if (inactiveUsers.length > 0) {
    issuesFound = true;
    console.log(`  ❌ ${inactiveUsers.length} user(s) are inactive`);
    inactiveUsers.forEach(u => {
      console.log(`     - ${u.email}`);
    });
  }

  // Check for deleted users
  const deletedUsers = allUsers.filter(u => u.deletedAt);
  if (deletedUsers.length > 0) {
    issuesFound = true;
    console.log(`  ⚠️  ${deletedUsers.length} user(s) are soft-deleted`);
    deletedUsers.forEach(u => {
      console.log(`     - ${u.email}`);
    });
  }

  // Check for users with non-hashed passwords
  const nonHashedUsers = allUsers.filter(u => !u.password.startsWith('$2b$'));
  if (nonHashedUsers.length > 0) {
    issuesFound = true;
    console.log(`  ❌ ${nonHashedUsers.length} user(s) have non-hashed passwords`);
    nonHashedUsers.forEach(u => {
      console.log(`     - ${u.email}: ${u.password}`);
    });
  }

  // Check for inactive companies
  const inactiveCompanies = allCompanies.filter(c => !c.isActive && !c.deletedAt);
  if (inactiveCompanies.length > 0) {
    issuesFound = true;
    console.log(`  ❌ ${inactiveCompanies.length} company(ies) are inactive`);
    inactiveCompanies.forEach(c => {
      console.log(`     - ${c.name}`);
    });
  }

  // Check if company-admin role exists
  const companyAdminRole = await prisma.role.findUnique({
    where: { slug: 'company-admin' },
  });

  if (!companyAdminRole) {
    issuesFound = true;
    console.log(`  ❌ 'company-admin' role does not exist in database`);
  }

  if (!issuesFound) {
    console.log(`  ✅ No obvious issues found`);
    console.log(`  ℹ️  If login still fails, the issue might be:`);
    console.log(`     - Wrong password being used`);
    console.log(`     - Password was changed manually`);
    console.log(`     - bcrypt version mismatch`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('DEBUG COMPLETE');
  console.log('='.repeat(80));
}

debugAuth()
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
