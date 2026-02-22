// Video generation types

export interface VideoSettings {
  duration: 5 | 10;
  fps: 30 | 60;
  resolution: '720p' | '1080p';
  quality: 'speed' | 'quality';
  matchOriginalResolution: boolean; // When true, output matches input image resolution
  enableQualityMode: boolean; // When false, no denoising/enhancement filters
  seed?: number;
}

export interface CameraMotion {
  type: 'tilt_down' | 'tilt_up' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'handheld_pov' | null;
  instruction: string;
}

// Camera movement detection patterns
export const CAMERA_PATTERNS: { patterns: RegExp[]; motion: CameraMotion }[] = [
  {
    patterns: [
      /lower\s+camera/i, /tilt\s+down/i, /camera\s+tilts?\s+down/i, 
      /camera\s+moves?\s+down/i, /look\s+down/i, /point\s+camera\s+down/i
    ],
    motion: {
      type: 'tilt_down',
      instruction: 'Smooth downward tilt. Camera tilts down gradually from starting position. Natural tilt motion with consistent speed.',
    }
  },
  {
    patterns: [
      /raise\s+camera/i, /tilt\s+up/i, /camera\s+tilts?\s+up/i,
      /camera\s+moves?\s+up/i, /look\s+up/i, /point\s+camera\s+up/i
    ],
    motion: {
      type: 'tilt_up',
      instruction: 'Smooth upward tilt. Camera tilts up gradually from starting position. Natural tilt motion with consistent speed.',
    }
  },
  {
    patterns: [
      /pan\s+left/i, /camera\s+pans?\s+left/i, /camera\s+moves?\s+left/i,
      /scroll\s+left/i, /move\s+left/i
    ],
    motion: {
      type: 'pan_left',
      instruction: 'Smooth left pan. Camera pans left horizontally across the scene. Natural horizontal pan with consistent speed.',
    }
  },
  {
    patterns: [
      /pan\s+right/i, /camera\s+pans?\s+right/i, /camera\s+moves?\s+right/i,
      /scroll\s+right/i, /move\s+right/i
    ],
    motion: {
      type: 'pan_right',
      instruction: 'Smooth right pan. Camera pans right horizontally across the scene. Natural horizontal pan with consistent speed.',
    }
  },
  {
    patterns: [
      /zoom\s+in/i, /camera\s+zooms?\s+in/i, /push\s+in/i, /dolly\s+in/i,
      /move\s+closer/i, /get\s+closer/i
    ],
    motion: {
      type: 'zoom_in',
      instruction: 'Smooth zoom in. Camera zooms in gradually toward the subject. Natural zoom progression with consistent speed.',
    }
  },
  {
    patterns: [
      /zoom\s+out/i, /camera\s+zooms?\s+out/i, /pull\s+out/i, /pull\s+back/i,
      /dolly\s+out/i, /wide\s+shot/i, /pull\s+away/i
    ],
    motion: {
      type: 'zoom_out',
      instruction: 'Smooth zoom out. Camera zooms out gradually from the subject. Natural zoom progression with consistent speed.',
    }
  },
  {
    patterns: [
      /selfie\s+pov/i, /pov\s+video/i, /first\s+person/i, /fpv/i,
      /handheld\s+camera/i, /phone\s+pov/i, /subject\s+perspective/i
    ],
    motion: {
      type: 'handheld_pov',
      instruction: 'Handheld POV style. Authentic first-person camera perspective with natural micro-movements. Subtle camera shake and breathing motion.',
    }
  }
];

// Detect camera motion from user prompt
export function detectCameraMotion(userPrompt: string): CameraMotion | null {
  for (const { patterns, motion } of CAMERA_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(userPrompt)) {
        return motion;
      }
    }
  }
  return null;
}

export interface GenerationTask {
  id: string;
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL' | 'CANCELLED';
  progress: number;
  videoUrl?: string;
  imageUrl?: string;
  prompt?: string;
  settings?: VideoSettings;
  imageWidth?: number;
  imageHeight?: number;
  createdAt: number;
  error?: string;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  videoUrl: string;
  prompt: string;
  settings: VideoSettings;
  createdAt: number;
  isFavorite: boolean;
  thumbnail?: string;
}

// Hidden prompt base - combined quality instructions (sent to API as single prompt)
// ~1,730 characters total, leaving ~2,270 for user input
export const HIDDEN_PROMPT_BASE = `STRICT: Frame 1 identical to source. No pixel modification. Match luminance, contrast, color exactly. No auto-levels, auto-contrast, auto-color. No post-processing, frame enhancement, temporal denoising. CRITICAL: Preserve grain structure, noise pattern, texture pixel-for-pixel. Keep film grain, digital noise, compression artifacts, sensor noise, JPEG artifacts. Authentic skin texture: visible pores, fine lines, blemishes, freckles exactly as original. No smoothing, denoising, enhancing, upscaling, beauty filters. Raw sensor noise, natural eye color, realistic teeth. Preserve lighting, shadows, highlights, color temperature, white balance. Shot on iPhone 15 Pro standard mode, no HDR, raw output with defects. Natural handheld movement with micro-jitter, breathing motion. Camera movements smooth with organic acceleration/deceleration, realistic easing: slow start, smooth middle, gentle stop. No mechanical/robotic camera. ABSOLUTE ZERO SMOOTHING: Every grain/noise pixel transfers identically. Grain flickers naturally between frames maintaining density. JPEG artifacts, banding, color noise visible every frame. No temporal stabilization, frame blending, noise reduction. Each frame as noisy as source. Paused frame indistinguishable from original. Realistic hand-to-clothing interaction with fabric deformation, finger grip, fabric tension. Apply realistic physics. AVOID: smoothing, denoising, beauty filters, auto-enhancement, grain removal, plastic skin, temporal smoothing, fake motion, stiff camera, processed video.`;

// Length of hidden prompt for UI display purposes
export const HIDDEN_PROMPT_LENGTH = HIDDEN_PROMPT_BASE.length; // ~1,730 chars

// API limit for total prompt
export const MAX_PROMPT_LENGTH = 4000;

export const DEFAULT_SETTINGS: VideoSettings = {
  duration: 5,
  fps: 30,
  resolution: '1080p',
  quality: 'quality',
  matchOriginalResolution: true, // Default to ON - match original image resolution
  enableQualityMode: false, // Default to OFF when matchOriginalResolution is ON
};

export const RESOLUTION_MAP: Record<'720p' | '1080p', string> = {
  '720p': '1280x720',
  '1080p': '1920x1080',
};

export const MAX_HISTORY_ITEMS = 50;
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const POLL_INTERVAL = 5000; // 5 seconds
export const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutes
