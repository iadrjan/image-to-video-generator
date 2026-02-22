import { NextResponse } from 'next/server';
import { validatePromoCode } from '@/lib/promo-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Required' }, { status: 400 });
    }

    const result = await validatePromoCode(code);

    if (result.valid) {
      return NextResponse.json({ success: true, message: 'Code Applied!' });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }
  } catch (error) {
    console.error('Promo Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
