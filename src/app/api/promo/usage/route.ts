import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  // If no DB, return fake stats so the admin panel doesn't crash
  if (!prisma) {
    return NextResponse.json({ 
      totalRedemptions: 0, 
      activeCodes: 3, 
      status: 'Offline Mode' 
    });
  }

  try {
    const count = await prisma.redemption.count();
    return NextResponse.json({ totalRedemptions: count, status: 'Online' });
  } catch (error) {
    return NextResponse.json({ totalRedemptions: 0, status: 'Error' });
  }
}
