import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  console.log('[Video Gen] Request received.');
  try {
    const body = await request.json();
    const { prompt, sessionId } = body;

    if (!prompt) return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });

    // Safe DB check (does not crash if DB is down)
    if (prisma && sessionId) {
      try {
        await prisma.session.findUnique({ where: { id: sessionId } });
      } catch (e) {
        console.log('Session check failed, ignoring.');
      }
    }

    // Mock response for now to ensure Deployment succeeds
    // You can replace this with the real z.ai SDK call later
    const mockVideoUrl = 'https://files.catbox.moe/2f9szw.zip'; // Placeholder

    return NextResponse.json({
      success: true,
      videoUrl: mockVideoUrl,
      message: 'Video generation successful (Mock Mode)'
    });

  } catch (error) {
    console.error('Video Gen Error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
