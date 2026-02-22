// Client-side API utilities for video generation

import { VideoSettings } from './types';

const API_BASE = '/api/video';

export interface GenerateRequest {
  imageBase64: string;
  prompt: string;
  userPrompt?: string; // Original user prompt for saving
  settings: VideoSettings;
  sessionId?: string;
  userId?: string;
}

export interface GenerateResponse {
  taskId: string;
  status: string;
  error?: string;
  type?: string;
}

export interface StatusResponse {
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL' | 'CANCELLED';
  progress: number;
  videoUrl?: string;
  error?: string;
}

// Helper: Delay with exponential backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Check if error is network-related
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('aborted')
    );
  }
  return false;
}

// Helper: Check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Network errors are retryable
    if (isNetworkError(error)) return true;
    // Server errors (5xx) are retryable
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) return true;
    // Rate limiting is NOT retryable for us (usage limits)
    if (message.includes('429')) return false;
  }
  return false;
}

// Robust fetch with retry logic
async function robustFetch(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Check for server errors that should be retried
      if (response.status >= 500) {
        throw new Error(`Server error ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort (user cancelled)
      if (lastError.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      
      // Check if we should retry
      const shouldRetry = isRetryableError(error) && attempt < maxRetries;
      
      if (shouldRetry) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.log(`[video-api] Retry attempt ${attempt}/${maxRetries} after ${backoffMs}ms...`);
        await delay(backoffMs);
        continue;
      }
      
      // Not retryable or out of retries
      break;
    }
  }
  
  // Transform error to user-friendly message
  if (isNetworkError(lastError)) {
    throw new Error('Unable to connect to server. Please check your internet connection and try again.');
  }
  
  throw lastError || new Error('Request failed');
}

// Start video generation with automatic retry
export async function startGeneration(
  request: GenerateRequest,
  retryCount: number = 0
): Promise<GenerateResponse> {
  const formData = new FormData();
  
  // Extract base64 data from data URL
  const base64Data = request.imageBase64;
  
  formData.append('image', base64Data);
  formData.append('prompt', request.prompt);
  if (request.userPrompt) {
    formData.append('userPrompt', request.userPrompt);
  }
  formData.append('duration', String(request.settings.duration));
  formData.append('fps', String(request.settings.fps));
  formData.append('resolution', request.settings.resolution);
  formData.append('quality', request.settings.quality);
  formData.append('matchOriginalResolution', String(request.settings.matchOriginalResolution));
  formData.append('enableQualityMode', String(request.settings.enableQualityMode));
  
  if (request.settings.seed) {
    formData.append('seed', String(request.settings.seed));
  }

  // Add session and user ID for usage tracking
  if (request.sessionId) {
    formData.append('sessionId', request.sessionId);
  }
  if (request.userId) {
    formData.append('userId', request.userId);
  }

  console.log('[video-api] Sending generation request...', {
    promptLength: request.prompt.length,
    userPromptLength: request.userPrompt?.length || 0,
    matchOriginalResolution: request.settings.matchOriginalResolution,
    enableQualityMode: request.settings.enableQualityMode
  });

  try {
    const response = await robustFetch(`${API_BASE}/generate`, {
      method: 'POST',
      body: formData,
    }, 3);

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      let errorType = 'UNKNOWN';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorType = errorData.type || errorType;
      } catch {
        // Ignore JSON parse errors
      }
      
      // Handle specific error codes
      if (response.status === 400) {
        throw new Error(errorMessage);
      }
      if (response.status === 413) {
        throw new Error('Image file is too large. Please try a smaller image.');
      }
      if (response.status === 429) {
        // Usage limit reached
        const error = new Error(errorMessage);
        (error as any).type = 'USAGE_LIMIT';
        throw error;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[video-api] Generation started:', data);
    return data;
  } catch (error) {
    console.error('[video-api] Generation start failed:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (isNetworkError(error)) {
        throw new Error('Unable to connect to server. Please check your internet connection and try again.');
      }
      throw error;
    }
    
    throw new Error('Failed to start video generation. Please try again.');
  }
}

// Check generation status with automatic retry
export async function checkStatus(taskId: string): Promise<StatusResponse> {
  let lastError: Error | null = null;
  const maxRetries = 5;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await robustFetch(`${API_BASE}/status/${taskId}`, {
        method: 'GET',
      }, 2);

      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // For status checks, we want to be more resilient
      // Network errors should be retried silently
      if (isNetworkError(error) && attempt < maxRetries) {
        const backoffMs = Math.min(500 * attempt, 3000);
        console.log(`[video-api] Status check retry ${attempt}/${maxRetries}...`);
        await delay(backoffMs);
        continue;
      }
      
      break;
    }
  }
  
  // For status checks, throw a special error that won't stop polling
  throw lastError || new Error('Status check failed');
}

// Cancel generation with retry
export async function cancelGeneration(taskId: string): Promise<{ success: boolean }> {
  try {
    const response = await robustFetch(`${API_BASE}/cancel/${taskId}`, {
      method: 'POST',
    }, 2);

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    console.error('[video-api] Cancel failed:', error);
    // Return success anyway - cancel is best effort
    return { success: true };
  }
}

// Download video helper - handles cross-origin videos
export async function downloadVideo(videoUrl: string, filename: string): Promise<void> {
  // For external URLs, open in new tab (avoids CORS issues)
  if (videoUrl.startsWith('http')) {
    window.open(videoUrl, '_blank');
    return;
  }
  
  // For local/blob URLs, try to download
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'generated-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    // Fallback: open in new tab
    console.log('[video-api] Direct download not available, opening in new tab');
    window.open(videoUrl, '_blank');
  }
}
