import { NextRequest, NextResponse } from 'next/server';
import { getAllPromoCodes, createPromoCode, deletePromoCode, deactivatePromoCode, getUsageStats } from '@/lib/promo-db';
import { AccessType, PromoType } from '@prisma/client';

// Verify admin password
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return false;
  }

  // Check Bearer token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return token === adminPassword;
  }

  return false;
}

// GET - List all promo codes
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const codes = await getAllPromoCodes();
    const stats = await getUsageStats();

    return NextResponse.json({ codes, stats });
  } catch (error) {
    console.error('[Admin Codes GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new promo code
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code, accessType, type, maxUses, expiresAt, bonusVideos, description } = body;

    if (!code || !accessType) {
      return NextResponse.json(
        { error: 'Code and access type are required' },
        { status: 400 }
      );
    }

    const newCode = await createPromoCode({
      code: code.trim().toUpperCase(),
      accessType: accessType as AccessType,
      type: type as PromoType || undefined,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      bonusVideos: bonusVideos ? parseInt(bonusVideos) : undefined,
      description,
    });

    return NextResponse.json({ success: true, code: newCode });
  } catch (error: any) {
    console.error('[Admin Codes POST] Error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A code with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a promo code
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json({ error: 'Code ID is required' }, { status: 400 });
    }

    await deletePromoCode(codeId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Codes DELETE] Error:', error);

    if (error.message === 'Cannot delete owner code') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
