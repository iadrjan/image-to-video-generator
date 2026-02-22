import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = (() => {
  try {
    // Only try to connect if we have a URL, otherwise stay offline
    if (process.env.DATABASE_URL) {
      return globalForPrisma.prisma || new PrismaClient();
    }
  } catch (e) {
    console.warn("Database offline. Running in UI-Only mode.");
  }
  return null;
})();

export const db = prisma;
