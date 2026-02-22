'use client';

import { useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HIDDEN_PROMPT_LENGTH, MAX_PROMPT_LENGTH } from '@/lib/types';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  totalLength?: number; // Total length including hidden prompt
}

export function PromptInput({ value, onChange, disabled, totalLength }: PromptInputProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save to localStorage
  const debouncedSave = useCallback((val: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      localStorage.setItem('video-gen-prompt', val);
    }, 500);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedSave(newValue);
  };

  // Calculate lengths
  const userLength = value.length;
  const calculatedTotal = userLength + (userLength > 0 ? 2 : 0) + HIDDEN_PROMPT_LENGTH;
  const displayTotal = totalLength || calculatedTotal;
  const remaining = MAX_PROMPT_LENGTH - displayTotal;

  // Smart character counter with warnings
  const getCharacterWarning = () => {
    if (displayTotal === 0) return null;
    if (displayTotal > MAX_PROMPT_LENGTH) return { level: 'error', message: `🔴 Exceeds ${MAX_PROMPT_LENGTH} char limit!` };
    if (displayTotal > MAX_PROMPT_LENGTH - 300) return { level: 'warning', message: `⚠️ Only ${remaining} chars remaining` };
    return null;
  };

  const warning = getCharacterWarning();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="prompt" className="text-base font-medium">
          Prompt
        </Label>
        <button
          onClick={() => {
            onChange('');
            localStorage.removeItem('video-gen-prompt');
          }}
          disabled={disabled}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Clear prompt"
        >
          Clear
        </button>
      </div>
      <div className="relative">
        <Textarea
          id="prompt"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Describe the motion you want... (e.g., 'woman tilts head slightly and smiles')"
          className="min-h-[80px] resize-y"
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            📝 Your input: <span className="font-medium">{userLength}</span> chars
          </span>
          <span className="text-muted-foreground">
            📊 Total: <span className={`font-medium ${displayTotal > MAX_PROMPT_LENGTH ? 'text-destructive' : ''}`}>{displayTotal}</span> / {MAX_PROMPT_LENGTH}
          </span>
          {warning && (
            <span className={warning.level === 'error' ? 'text-destructive font-medium' : 'text-yellow-600 dark:text-yellow-400'}>
              {warning.message}
            </span>
          )}
        </div>
        <span className="text-primary/70">
          Camera: tilt down/up, pan left/right, zoom in/out, selfie POV
        </span>
      </div>
    </div>
  );
}
