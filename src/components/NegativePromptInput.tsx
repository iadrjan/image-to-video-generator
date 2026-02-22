'use client';

import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface NegativePromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function NegativePromptInput({ value, onChange, disabled }: NegativePromptInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save to localStorage
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      localStorage.setItem('video-gen-negative-prompt', newValue);
    }, 500);
  };

  // Smart character counter with warnings
  const getCharacterWarning = () => {
    const len = value.length;
    if (len === 0) return null;
    if (len > 7500) return { level: 'error', message: '🔴 Very long - may hit API limit' };
    if (len > 6000) return { level: 'warning', message: '⚠️ Getting long' };
    return null;
  };

  const warning = getCharacterWarning();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="negative-prompt" className="text-base font-medium">
            Negative Prompt
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 text-xs"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {value.length > 0 && (
            <span className="text-xs text-muted-foreground">
              📝 {value.length} characters
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange('');
              localStorage.removeItem('video-gen-negative-prompt');
            }}
            disabled={disabled}
            className="h-7 px-2"
            title="Clear to use default"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      <div className="relative">
        <Textarea
          id="negative-prompt"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Optional: Things to avoid in the generation..."
          className={`resize-y transition-all duration-200 ${
            isExpanded ? 'min-h-[150px]' : 'min-h-[60px]'
          }`}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {value.trim() ? 'Your negative prompt + optimized defaults (hidden)' : 'Using optimized defaults (hidden)'}
        </span>
        {warning && (
          <span className={warning.level === 'error' ? 'text-destructive' : 'text-yellow-600 dark:text-yellow-400'}>
            {warning.message}
          </span>
        )}
      </div>
    </div>
  );
}
