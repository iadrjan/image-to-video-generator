// Promo code database utilities
import { PrismaClient, AccessType, PromoType } from '@prisma/client';

const prisma = new PrismaClient();

// Constants
const DAILY_FREE_LIMIT = 3;
const CODE_ATTEMPT_LIMIT = 5; // per hour

// Get or create session usage record for today
export async function getOrCreateSessionUsage(sessionId: string, ipAddress?: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let usage = await prisma.sessionUsage.findUnique({
    where: {
      sessionId_date: {
        sessionId,
        date: today,
      },
    },
  });

  if (!usage) {
    // Check if user has any existing redemptions (to get bonus videos/unlimited status)
    const redemptions = await prisma.redemption.findMany({
      where: { sessionId },
      include: { code: true },
    });

    const hasUnlimited = redemptions.some(r => r.accessType === 'UNLIMITED');
    const totalBonusVideos = redemptions
      .filter(r => r.accessType === 'BONUS_VIDEOS')
      .reduce((sum, r) => sum + r.bonusVideos, 0);

    usage = await prisma.sessionUsage.create({
      data: {
        sessionId,
        ipAddress,
        date: today,
        count: 0,
        hasUnlimited,
        bonusVideos: totalBonusVideos,
      },
    });
  }

  return usage;
}

// Check if user can generate a video
export async function canGenerateVideo(sessionId: string, userId?: string): Promise<{
  canGenerate: boolean;
  reason?: string;
  remaining: number;
  total: number;
  hasUnlimited: boolean;
}> {
  // Check for unlimited access first
  const hasUnlimited = await hasUnlimitedAccess(sessionId, userId);
  if (hasUnlimited) {
    return {
      canGenerate: true,
      remaining: Infinity,
      total: Infinity,
      hasUnlimited: true,
    };
  }

  // Get today's usage
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const usage = await getOrCreateSessionUsage(sessionId);

  // Calculate total allowed (default + bonus)
  const totalAllowed = DAILY_FREE_LIMIT + usage.bonusVideos;
  const remaining = Math.max(0, totalAllowed - usage.count);

  return {
    canGenerate: usage.count < totalAllowed,
    reason: usage.count >= totalAllowed ? 'Daily limit reached' : undefined,
    remaining,
    total: totalAllowed,
    hasUnlimited: false,
  };
}

// Increment video count
export async function incrementVideoCount(sessionId: string): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.sessionUsage.update({
    where: {
      sessionId_date: {
        sessionId,
        date: today,
      },
    },
    data: {
      count: { increment: 1 },
    },
  });
}

// Check if user has unlimited access
export async function hasUnlimitedAccess(sessionId: string, userId?: string): Promise<boolean> {
  // Check by user ID first (if logged in)
  if (userId) {
    const userRedemption = await prisma.redemption.findFirst({
      where: {
        userId,
        accessType: 'UNLIMITED',
        revokedAt: null,
      },
    });
    if (userRedemption) return true;
  }

  // Check by session ID
  const sessionRedemption = await prisma.redemption.findFirst({
    where: {
      sessionId,
      accessType: 'UNLIMITED',
      revokedAt: null,
    },
  });

  return !!sessionRedemption;
}

