import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function simulateCreate(companyEmail: string, adminEmail: string) {
  console.log('\n=== SIMULATING CREATE ===');
  console.log('Company email:', companyEmail);
  console.log('Admin email:', adminEmail);

  // Step 1: Check company email
  const existingCompany = await prisma.company.findUnique({
    where: { email: companyEmail },
  });
  console.log('existingCompany:', existingCompany);

  if (existingCompany) {
    console.log('WOULD THROW: Company with this email already exists');
    return;
  }

  // Step 2: Check admin email
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  console.log('existingUser:', existingUser);

  if (existingUser) {
    console.log('WOULD THROW: User with this email already exists');
    return;
  }

  console.log('Both checks passed — creation would proceed.');
}

async function main() {
  await simulateCreate('company1@test.com', 'admin1@test.com');
  await simulateCreate('company2@test.com', 'admin2@test.com');
  // Test with undefined email (whitelist stripping scenario)
  await simulateCreate(undefined as any, 'admin3@test.com');
}

main()
  .catch((e) => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
