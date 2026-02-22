import { db } from './db';

// Hardcoded codes that ALWAYS work
const VALID_PROMO_CODES = new Set([
  'ASJVIP',
  'ASJ_TESTER#',
  'JIMENEZ_2025_OWNER#'
]);

export async function validatePromoCode(code: string) {
  if (!code) return { valid: false, reason: 'No code provided' };

  // 1. Try Database (Wrapped in try/catch to prevent crash)
  try {
    const promo = await db.promoCode.findUnique({ where: { code } });
    if (promo) return { valid: true, type: promo.accessType };
  } catch (error) {
    console.log('Database offline, checking fallback codes...');
  }

  // 2. Fallback
  if (VALID_PROMO_CODES.has(code)) {
    return { valid: true, type: 'UNLIMITED' };
  }

  return { valid: false, reason: 'Invalid code' };
}
