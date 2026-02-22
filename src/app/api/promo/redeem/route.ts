import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory fallback for promo codes
const MEMORY_CODES: Record<string, { accessType: string; bonusVideos: number }> = {
  'ASJVIP': { accessType: 'BONUS_VIDEOS', bonusVideos: 10 },
  'ASJ_TESTER#': { accessType: 'UNLIMITED', bonusVideos: 0 },
  'JIMENEZ_2025_OWNER#': { accessType: 'UNLIMITED', bonusVideos: 0 },
};

const redeemedCodes = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, sessionId, userId } = body;

    if (!code || !sessionId) {
      return NextResponse.json(
        { success: false, message: 'Code and session ID are required' },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Try to use database first
    try {
      const { redeemPromoCode, checkRateLimit } = await import('@/lib/promo-db');
      
      // Get IP address for rate limiting
      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      // Check rate limit
      const rateLimit = await checkRateLimit(sessionId, ipAddress);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            message: 'Too many attempts. Please try again later.',
            rateLimit,
          },
          { status: 429 }
        );
      }

      // Redeem the code
      const result = await redeemPromoCode(normalizedCode, sessionId, userId, ipAddress);

      return NextResponse.json({
        ...result,
        rateLimit: { remaining: rateLimit.remaining - 1 },
      });
    } catch (dbError) {
      console.warn('[Promo Redeem] Database not available, using fallback:', dbError);
      
      // Fallback to in-memory promo codes
      const promoData = MEMORY_CODES[normalizedCode];
      
      if (!promoData) {
        return NextResponse.json({
          success: false,
          message: 'Invalid promo code. Try ASJVIP for +10 videos!',
        });
      }

      // Check if already redeemed (simple check)
      const redeemKey = `${sessionId}:${normalizedCode}`;
      if (redeemedCodes.has(redeemKey)) {
        return NextResponse.json({
          success: false,
          message: 'You have already redeemed this code',
        });
      }

      // Mark as redeemed
      redeemedCodes.add(redeemKey);

      const message = promoData.accessType === 'UNLIMITED'
        ? 'Unlimited access activated!'
        : `+${promoData.bonusVideos} bonus videos added!`;

      return NextResponse.json({
        success: true,
        message,
        accessType: promoData.accessType,
        bonusVideos: promoData.bonusVideos,
      });
    }
  } catch (error) {
    console.error('[Promo Redeem] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
