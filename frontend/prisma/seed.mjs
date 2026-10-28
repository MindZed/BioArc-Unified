// prisma/seed.mjs
// to seed the database run the command: npx tsx prisma/seed.mjs
// the password for all users will be: password123

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin 1 (Me)
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

  // Admin 2 (Friend)
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

  // Normal User
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

  console.log('Database seeded with admin@bioarc.com, friend@bioarc.com, and user@bioarc.com. Password for all: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
