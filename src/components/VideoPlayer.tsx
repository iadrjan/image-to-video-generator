'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  onDownload?: () => void;
  filename?: string;
}

export function VideoPlayer({ src, onDownload, filename = 'generated-video.mp4' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = async () => {
    try {
      // Try container first (better for controls)
      const element = containerRef.current || videoRef.current;
      
      if (!element) return;

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ('webkitRequestFullscreen' in element) {
        // Safari fallback
        (element as any).webkitRequestFullscreen();
      } else {
        // Fallback: open video in new tab
        window.open(src, '_blank');
      }
    } catch (error) {
      // Fallback: open video in new tab
      window.open(src, '_blank');
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // Direct download approach - create an anchor and trigger download
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    link.target = '_blank';
    
    // For cross-origin URLs, just open in new tab
    if (src.startsWith('http')) {
      window.open(src, '_blank');
    } else {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative group rounded-xl overflow-hidden bg-black"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-auto"
        loop
        playsInline
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Play/Pause Overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        onClick={togglePlay}
      >
        {!isPlaying && (
          <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="w-12 h-12 text-white" fill="white" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="text-white hover:text-white hover:bg-white/20"
              title="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:text-white hover:bg-white/20"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
