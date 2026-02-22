'use client';

import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { VideoSettings } from '@/lib/types';
import { saveSettings } from '@/lib/storage';

interface GenerationSettingsProps {
  value: VideoSettings;
  onChange: (value: VideoSettings) => void;
  disabled?: boolean;
  useSeed?: boolean;
  onUseSeedChange?: (value: boolean) => void;
}

export function GenerationSettings({ 
  value, 
  onChange, 
  disabled,
  useSeed = false,
  onUseSeedChange
}: GenerationSettingsProps) {
  const handleChange = useCallback((key: keyof VideoSettings, newValue: VideoSettings[keyof VideoSettings]) => {
    const updated = { ...value, [key]: newValue };
    onChange(updated);
    saveSettings(updated);
  }, [value, onChange]);

  const handleSeedToggle = useCallback((enabled: boolean) => {
    onUseSeedChange?.(enabled);
    if (enabled && !value.seed) {
      handleChange('seed', Math.floor(Math.random() * 1000000));
    } else if (!enabled) {
      const updated = { ...value } as Omit<VideoSettings, 'seed'> & { seed?: number };
      delete updated.seed;
      onChange(updated as VideoSettings);
      saveSettings(updated as VideoSettings);
    }
  }, [value, onChange, handleChange, onUseSeedChange]);

  const handleMatchOriginalToggle = useCallback((enabled: boolean) => {
    const updated = { ...value, matchOriginalResolution: enabled };
    // When Match Original Resolution is ON, turn OFF Quality Mode
    if (enabled) {
      updated.enableQualityMode = false;
    }
    onChange(updated);
    saveSettings(updated);
  }, [value, onChange]);

  const handleQualityModeToggle = useCallback((enabled: boolean) => {
    handleChange('enableQualityMode', enabled);
  }, [handleChange]);

  return (
    <div className="space-y-6 p-4 bg-muted/30 rounded-xl border border-border">
      <h3 className="text-sm font-semibold text-foreground">Generation Settings</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration" className="text-xs font-medium">
            Duration
          </Label>
          <Select
            value={String(value.duration)}
            onValueChange={(v) => handleChange('duration', parseInt(v) as 5 | 10)}
            disabled={disabled}
          >
            <SelectTrigger id="duration" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 seconds</SelectItem>
              <SelectItem value="10">10 seconds</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Frame Rate */}
        <div className="space-y-2">
          <Label htmlFor="fps" className="text-xs font-medium">
            Frame Rate
          </Label>
          <Select
            value={String(value.fps)}
            onValueChange={(v) => handleChange('fps', parseInt(v) as 30 | 60)}
            disabled={disabled}
          >
            <SelectTrigger id="fps" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 FPS</SelectItem>
              <SelectItem value="60">60 FPS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resolution - disabled when match original is on */}
        <div className="space-y-2">
          <Label htmlFor="resolution" className="text-xs font-medium">
            Resolution
          </Label>
          <Select
            value={value.resolution}
            onValueChange={(v) => handleChange('resolution', v as '720p' | '1080p')}
            disabled={disabled || value.matchOriginalResolution}
          >
            <SelectTrigger id="resolution" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720p">720p (1280x720)</SelectItem>
              <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
            </SelectContent>
          </Select>
          {value.matchOriginalResolution && (
            <p className="text-[10px] text-muted-foreground">Auto-set to match your image</p>
          )}
        </div>

        {/* Generation Speed */}
        <div className="space-y-2">
          <Label htmlFor="quality" className="text-xs font-medium">
            Generation Speed
          </Label>
          <Select
            value={value.quality}
            onValueChange={(v) => handleChange('quality', v as 'speed' | 'quality')}
            disabled={disabled}
          >
            <SelectTrigger id="quality" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="speed">Fast</SelectItem>
              <SelectItem value="quality">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Match Original Resolution Toggle */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="match-original" className="text-xs font-medium">
              Match Original Resolution (No Upscale)
            </Label>
            <p className="text-xs text-muted-foreground">
              Output video matches input image resolution with minimal processing
            </p>
          </div>
          <Switch
            id="match-original"
            checked={value.matchOriginalResolution}
            onCheckedChange={handleMatchOriginalToggle}
            disabled={disabled}
          />
        </div>
        
        {value.matchOriginalResolution && (
          <div className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg mt-2">
            <span className="font-medium">RAW Mode Active</span>
            <span className="block mt-1 text-[11px] opacity-80">
              Video will use your image&apos;s exact resolution and minimal processing for raw output.
            </span>
          </div>
        )}
      </div>

      {/* Quality Mode Toggle */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="quality-mode" className="text-xs font-medium">
              Enhanced Quality Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Apply additional processing for smoother output
            </p>
          </div>
          <Switch
            id="quality-mode"
            checked={value.enableQualityMode}
            onCheckedChange={handleQualityModeToggle}
            disabled={disabled || value.matchOriginalResolution}
          />
        </div>
        
        {value.matchOriginalResolution && (
          <p className="text-[10px] text-muted-foreground italic">
            Disabled when Match Original Resolution is ON
          </p>
        )}
      </div>

      {/* Seed */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label htmlFor="seed-toggle" className="text-xs font-medium">
            Fixed Seed
          </Label>
          <Switch
            id="seed-toggle"
            checked={useSeed}
            onCheckedChange={handleSeedToggle}
            disabled={disabled}
          />
        </div>
        {useSeed && (
          <div className="flex items-center gap-2">
            <Input
              id="seed"
              type="number"
              value={value.seed || ''}
              onChange={(e) => handleChange('seed', parseInt(e.target.value) || 0)}
              disabled={disabled}
              placeholder="Random seed"
              className="h-9"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChange('seed', Math.floor(Math.random() * 1000000))}
              disabled={disabled}
              className="h-9 px-3"
            >
              Random
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Use a fixed seed for reproducible results
        </p>
      </div>
    </div>
  );
}
