import { PrismaClient } from '@prisma/client';

interface GlobalThisWithPrisma {
  prisma: PrismaClient | undefined;
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = (() => {
  if (process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      return new PrismaClient();
    } else {
      if (!global.prisma) {
        global.prisma = new PrismaClient();
      }
      return global.prisma;
    }
  }
  console.warn('[DB] WARNING: DATABASE_URL missing. Running in "Offline Mode".');
  return null;
})();
export const db = prisma; // Export alias for compatibility
