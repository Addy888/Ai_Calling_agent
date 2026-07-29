import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Listing roles:');
  const roles = await prisma.role.findMany();
  console.log(roles);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
