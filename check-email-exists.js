/**
 * Check if a specific email exists in the users table
 * This helps diagnose why login fails with "User NOT FOUND"
 */

const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

// Get email from command line argument
const emailToCheck = process.argv[2];

async function checkEmailExists() {
  console.log('='.repeat(80));
  console.log('EMAIL EXISTENCE CHECK');
  console.log('='.repeat(80));
  console.log('');

  if (!emailToCheck) {
    console.log('Usage: node check-email-exists.js <email>');
    console.log('');
    console.log('Example: node check-email-exists.js testing@gmail.com');
    console.log('');
    console.log('Available emails to test:');
    
    const allUsers = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    allUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.firstName} ${u.lastName}) ${u.isActive ? '✅' : '❌'}`);
    });
    
    console.log('');
    return;
  }

  console.log(`Checking email: ${emailToCheck}`);
  console.log('');

  // Check in users table
  const user = await prisma.user.findUnique({
    where: { email: emailToCheck },
    include: {
      company: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    console.log('❌ EMAIL NOT FOUND in users table');
    console.log('');
    console.log('This email does NOT exist as a user account.');
    console.log('You cannot log in with this email.');
    console.log('');
    
    // Check if it's a company email
    const company = await prisma.company.findFirst({
      where: { email: emailToCheck },
    });

    if (company) {
      console.log('⚠️  IMPORTANT: This is a COMPANY email, not a USER email!');
      console.log('');
      console.log(`Company found: ${company.name}`);
      console.log('');
      console.log('To find the correct login email, check users for this company:');
      
      const companyUsers = await prisma.user.findMany({
        where: { companyId: company.id, deletedAt: null },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });

      if (companyUsers.length > 0) {
        console.log('');
        console.log('Users for this company:');
        companyUsers.forEach(u => {
          console.log(`  ✅ ${u.email} (${u.firstName} ${u.lastName}) ${u.isActive ? 'Active' : 'Inactive'}`);
        });
        console.log('');
        console.log('👆 Use one of these emails to log in');
      } else {
        console.log('');
        console.log('❌ This company has NO users!');
        console.log('This should not happen. Company creation may have failed.');
      }
    } else {
      console.log('This email is not in the database at all.');
      console.log('');
      console.log('To see all valid login emails, run:');
      console.log('  node show-login-credentials.js');
    }
  } else {
    console.log('✅ USER FOUND');
    console.log('');
    console.log('User Details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`  Deleted: ${user.deletedAt ? '❌ Yes' : '✅ No'}`);
    console.log(`  Status: ${user.status}`);
    console.log('');
    console.log('Company:');
    console.log(`  ID: ${user.company.id}`);
    console.log(`  Name: ${user.company.name}`);
    console.log(`  Active: ${user.company.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`  Deleted: ${user.company.deletedAt ? '❌ Yes' : '✅ No'}`);
    console.log('');
    console.log('Roles:');
    if (user.roles.length > 0) {
      user.roles.forEach(r => {
        console.log(`  - ${r.role.name} (${r.role.slug})`);
      });
    } else {
      console.log('  ❌ No roles assigned');
    }
    console.log('');
    console.log('Password:');
    console.log(`  Hash: ${user.password.substring(0, 20)}...`);
    console.log(`  Format: ${user.password.startsWith('$2b$') ? '✅ bcrypt' : '❌ Not hashed'}`);
    console.log('');

    // Check if user can log in
    const canLogin = user.isActive && !user.deletedAt && user.company.isActive && !user.company.deletedAt;
    
    if (canLogin) {
      console.log('✅ THIS USER CAN LOG IN');
      console.log('');
      console.log('Login credentials:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: [As set during creation]`);
    } else {
      console.log('❌ THIS USER CANNOT LOG IN');
      console.log('');
      console.log('Reasons:');
      if (!user.isActive) console.log('  - User is not active');
      if (user.deletedAt) console.log('  - User is soft-deleted');
      if (!user.company.isActive) console.log('  - Company is not active');
      if (user.company.deletedAt) console.log('  - Company is soft-deleted');
    }
  }

  console.log('');
  console.log('='.repeat(80));
}

checkEmailExists()
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
