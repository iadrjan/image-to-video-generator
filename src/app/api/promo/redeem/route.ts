import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const HARDCODED_CODES = ['ASJVIP', 'ASJ_TESTER#', 'JIMENEZ_2025_OWNER#'];

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    
    // 1. Check Hardcoded First (Fastest, always works)
    if (HARDCODED_CODES.includes(code)) {
       return NextResponse.json({ success: true, message: "Code Valid (Offline)" });
    }

    // 2. Check DB if available
    if (prisma) {
      try {
        const dbCode = await prisma.promoCode.findUnique({ where: { code } });
        if (dbCode) return NextResponse.json({ success: true });
      } catch(e) {
        console.log('DB check failed');
      }
    }

    return NextResponse.json({ success: false, error: "Invalid Code" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
