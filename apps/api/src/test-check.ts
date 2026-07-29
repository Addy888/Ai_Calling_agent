import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const email = 'new-company-' + Date.now() + '@test.com';
  console.log('Testing with email:', email);
  
  const existingCompany = await prisma.company.findUnique({
    where: { email: email },
  });
  console.log('findUnique result:', existingCompany);

  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin-' + Date.now() + '@test.com' },
  });
  console.log('findUnique user result:', existingUser);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
