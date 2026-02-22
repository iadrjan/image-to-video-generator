// OFFLINE PROMO CODE SYSTEM
const VALID_CODES = [
  'ASJVIP', 
  'ASJ_TESTER#', 
  'JIMENEZ_2025_OWNER#',
  'LAUNCH100'
];

export async function validatePromoCode(code: string) {
  if (!code) return { valid: false, reason: 'No code' };
  
  const upperCode = code.trim().toUpperCase();
  
  if (VALID_CODES.includes(upperCode)) {
    return { valid: true, type: 'UNLIMITED' };
  }
  
  return { valid: false, reason: 'Invalid code' };
}
