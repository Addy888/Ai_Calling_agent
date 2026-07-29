import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  // Get all users and their roles
  const users = await prisma.user.findMany({
    select: {
      email: true,
      companyId: true,
      roles: {
        include: { role: { select: { slug: true } } }
      }
    }
  });
  console.log('All users:', JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
