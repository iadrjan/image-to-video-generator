'use client';

import { useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import { GenerationTask } from '@/lib/types';

interface GenerationProgressProps {
  task: GenerationTask | null;
  retryCount?: number;
  onRetry: () => void;
  onCancel: () => void;
}

export function GenerationProgress({ task, retryCount = 0, onRetry, onCancel }: GenerationProgressProps) {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (task?.status === 'PROCESSING') {
      startTimeRef.current = Date.now();
    }
  }, [task?.status]);

  if (!task) return null;

  const elapsed = Date.now() - startTimeRef.current;
  const estimatedTotal = 180000; // 3 minutes default estimate
  const remainingTime = Math.max(0, estimatedTotal - elapsed);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Detect error type for better messaging
  const getErrorType = (error?: string): 'network' | 'prompt' | 'server' | 'unknown' => {
    if (!error) return 'unknown';
    
    const lowerError = error.toLowerCase();
    
    if (
      lowerError.includes('fetch') || 
      lowerError.includes('network') || 
      lowerError.includes('connect') ||
      lowerError.includes('connection') ||
      lowerError.includes('internet')
    ) {
      return 'network';
    }
    
    if (
      lowerError.includes('prompt') ||
      lowerError.includes('too long') ||
      lowerError.includes('4000') ||
      lowerError.includes('character') ||
      lowerError.includes('invalid')
    ) {
      return 'prompt';
    }
    
    if (
      lowerError.includes('500') ||
      lowerError.includes('502') ||
      lowerError.includes('503') ||
      lowerError.includes('504') ||
      lowerError.includes('server') ||
      lowerError.includes('busy') ||
      lowerError.includes('timeout')
    ) {
      return 'server';
    }
    
    return 'unknown';
  };

  // Get user-friendly error message
  const getErrorMessage = (error?: string) => {
    if (!error) return 'An error occurred during generation';
    
    const errorType = getErrorType(error);
    
    switch (errorType) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'prompt':
        return 'Your prompt is too long or contains invalid content. Please shorten your prompt and try again.';
      case 'server':
        return 'The server is currently busy or experiencing issues. Please wait a moment and try again.';
      default:
        return error;
    }
  };

  // Get troubleshooting tips based on error type
  const getTroubleshootingTips = (error?: string) => {
    const errorType = getErrorType(error);
    
    switch (errorType) {
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable VPN if you\'re using one',
          'Try again in a few moments',
        ];
      case 'prompt':
        return [
          'Shorten your prompt (max 2000 characters)',
          'Remove special characters or symbols',
          'Use simpler language',
          'Try a more basic description',
        ];
      case 'server':
        return [
          'Wait 1-2 minutes and try again',
          'The server might be experiencing high load',
          'Try with a shorter duration (5 seconds)',
          'Try with a smaller image',
        ];
      default:
        return [
          'Try with a shorter video duration (5 seconds)',
          'Use a smaller image resolution',
          'Simplify your prompt',
          'Try again in a few moments',
        ];
    }
  };

  const errorType = task.status === 'FAIL' ? getErrorType(task.error) : 'unknown';

  return (
    <div className="w-full p-4 bg-card rounded-xl border border-border space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {task.status === 'PROCESSING' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <h3 className="text-sm font-medium">Generating Video...</h3>
                <p className="text-xs text-muted-foreground">
                  {retryCount > 0 ? (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Auto-retry attempt {retryCount}...
                    </span>
                  ) : (
                    'This usually takes 2-5 minutes'
                  )}
                </p>
              </div>
            </>
          )}
          {task.status === 'SUCCESS' && (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="text-sm font-medium text-green-600 dark:text-green-400">
                  Video Generated Successfully!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ready to view and download
                </p>
              </div>
            </>
          )}
          {task.status === 'FAIL' && (
            <>
              {errorType === 'network' ? (
                <Wifi className="w-5 h-5 text-destructive" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <div>
                <h3 className="text-sm font-medium text-destructive">
                  Generation Failed
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  {getErrorMessage(task.error)}
                </p>
              </div>
            </>
          )}
          {task.status === 'CANCELLED' && (
            <>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Generation Cancelled
                </h3>
                <p className="text-xs text-muted-foreground">
                  The generation was stopped
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {task.status === 'PROCESSING' && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {task.status === 'FAIL' && (
            <Button variant="default" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Try Again
            </Button>
          )}
          {task.status === 'CANCELLED' && (
            <Button variant="default" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Restart
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {task.status === 'PROCESSING' && (
        <div className="space-y-2">
          <Progress value={task.progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{task.progress}% complete</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>~{formatTime(remainingTime)} remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* Help text for errors */}
      {task.status === 'FAIL' && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Troubleshooting tips:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {getTroubleshootingTips(task.error).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
