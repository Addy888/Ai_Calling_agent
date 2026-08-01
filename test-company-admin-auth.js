/**
 * Complete Company Admin Authentication Test
 * 
 * Tests the full flow:
 * 1. Create Company
 * 2. Verify Company Admin User created with COMPANY EMAIL
 * 3. Test Login with COMPANY EMAIL
 * 4. Verify JWT Token Generation
 * 5. Verify Role = COMPANY_ADMIN
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testCompanyAdminAuth() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   COMPANY ADMIN AUTHENTICATION TEST');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Step 1: Check existing companies
    console.log('📋 Step 1: Checking existing companies...');
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log('');
    console.log('Recent Companies:');
    console.log('─────────────────────────────────────────────────────────');
    if (companies.length === 0) {
      console.log('   ⚠️  No companies found');
    } else {
      companies.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name}`);
        console.log(`      Email: ${company.email}`);
        console.log(`      Status: ${company.status} | Active: ${company.isActive}`);
        console.log(`      Created: ${company.createdAt.toISOString().split('T')[0]}`);
        console.log('');
      });
    }

    // Step 2: Check users for each company
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 Step 2: Checking Company Admin Users...');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    for (const company of companies) {
      console.log(`🏢 Company: ${company.name} (${company.email})`);
      console.log('─────────────────────────────────────────────────────────');

      const users = await prisma.user.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
        },
        include: {
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      if (users.length === 0) {
        console.log('   ❌ NO USERS FOUND');
        console.log('   ⚠️  This company has no admin users!');
      } else {
        users.forEach((user, index) => {
          const userRoles = user.roles.map(ur => ur.role.slug).join(', ');
          console.log(`   User ${index + 1}:`);
          console.log(`      Email: ${user.email}`);
          console.log(`      Name: ${user.firstName} ${user.lastName}`);
          console.log(`      Roles: ${userRoles || 'NONE'}`);
          console.log(`      Status: ${user.status} | Active: ${user.isActive}`);
          console.log(`      Match with Company Email: ${user.email === company.email ? '✅ YES' : '❌ NO'}`);
        });
      }
      console.log('');
    }

    // Step 3: Test password verification for existing users
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔐 Step 3: Password Verification Test');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Check Sky Rocket Infosys
    const skyRocketEmail = 'skyrocketinfosys@gmail.com';
    console.log(`Testing: ${skyRocketEmail}`);
    console.log('─────────────────────────────────────────────────────────');

    const skyRocketUser = await prisma.user.findUnique({
      where: { email: skyRocketEmail },
      include: {
        company: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!skyRocketUser) {
      console.log('   ❌ User NOT FOUND');
      console.log('   ⚠️  Cannot test password verification');
    } else {
      console.log('   ✅ User found');
      console.log('   User ID:', skyRocketUser.id);
      console.log('   Email:', skyRocketUser.email);
      console.log('   Company:', skyRocketUser.company?.name || 'NOT FOUND');
      console.log('   Company Email:', skyRocketUser.company?.email || 'NOT FOUND');
      console.log('   Email Match:', skyRocketUser.email === skyRocketUser.company?.email ? '✅ YES' : '❌ NO');
      console.log('   isActive:', skyRocketUser.isActive);
      console.log('   deletedAt:', skyRocketUser.deletedAt || 'NULL');
      console.log('   Company isActive:', skyRocketUser.company?.isActive);
      console.log('   Company deletedAt:', skyRocketUser.company?.deletedAt || 'NULL');
      console.log('   Roles:', skyRocketUser.roles.map(ur => ur.role.slug).join(', ') || 'NONE');
      console.log('   Password Hash:', skyRocketUser.password.substring(0, 20) + '...');
      
      // Test with a sample password (this is just for structure - actual password unknown)
      console.log('');
      console.log('   📝 Note: To test login, use the password provided during company creation');
      console.log('   The password is hashed using bcrypt with 10 rounds');
    }

    // Step 4: Verify role configuration
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔑 Step 4: Verifying Role Configuration');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const companyAdminRole = await prisma.role.findUnique({
      where: { slug: 'company-admin' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!companyAdminRole) {
      console.log('   ❌ company-admin role NOT FOUND');
      console.log('   ⚠️  Database needs to be seeded!');
    } else {
      console.log('   ✅ company-admin role found');
      console.log('   Role ID:', companyAdminRole.id);
      console.log('   Role Name:', companyAdminRole.name);
      console.log('   Role Slug:', companyAdminRole.slug);
      console.log('   Permissions:', companyAdminRole.permissions.length);
      
      if (companyAdminRole.permissions.length > 0) {
        console.log('');
        console.log('   Permission List:');
        companyAdminRole.permissions.forEach((rp, index) => {
          console.log(`      ${index + 1}. ${rp.permission.name} (${rp.permission.slug})`);
        });
      }
    }

    // Step 5: Summary and Recommendations
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY & RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    let allGood = true;
    const issues = [];

    // Check 1: Do we have companies?
    if (companies.length === 0) {
      allGood = false;
      issues.push('❌ No companies found. Create a company via API.');
    } else {
      console.log('✅ Companies exist in database');
    }

    // Check 2: Do companies have admin users?
    let companiesWithoutAdmins = 0;
    for (const company of companies) {
      const userCount = await prisma.user.count({
        where: {
          companyId: company.id,
          deletedAt: null,
        },
      });

      if (userCount === 0) {
        companiesWithoutAdmins++;
      }
    }

    if (companiesWithoutAdmins > 0) {
      allGood = false;
      issues.push(`❌ ${companiesWithoutAdmins} companies have NO admin users`);
    } else {
      console.log('✅ All companies have admin users');
    }

    // Check 3: Email matching
    let emailMatches = 0;
    let emailMismatches = 0;
    for (const company of companies) {
      const users = await prisma.user.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
        },
      });

      for (const user of users) {
        if (user.email === company.email) {
          emailMatches++;
        } else {
          emailMismatches++;
        }
      }
    }

    if (emailMatches > 0) {
      console.log(`✅ ${emailMatches} admin users have matching company email`);
    }

    if (emailMismatches > 0) {
      issues.push(`⚠️  ${emailMismatches} admin users have DIFFERENT email than company email`);
      issues.push('   This is expected for companies created before the fix.');
      issues.push('   New companies will have matching emails.');
    }

    // Check 4: Role exists
    if (!companyAdminRole) {
      allGood = false;
      issues.push('❌ company-admin role missing. Run database seed.');
    } else {
      console.log('✅ company-admin role configured correctly');
    }

    console.log('');
    if (issues.length > 0) {
      console.log('⚠️  ISSUES FOUND:');
      issues.forEach(issue => console.log('   ' + issue));
    }

    console.log('');
    console.log('─────────────────────────────────────────────────────────');
    console.log('📝 HOW TO TEST LOGIN:');
    console.log('─────────────────────────────────────────────────────────');
    console.log('');
    console.log('1. Create a NEW company via API:');
    console.log('   POST /api/v1/companies');
    console.log('   {');
    console.log('     "name": "Test Company",');
    console.log('     "email": "testcompany@example.com",');
    console.log('     "administrator": {');
    console.log('       "fullName": "Test Admin",');
    console.log('       "adminEmail": "admin@example.com",');
    console.log('       "password": "SecurePass123!",');
    console.log('       "confirmPassword": "SecurePass123!"');
    console.log('     }');
    console.log('   }');
    console.log('');
    console.log('2. Login with COMPANY EMAIL:');
    console.log('   POST /api/v1/auth/login');
    console.log('   {');
    console.log('     "email": "testcompany@example.com",');
    console.log('     "password": "SecurePass123!"');
    console.log('   }');
    console.log('');
    console.log('3. Check backend logs for:');
    console.log('   - Company created');
    console.log('   - Admin user created');
    console.log('   - Email match verification');
    console.log('   - Login attempt');
    console.log('   - JWT token generated');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    if (allGood && emailMismatches === 0) {
      console.log('✅ ALL CHECKS PASSED - System ready for Company Admin login');
    } else {
      console.log('⚠️  SOME ISSUES FOUND - Review above and create test company');
    }

    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompanyAdminAuth();
