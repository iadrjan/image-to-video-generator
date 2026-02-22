'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GenerationTask, VideoSettings } from '@/lib/types';
import { startGeneration, checkStatus, cancelGeneration } from '@/lib/video-api';

interface UseGenerationOptions {
  onSuccess?: (task: GenerationTask) => void;
  onError?: (error: Error) => void;
  autoRetry?: boolean; // Auto-retry on network errors
  maxAutoRetries?: number;
}

export function useGeneration(options: UseGenerationOptions = {}) {
  const { autoRetry = true, maxAutoRetries = 2 } = options;
  
  const [task, setTask] = useState<GenerationTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentTaskRef = useRef<GenerationTask | null>(null);
  const retryCountRef = useRef(0);

  // Keep currentTaskRef in sync
  useEffect(() => {
    currentTaskRef.current = task;
  }, [task]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Start polling for status updates
  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 20;

    pollingRef.current = setInterval(async () => {
      try {
        const status = await checkStatus(taskId);
        consecutiveErrors = 0;
        
        setTask((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: status.status,
            progress: status.progress,
            videoUrl: status.videoUrl,
            error: status.error,
          };
        });

        if (status.status === 'SUCCESS' || status.status === 'FAIL' || status.status === 'CANCELLED') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setIsLoading(false);
          setRetryCount(0);
          retryCountRef.current = 0;

          if (status.status === 'SUCCESS' && options.onSuccess) {
            const currentTask = currentTaskRef.current;
            if (currentTask) {
              options.onSuccess({
                ...currentTask,
                status: 'SUCCESS',
                videoUrl: status.videoUrl,
              });
            }
          }

          if (status.status === 'FAIL' && options.onError) {
            options.onError(new Error(status.error || 'Generation failed'));
          }
        }
      } catch (err) {
        consecutiveErrors++;
        console.error(`[useGeneration] Polling error (${consecutiveErrors}/${maxConsecutiveErrors}):`, err);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error('[useGeneration] Too many polling errors, stopping');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setIsLoading(false);
          setError('Lost connection to server. Please check your connection and click Retry.');
          if (options.onError) {
            options.onError(new Error('Lost connection to server'));
          }
        }
      }
    }, 5000);
  }, [options]);

  // Start generation with auto-retry support
  const generate = useCallback(
    async (
      imageBase64: string,
      prompt: string,
      settings: VideoSettings,
      userPrompt?: string,
      sessionId?: string,
      userId?: string,
      isRetry: boolean = false
    ) => {
      if (!imageBase64) {
        const errorMsg = 'Please upload an image first';
        setError(errorMsg);
        if (options.onError) {
          options.onError(new Error(errorMsg));
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      
      if (!isRetry) {
        setRetryCount(0);
        retryCountRef.current = 0;
      }

      try {
        console.log('[useGeneration] Starting generation...', isRetry ? '(retry)' : '');

        const response = await startGeneration({
          imageBase64,
          prompt,
          userPrompt,
          settings,
          sessionId,
          userId,
        });

        console.log('[useGeneration] Generation started, taskId:', response.taskId);

        const newTask: GenerationTask = {
          id: response.taskId,
          status: 'PROCESSING',
          progress: 0,
          imageUrl: imageBase64,
          prompt,
          settings,
          createdAt: Date.now(),
        };

        setTask(newTask);
        currentTaskRef.current = newTask;
        startPolling(response.taskId);
      } catch (err: any) {
        console.error('[useGeneration] Failed to start generation:', err);
        
        let errorMessage = 'Failed to start generation';
        
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        // User-friendly error messages
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connect')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'Request timed out. The server might be busy, please try again.';
        } else if (errorMessage.includes('too long') || errorMessage.includes('4000') || errorMessage.includes('PROMPT_TOO_LONG')) {
          errorMessage = 'Your prompt is too long. Please shorten it and try again.\n\nMaximum: 4,000 characters total.';
        } else if (err?.type === 'USAGE_LIMIT' || errorMessage.includes('Daily limit')) {
          errorMessage = 'Daily video limit reached. Upgrade to Pro for unlimited videos!';
          // Don't retry on usage limit
          setIsLoading(false);
          setError(errorMessage);
          if (options.onError) {
            const error = new Error(errorMessage);
            (error as any).type = 'USAGE_LIMIT';
            options.onError(error);
          }
          return;
        }
        
        // Auto-retry on network errors (but NOT on prompt too long or usage limit)
        if (autoRetry && retryCountRef.current < maxAutoRetries && 
            !errorMessage.includes('too long') && 
            !errorMessage.includes('limit')) {
          const currentRetry = retryCountRef.current + 1;
          console.log(`[useGeneration] Auto-retrying (${currentRetry}/${maxAutoRetries})...`);
          
          retryCountRef.current = currentRetry;
          setRetryCount(currentRetry);
          
          const backoffMs = Math.min(1000 * Math.pow(2, currentRetry - 1), 5000);
          await new Promise(r => setTimeout(r, backoffMs));
          
          return generate(imageBase64, prompt, settings, userPrompt, true);
        }
        
        setIsLoading(false);
        setError(errorMessage);
        if (options.onError) {
          options.onError(new Error(errorMessage));
        }
      }
    },
    [startPolling, options, autoRetry, maxAutoRetries]
  );

  // Cancel generation
  const cancel = useCallback(async () => {
    const taskId = currentTaskRef.current?.id;
    if (!taskId) return;

    try {
      await cancelGeneration(taskId);
      setTask((prev) => {
        if (!prev) return null;
        return { ...prev, status: 'CANCELLED' };
      });
      setIsLoading(false);
      setRetryCount(0);
      retryCountRef.current = 0;

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setTask(null);
    currentTaskRef.current = null;
    setIsLoading(false);
    setError(null);
    setRetryCount(0);
    retryCountRef.current = 0;
  }, []);

  // Retry - manual retry that uses stored parameters
  const retry = useCallback(() => {
    const currentTask = currentTaskRef.current;
    if (currentTask?.imageUrl && currentTask?.prompt !== undefined && currentTask?.settings) {
      setRetryCount(0);
      retryCountRef.current = 0;
      generate(currentTask.imageUrl, currentTask.prompt, currentTask.settings);
    }
  }, [generate]);

  return {
    task,
    isLoading,
    error,
    retryCount,
    generate,
    cancel,
    reset,
    retry,
  };
}
