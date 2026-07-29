import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Listing existing companies:');
  const companies = await prisma.company.findMany();
  console.log(companies);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
