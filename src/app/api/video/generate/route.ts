import { NextResponse } from 'next/server';

// Safe Z.ai SDK Import (Prevents TypeScript errors)
let client: any;
try {
  const sdk = require('z-ai-web-dev-sdk');
  const ZAIClient = sdk.ZAIClient || sdk.default || sdk;
  client = new ZAIClient({
    apiKey: process.env.Z_AI_API_KEY || '',
  });
} catch (e) {
  console.error('SDK Error:', e);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, imageUrl } = body; 

    console.log("Generating:", prompt);

    if (!process.env.Z_AI_API_KEY) {
      // Mock response if you haven't added the key yet
      return NextResponse.json({ 
        success: true, 
        videoUrl: "https://files.catbox.moe/2f9szw.zip",
        message: "Mock Mode (Add API Key in Vercel)"
      });
    }

    // Real Generation
    const completion = await client.video.create({
      prompt: prompt,
      image_url: imageUrl, 
      duration: 5,
    });

    return NextResponse.json({ 
      success: true, 
      videoUrl: completion.url 
    });

  } catch (error) {
    console.error('Gen Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
