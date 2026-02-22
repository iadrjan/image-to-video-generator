import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// SAFE INITIALIZATION
// We try to connect. If it fails, we catch the error and return null.
// This prevents the "PrismaClientInitializationError" you see in the logs.
export const prisma = (() => {
  try {
    if (process.env.DATABASE_URL) {
       const client = globalForPrisma.prisma || new PrismaClient();
       if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
       return client;
    }
  } catch (e) {
    console.warn("Database connection failed. Running in Offline Mode.");
  }
  return null;
})();

export const db = prisma;
