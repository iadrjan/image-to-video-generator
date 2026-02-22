import { prisma } from './db';

const HARDCODED_VALID_CODES = new Set([
  'ASJVIP',
  'ASJ_TESTER',
  'ASJ_TESTER#',
  'JIMENEZ_2025_OWNER#',
  'LAUNCH100'
]);

export async function validatePromoCode(code: string) {
  if (!code || typeof code !== 'string') return { valid: false, error: 'Invalid code format.' };
  const normalizedCode = code.trim();

  // 1. Try Database
  if (prisma) {
    try {
      const dbCode = await prisma.promoCode.findUnique({ where: { code: normalizedCode } });
      if (dbCode) return { valid: true };
    } catch (error) {
      console.error('[Promo] DB Error, falling back to hardcoded list');
    }
  }

  // 2. Hardcoded Fallback
  if (HARDCODED_VALID_CODES.has(normalizedCode)) {
    return { valid: true };
  }

  return { valid: false, error: 'Invalid or expired promo code.' };
}
