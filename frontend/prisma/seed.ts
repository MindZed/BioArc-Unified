// prisma/seed.ts
// this file is used to seed the database
// to seed the database run the command: npx tsx prisma/seed.ts
// the password for all users will be: password123

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@bioarc.com' },
    update: {},
    create: {
      email: 'admin@bioarc.com',
      name: 'Admin',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'friend@bioarc.com' },
    update: {},
    create: {
      email: 'friend@bioarc.com',
      name: 'Friend',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@bioarc.com' },
    update: {},
    create: {
      email: 'user@bioarc.com',
      name: 'Normal User',
      password: passwordHash,
      role: 'USER',
    },
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
