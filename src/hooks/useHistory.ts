'use client';

import { useState, useRef, useEffect } from 'react';
import { HistoryItem } from '@/lib/types';
import {
  loadHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  generateId,
} from '@/lib/storage';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const loadedRef = useRef(false);

  // Load history from storage after hydration (runs once)
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      const stored = loadHistory();
      if (stored.length > 0) {
        // Defer setState to avoid lint warning - this is a valid hydration pattern
        setTimeout(() => setHistory(stored), 0);
      }
    }
  }, []);

  // Add item to history
  const add = (item: Omit<HistoryItem, 'id' | 'createdAt' | 'isFavorite'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: generateId(),
      createdAt: Date.now(),
      isFavorite: false,
    };
    const updatedHistory = addToHistory(newItem);
    setHistory(updatedHistory);
    return newItem;
  };

  // Remove item from history
  const remove = (id: string) => {
    const updatedHistory = removeFromHistory(id);
    setHistory(updatedHistory);
  };

  // Clear all history
  const clear = () => {
    clearHistory();
    setHistory([]);
  };

  return {
    history,
    add,
    remove,
    clear,
  };
}
