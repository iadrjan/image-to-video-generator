import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    console.log("Generating video for prompt:", prompt);

    // SIMULATED SUCCESS
    // Since we disabled the DB, we just return a success message.
    // Connect your actual Z.ai SDK here later when ready.
    return NextResponse.json({
      success: true,
      videoUrl: "https://files.catbox.moe/2f9szw.zip", // Placeholder link
      message: "Video generated (Simulation Mode)"
    });

  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