// Redeem a promo code
export async function redeemPromoCode(
  code: string,
  sessionId: string,
  userId?: string,
  ipAddress?: string
): Promise<{ success: boolean; message: string; accessType?: AccessType; bonusVideos?: number }> {
  // Find the promo code
  const promoCode = await prisma.promoCode.findUnique({
    where: { code },
  });

  if (!promoCode) {
    // Log failed attempt
    await logCodeAttempt(code, sessionId, userId, ipAddress, false, 'Invalid code');
    return { success: false, message: 'Invalid promo code' };
  }

  // Check if code is active
  if (!promoCode.active) {
    await logCodeAttempt(code, sessionId, userId, ipAddress, false, 'Code is inactive');
    return { success: false, message: 'This code is no longer active' };
  }

  // Check if code has expired
  if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
    await logCodeAttempt(code, sessionId, userId, ipAddress, false, 'Code has expired');
    return { success: false, message: 'This code has expired' };
  }

  // Check usage limit
  if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
    await logCodeAttempt(code, sessionId, userId, ipAddress, false, 'Code usage limit reached');
    return { success: false, message: 'This code has reached its usage limit' };
  }

  // Check if already redeemed (by user or session)
  const existingRedemption = userId
    ? await prisma.redemption.findUnique({
        where: { userId_codeId: { userId, codeId: promoCode.id } },
      })
    : await prisma.redemption.findUnique({
        where: { sessionId_codeId: { sessionId, codeId: promoCode.id } },
      });

  if (existingRedemption) {
    await logCodeAttempt(code, sessionId, userId, ipAddress, false, 'Already redeemed');
    return { success: false, message: 'You have already redeemed this code' };
  }

  // Create redemption
  const redemption = await prisma.redemption.create({
    data: {
      userId,
      sessionId,
      ipAddress,
      codeId: promoCode.id,
      accessType: promoCode.accessType,
      unlimitedAccess: promoCode.accessType === 'UNLIMITED',
      bonusVideos: promoCode.accessType === 'BONUS_VIDEOS' ? promoCode.bonusVideos : 0,
    },
  });

  // Increment code usage
  await prisma.promoCode.update({
    where: { id: promoCode.id },
    data: { currentUses: { increment: 1 } },
  });

  // Update session usage
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (promoCode.accessType === 'UNLIMITED') {
    await prisma.sessionUsage.updateMany({
      where: { sessionId },
      data: { hasUnlimited: true },
    });
  } else if (promoCode.accessType === 'BONUS_VIDEOS') {
    await prisma.sessionUsage.updateMany({
      where: { sessionId },
      data: { bonusVideos: { increment: promoCode.bonusVideos } },
    });
  }

  // Log successful attempt
  await logCodeAttempt(code, sessionId, userId, ipAddress, true);

  return {
    success: true,
    message: promoCode.accessType === 'UNLIMITED'
      ? 'Unlimited access activated!'
      : `+${promoCode.bonusVideos} bonus videos added!`,
    accessType: promoCode.accessType,
    bonusVideos: promoCode.bonusVideos,
  };
}

// Log code attempt
async function logCodeAttempt(
  code: string,
  sessionId: string,
  userId?: string,
  ipAddress?: string,
  success: boolean = false,
  errorMessage?: string
) {
  await prisma.codeAttemptLog.create({
    data: {
      code,
      sessionId,
      userId,
      ipAddress,
      success,
      errorMessage,
    },
  });
}

// Check rate limit for code attempts
export async function checkRateLimit(sessionId: string, ipAddress?: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetIn: number;
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const attempts = await prisma.codeAttemptLog.count({
    where: {
      sessionId,
      attemptedAt: { gte: oneHourAgo },
    },
  });

  const allowed = attempts < CODE_ATTEMPT_LIMIT;
  const remaining = Math.max(0, CODE_ATTEMPT_LIMIT - attempts);
  const resetIn = 3600; // seconds until oldest attempt expires

  return { allowed, remaining, resetIn };
}

// Create a new promo code (admin only)
export async function createPromoCode(data: {
  code: string;
  accessType: AccessType;
  type?: PromoType;
  maxUses?: number;
  expiresAt?: Date;
  bonusVideos?: number;
  description?: string;
}) {
  return prisma.promoCode.create({
    data: {
      code: data.code,
      accessType: data.accessType,
      type: data.type || 'UNLIMITED',
      maxUses: data.maxUses,
      expiresAt: data.expiresAt,
      bonusVideos: data.bonusVideos || 0,
      description: data.description,
    },
  });
}

// Get all promo codes (admin only)
export async function getAllPromoCodes() {
  return prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  });
}

// Deactivate a promo code (admin only)
export async function deactivatePromoCode(codeId: string) {
  return prisma.promoCode.update({
    where: { id: codeId },
    data: { active: false },
  });
}

// Delete a promo code (admin only)
export async function deletePromoCode(codeId: string) {
  const code = await prisma.promoCode.findUnique({
    where: { id: codeId },
  });

  if (!code) {
    throw new Error('Code not found');
  }

  if (code.isOwnerCode) {
    throw new Error('Cannot delete owner code');
  }

  return prisma.promoCode.delete({
    where: { id: codeId },
  });
}

// Initialize owner code (run once on startup)
export async function initializeOwnerCode() {
  const ownerCode = process.env.OWNER_CODE || 'JIMENEZ_2025_OWNER#';

  const existing = await prisma.promoCode.findUnique({
    where: { code: ownerCode },
  });

  if (!existing) {
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
    console.log('[Promo] Owner code initialized');
  }
}

// Get usage stats
export async function getUsageStats() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const totalVideosToday = await prisma.sessionUsage.aggregate({
    where: { date: today },
    _sum: { count: true },
  });

  const totalUsers = await prisma.sessionUsage.count({
    where: { date: today },
  });

  const totalRedemptions = await prisma.redemption.count();

  return {
    videosToday: totalVideosToday._sum.count || 0,
    usersToday: totalUsers,
    totalRedemptions,
  };
}

export { prisma };
