/**
 * Fix Sky Rocket Infosys Admin Email
 * 
 * Updates the admin user email for Sky Rocket Infosys company
 * to match the company email for simplified login.
 * 
 * Before: testing@gmail.com
 * After:  skyrocketinfosys@gmail.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSkyRocketAdminEmail() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   FIX SKY ROCKET ADMIN EMAIL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Step 1: Find Sky Rocket Infosys company
    console.log('📋 Step 1: Finding Sky Rocket Infosys company...');
    const company = await prisma.company.findFirst({
      where: {
        email: 'skyrocketinfosys@gmail.com',
        deletedAt: null,
      },
    });

    if (!company) {
      console.log('   ❌ Company NOT FOUND');
      return;
    }

    console.log('   ✅ Company found');
    console.log('   Company ID:', company.id);
    console.log('   Company Name:', company.name);
    console.log('   Company Email:', company.email);
    console.log('');

    // Step 2: Find admin user with testing@gmail.com
    console.log('📋 Step 2: Finding admin user...');
    const adminUser = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        email: 'testing@gmail.com',
        deletedAt: null,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!adminUser) {
      console.log('   ❌ Admin user with testing@gmail.com NOT FOUND');
      return;
    }

    console.log('   ✅ Admin user found');
    console.log('   User ID:', adminUser.id);
    console.log('   Current Email:', adminUser.email);
    console.log('   Name:', `${adminUser.firstName} ${adminUser.lastName}`);
    console.log('   Roles:', adminUser.roles.map(ur => ur.role.slug).join(', '));
    console.log('');

    // Step 3: Check if company email is already taken
    console.log('📋 Step 3: Checking if company email is available...');
    const existingUser = await prisma.user.findFirst({
      where: {
        email: company.email,
        deletedAt: null,
      },
    });

    if (existingUser && existingUser.id !== adminUser.id) {
      console.log('   ❌ Email already taken by another user');
      console.log('   User ID:', existingUser.id);
      console.log('   Name:', `${existingUser.firstName} ${existingUser.lastName}`);
      console.log('');
      console.log('   Cannot proceed. Please resolve the conflict manually.');
      return;
    }

    console.log('   ✅ Email is available');
    console.log('');

    // Step 4: Update admin user email
    console.log('📋 Step 4: Updating admin user email...');
    console.log('   Old Email:', adminUser.email);
    console.log('   New Email:', company.email);
    console.log('');

    const updatedUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        email: company.email,
        updatedBy: 'SYSTEM_FIX',
      },
    });

    console.log('   ✅ Email updated successfully');
    console.log('');

    // Step 5: Verify update
    console.log('📋 Step 5: Verifying update...');
    const verifyUser = await prisma.user.findUnique({
      where: { id: adminUser.id },
      include: {
        company: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log('   ✅ Verification complete');
    console.log('');
    console.log('   Updated User Details:');
    console.log('   ─────────────────────────────────────────────────');
    console.log('   User ID:', verifyUser.id);
    console.log('   Email:', verifyUser.email);
    console.log('   Name:', `${verifyUser.firstName} ${verifyUser.lastName}`);
    console.log('   Company:', verifyUser.company.name);
    console.log('   Company Email:', verifyUser.company.email);
    console.log('   Email Match:', verifyUser.email === verifyUser.company.email ? '✅ YES' : '❌ NO');
    console.log('   isActive:', verifyUser.isActive);
    console.log('   Status:', verifyUser.status);
    console.log('   Roles:', verifyUser.roles.map(ur => ur.role.slug).join(', '));
    console.log('   Password Hash:', verifyUser.password.substring(0, 20) + '...');
    console.log('');

    // Step 6: Create audit log
    console.log('📋 Step 6: Creating audit log...');
    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        action: 'USER_EMAIL_UPDATED',
        entityType: 'users',
        entityId: adminUser.id,
        metadata: {
          userId: adminUser.id,
          oldEmail: 'testing@gmail.com',
          newEmail: company.email,
          reason: 'Align admin user email with company email for simplified login',
          updatedBy: 'SYSTEM_FIX',
        },
      },
    });

    console.log('   ✅ Audit log created');
    console.log('');

    // Success summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ FIX COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📝 LOGIN CREDENTIALS:');
    console.log('   Email:', company.email);
    console.log('   Password: [Use the password provided during company creation]');
    console.log('');
    console.log('🔐 TEST LOGIN:');
    console.log('   POST /api/v1/auth/login');
    console.log('   {');
    console.log(`     "email": "${company.email}",`);
    console.log('     "password": "YOUR_PASSWORD_HERE"');
    console.log('   }');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ FIX FAILED');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixSkyRocketAdminEmail();
