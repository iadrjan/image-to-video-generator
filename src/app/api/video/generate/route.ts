import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { v4 as uuidv4 } from 'uuid';
import { RESOLUTION_MAP, MAX_PROMPT_LENGTH } from '@/lib/types';
import { setTask, getTask } from '@/lib/task-store';

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }
  return false;
}

// Helper: Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  operation: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const shouldRetry = isRetryableError(error) && attempt < maxRetries;
      
      if (shouldRetry) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`[Retry] ${operation} attempt ${attempt}/${maxRetries} failed, retrying in ${backoffMs}ms...`);
        await delay(backoffMs);
        continue;
      }
      
      break;
    }
  }
  
  throw lastError || new Error(`${operation} failed after ${maxRetries} attempts`);
}

// Extract image dimensions from base64 data
function getImageDimensions(base64Data: string): { width: number; height: number } | null {
  try {
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    
    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if ([0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF].includes(marker)) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
    }
    
    // WebP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        let offset = 12;
        while (offset < buffer.length - 8) {
          const chunkType = buffer.slice(offset, offset + 4).toString('ascii');
          const chunkSize = buffer.readUInt32LE(offset + 4);
          if (chunkType === 'VP8 ') {
            return { width: buffer.readUInt16LE(offset + 8 + 6) & 0x3FFF, height: buffer.readUInt16LE(offset + 8 + 8) & 0x3FFF };
          }
          if (chunkType === 'VP8L') {
            const bits = buffer.readUInt32LE(offset + 8);
            return { width: (bits & 0x3FFF) + 1, height: ((bits >> 14) & 0x3FFF) + 1 };
          }
          offset += 8 + chunkSize + (chunkSize % 2);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('[getImageDimensions] Error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const imageBase64 = formData.get('image') as string;
    const prompt = formData.get('prompt') as string || '';
    const userPrompt = formData.get('userPrompt') as string || '';
    const duration = parseInt(formData.get('duration') as string) || 5;
    const fps = parseInt(formData.get('fps') as string) || 30;
    const resolution = formData.get('resolution') as string || '1080p';
    const quality = formData.get('quality') as string || 'quality';
    const seed = formData.get('seed') ? parseInt(formData.get('seed') as string) : undefined;
    const matchOriginalResolution = formData.get('matchOriginalResolution') === 'true';
    const enableQualityMode = formData.get('enableQualityMode') === 'true';

    console.log('[Generate] Request:', {
      hasImage: !!imageBase64,
      promptLength: prompt.length,
      duration,
      fps,
      matchOriginalResolution,
      enableQualityMode,
    });

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check usage limits (promo code system) - with graceful fallback
    const sessionId = formData.get('sessionId') as string;
    const userId = formData.get('userId') as string | undefined;

    if (sessionId) {
      try {
        const { canGenerateVideo, incrementVideoCount } = await import('@/lib/promo-db');
        const usageCheck = await canGenerateVideo(sessionId, userId);
        if (!usageCheck.canGenerate) {
          return NextResponse.json({
            error: usageCheck.reason || 'Daily limit reached. Try a promo code for more videos!',
            type: 'USAGE_LIMIT',
            remaining: usageCheck.remaining,
            total: usageCheck.total,
          }, { status: 429 });
        }
        // Increment the count
        await incrementVideoCount(sessionId);
      } catch (dbError) {
        console.warn('[Generate] Database not available, skipping usage check:', dbError);
        // Allow generation to continue without database
      }
    }

    // Validate prompt length (API has 4000 char limit)
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ 
        error: `Prompt too long (${prompt.length} characters). API limit is ${MAX_PROMPT_LENGTH} characters.`,
        type: 'PROMPT_TOO_LONG',
        currentLength: prompt.length,
        maxLength: MAX_PROMPT_LENGTH
      }, { status: 400 });
    }

    // Determine video size
    let videoSize: string;
    if (matchOriginalResolution) {
      const dimensions = getImageDimensions(imageBase64);
      if (dimensions) {
        videoSize = `${dimensions.width}x${dimensions.height}`;
        console.log(`[Generate] Original resolution: ${videoSize}`);
      } else {
        videoSize = RESOLUTION_MAP['1080p'];
        console.warn('[Generate] Could not detect dimensions, using 1080p');
      }
    } else {
      videoSize = RESOLUTION_MAP[resolution as '720p' | '1080p'];
    }

    const taskId = uuidv4();
    setTask(taskId, {
      status: 'PROCESSING',
      progress: 0,
      startTime: Date.now(),
      imageUrl: imageBase64,
      prompt,
      settings: { duration, fps, resolution, quality, matchOriginalResolution, enableQualityMode },
    });

    // Start video generation
    generateVideo(taskId, {
      imageBase64,
      prompt,
      duration: duration as 5 | 10,
      fps: fps as 30 | 60,
      videoSize,
      matchOriginalResolution,
      enableQualityMode,
      seed,
    }).catch((error) => {
      console.error('[Generate] Unhandled error:', error);
      const task = getTask(taskId);
      if (task && task.status !== 'CANCELLED') {
        const errorMessage = error instanceof Error ? error.message : 'Generation failed';
        setTask(taskId, { ...task, status: 'FAIL', error: errorMessage });
      }
    });

    return NextResponse.json({ taskId, status: 'PROCESSING' });
  } catch (error) {
    console.error('[Generate] API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function generateVideo(
  taskId: string,
  options: {
    imageBase64: string;
    prompt: string;
    duration: 5 | 10;
    fps: 30 | 60;
    videoSize: string;
    matchOriginalResolution: boolean;
    enableQualityMode: boolean;
    seed?: number;
  }
) {
  console.log('[Generate] Starting generation for task:', taskId);
  
  // Initialize SDK with retry
  let zai;
  try {
    zai = await withRetry(async () => await ZAI.create(), 3, 'SDK initialization');
  } catch (error) {
    console.error('[Generate] SDK init failed after retries:', error);
    const task = getTask(taskId);
    if (task) setTask(taskId, { 
      ...task, 
      status: 'FAIL', 
      error: 'Failed to connect to AI service. Please check your connection and try again.' 
    });
    return;
  }
  
  const updateProgress = (progress: number) => {
    const task = getTask(taskId);
    if (task && task.status !== 'CANCELLED') setTask(taskId, { ...task, progress });
  };

  const setFailed = (error: string) => {
    const task = getTask(taskId);
    if (task && task.status !== 'CANCELLED') setTask(taskId, { ...task, status: 'FAIL', error });
  };

  try {
    updateProgress(10);

    // Build request
    const requestParams: Record<string, unknown> = {
      image_url: options.imageBase64,
      duration: options.duration,
      fps: options.fps,
      size: options.videoSize,
    };

    // Determine quality setting
    if (options.matchOriginalResolution) {
      requestParams.quality = 'speed';
    } else if (!options.enableQualityMode) {
      requestParams.quality = 'speed';
    } else {
      requestParams.quality = 'quality';
    }

    // Add prompt if provided
    if (options.prompt?.trim()) {
      requestParams.prompt = options.prompt;
    }

    if (options.seed !== undefined) {
      requestParams.seed = options.seed;
    }

    console.log('[Generate] Params:', {
      size: requestParams.size,
      quality: requestParams.quality,
      duration: requestParams.duration,
      promptLength: (requestParams.prompt as string)?.length || 0,
    });

    // Create video generation task
    let task;
    try {
      task = await withRetry(
        async () => await zai.video.generations.create(requestParams),
        3,
        'Video task creation'
      );
    } catch (createError) {
      console.error('[Generate] API Error:', createError);
      
      let errorMsg = 'Unknown error';
      if (createError instanceof Error) {
        errorMsg = createError.message;
      }
      
      setFailed(`API Error: ${errorMsg}`);
      return;
    }
    
    console.log('[Generate] Task created:', task.id, task.task_status);
    updateProgress(20);

    // Poll for results
    let attempts = 0;
    const maxAttempts = 180;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 15;

    while (attempts < maxAttempts) {
      const currentTask = getTask(taskId);
      if (currentTask?.status === 'CANCELLED') {
        console.log('[Generate] Cancelled by user');
        return;
      }

      let result;
      try {
        result = await zai.async.result.query(task.id);
        consecutiveErrors = 0;
      } catch (queryError) {
        consecutiveErrors++;
        console.error(`[Generate] Query error (${consecutiveErrors}/${maxConsecutiveErrors}):`, queryError);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          setFailed('Lost connection to video generation service. Please try again.');
          return;
        }
        
        await delay(5000);
        attempts++;
        continue;
      }
      
      attempts++;
      
      const elapsed = Date.now() - (currentTask?.startTime || Date.now());
      const estimatedTotal = options.duration === 10 ? 300000 : 180000;
      updateProgress(Math.min(90, Math.round(20 + (elapsed / estimatedTotal) * 70)));

      console.log(`[Generate] Poll ${attempts}: ${result.task_status}`);

      if (result.task_status === 'SUCCESS') {
        const videoUrl = result.video_result?.[0]?.url || result.video_url || (result as any).url || (result as any).video;
        if (videoUrl) {
          console.log('[Generate] Success! Video URL:', videoUrl);
          
          setTask(taskId, {
            status: 'SUCCESS',
            progress: 100,
            videoUrl,
            startTime: currentTask?.startTime || Date.now(),
            imageUrl: currentTask?.imageUrl,
            prompt: currentTask?.prompt,
            settings: currentTask?.settings,
          });
          return;
        }
        console.error('[Generate] No video URL in response:', result);
        setFailed('Generation completed but no video was returned.');
        return;
      }

      if (result.task_status === 'FAIL') {
        console.error('[Generate] Task failed:', result);
        setFailed('Video generation failed. Please try with a different image.');
        return;
      }

      await delay(5000);
    }

    setFailed('Video generation timed out. Please try again.');
  } catch (error) {
    console.error('[Generate] Unexpected error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unexpected error';
    setFailed(errorMsg);
  }
}
