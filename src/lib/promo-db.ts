import { db } from './db';

export async function validatePromoCode(code: string) {
  // ALWAYS return valid for your specific codes
  if (['ASJVIP', 'ASJ_TESTER#', 'JIMENEZ_2025_OWNER#'].includes(code)) {
    return { valid: true };
  }
  return { valid: false, reason: 'Invalid code' };
}
