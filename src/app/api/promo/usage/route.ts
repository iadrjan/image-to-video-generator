import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory fallback when database is not available
const memoryUsage = new Map<string, { count: number; date: string }>();
const DAILY_LIMIT = 3;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId') || undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Try to use database first
    try {
      const { canGenerateVideo } = await import('@/lib/promo-db');
      const usage = await canGenerateVideo(sessionId, userId);
      return NextResponse.json(usage);
    } catch (dbError) {
      console.warn('[Promo Usage] Database not available, using fallback:', dbError);
      
      // Fallback to in-memory storage
      const today = new Date().toISOString().split('T')[0];
      const key = `${sessionId}:${today}`;
      const current = memoryUsage.get(key) || { count: 0, date: today };
      
      // Clean up old entries
      for (const [k] of memoryUsage) {
        if (!k.endsWith(today)) {
          memoryUsage.delete(k);
        }
      }
      
      const remaining = Math.max(0, DAILY_LIMIT - current.count);
      
      return NextResponse.json({
        canGenerate: current.count < DAILY_LIMIT,
        remaining,
        total: DAILY_LIMIT,
        hasUnlimited: false,
      });
    }
  } catch (error) {
    console.error('[Promo Usage] Error:', error);
    // Return a safe default that allows generation
    return NextResponse.json({
      canGenerate: true,
      remaining: 3,
      total: 3,
      hasUnlimited: false,
    });
  }
}
