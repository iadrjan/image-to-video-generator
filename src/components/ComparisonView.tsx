'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Heart } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { downloadVideo } from '@/lib/video-api';
import { HistoryItem } from '@/lib/types';

interface ComparisonViewProps {
  imageUrl: string;
  videoUrl: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  historyItem?: HistoryItem;
}

export function ComparisonView({
  imageUrl,
  videoUrl,
  isFavorite = false,
  onToggleFavorite,
  historyItem,
}: ComparisonViewProps) {
  const [viewMode, setViewMode] = useState<'comparison' | 'video'>('comparison');

  const handleDownload = async () => {
    const filename = historyItem
      ? `video-${historyItem.id.slice(0, 8)}.mp4`
      : 'generated-video.mp4';
    await downloadVideo(videoUrl, filename);
  };

  // Get display settings - show actual values used, not dropdown values
  const getDisplaySettings = () => {
    if (!historyItem?.settings) return '';
    
    const s = historyItem.settings;
    
    // When Match Original Resolution is ON, show RAW mode
    if (s.matchOriginalResolution) {
      return `${s.duration}s, ${s.fps}fps, Original Resolution, RAW mode`;
    }
    
    // When Quality Mode is OFF (but not matching original), show raw
    if (!s.enableQualityMode) {
      return `${s.duration}s, ${s.fps}fps, ${s.resolution}, RAW mode`;
    }
    
    // Quality Mode is ON
    return `${s.duration}s, ${s.fps}fps, ${s.resolution}, Enhanced mode`;
  };

  return (
    <div className="w-full space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'comparison' | 'video')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comparison">Side by Side</TabsTrigger>
            <TabsTrigger value="video">Video Only</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFavorite}
            className={isFavorite ? 'text-red-500' : ''}
          >
            <Heart className={`w-4 h-4 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Favorited' : 'Favorite'}
          </Button>
          <Button variant="default" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={viewMode} className="w-full">
        <TabsContent value="comparison" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Image */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Original image"
                    className="w-full h-auto object-contain bg-muted"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                    Original Image
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generated Video */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <VideoPlayer
                    src={videoUrl}
                    onDownload={handleDownload}
                    filename={historyItem ? `video-${historyItem.id.slice(0, 8)}.mp4` : 'generated-video.mp4'}
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs z-10">
                    Generated Video
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="video" className="mt-0">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <VideoPlayer
                src={videoUrl}
                onDownload={handleDownload}
                filename={historyItem ? `video-${historyItem.id.slice(0, 8)}.mp4` : 'generated-video.mp4'}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metadata - Only show user's typed prompt, hidden defaults stay hidden */}
      {historyItem && (
        <div className="text-sm text-muted-foreground space-y-1">
          {historyItem.prompt && historyItem.prompt.trim() && (
            <p><strong>Your Prompt:</strong> {historyItem.prompt}</p>
          )}
          {!historyItem.prompt?.trim() && (
            <p><strong>Prompt:</strong> <span className="text-muted-foreground/60">Using optimized defaults</span></p>
          )}
          <p><strong>Settings:</strong> {getDisplaySettings()}</p>
        </div>
      )}
    </div>
  );
}
