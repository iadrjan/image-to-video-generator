// Prisma seed script
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create owner code
  const ownerCode = process.env.OWNER_CODE || 'JIMENEZ_2025_OWNER#';

  const existingOwner = await prisma.promoCode.findUnique({
    where: { code: ownerCode },
  });

  if (!existingOwner) {
    await prisma.promoCode.create({
      data: {
        code: ownerCode,
        accessType: 'UNLIMITED',
        type: 'LIMITED_USES',
        maxUses: 1,
        isOwnerCode: true,
        description: 'Owner code - permanent unlimited access',
      },
    });
    console.log(`Created owner code: ${ownerCode}`);
  } else {
    console.log(`Owner code already exists: ${ownerCode}`);
  }

  // Create ASJVIP code
  const asjvipCode = 'ASJVIP';
  const existingAsjvip = await prisma.promoCode.findUnique({
    where: { code: asjvipCode },
  });

  if (!existingAsjvip) {
    await prisma.promoCode.create({
      data: {
        code: asjvipCode,
        accessType: 'BONUS_VIDEOS',
        type: 'UNLIMITED',
        bonusVideos: 10,
        description: 'Public code - +10 bonus videos',
      },
    });
    console.log(`Created ASJVIP code: +10 bonus videos`);
  } else {
    console.log(`ASJVIP code already exists`);
  }

  // Create ASJ_TESTER# code
  const testerCode = 'ASJ_TESTER#';
  const existingTester = await prisma.promoCode.findUnique({
    where: { code: testerCode },
  });

  if (!existingTester) {
    await prisma.promoCode.create({
      data: {
        code: testerCode,
        accessType: 'UNLIMITED',
        type: 'UNLIMITED',
        description: 'Tester code - unlimited access',
      },
    });
    console.log(`Created ASJ_TESTER# code: unlimited access`);
  } else {
    console.log(`ASJ_TESTER# code already exists`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
