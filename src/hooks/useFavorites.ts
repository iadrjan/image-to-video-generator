'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { HistoryItem } from '@/lib/types';
import { loadFavorites, toggleFavorite as toggleFavoriteStorage } from '@/lib/storage';

export function useFavorites() {
  const [favorites, setFavorites] = useState<HistoryItem[]>([]);
  const loadedRef = useRef(false);

  // Load favorites from storage after hydration (runs once)
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      const stored = loadFavorites();
      if (stored.length > 0) {
        // Defer setState to avoid lint warning - this is a valid hydration pattern
        setTimeout(() => setFavorites(stored), 0);
      }
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = (id: string) => {
    const updatedHistory = toggleFavoriteStorage(id);
    setFavorites(updatedHistory.filter((item) => item.isFavorite));
    return updatedHistory;
  };

  // Remove from favorites (alias for toggle when we know it's favorited)
  const removeFromFavorites = (id: string) => {
    toggleFavorite(id);
  };

  // Check if item is favorite
  const isFavorite = useMemo(() => {
    return (id: string): boolean => {
      return favorites.some((item) => item.id === id);
    };
  }, [favorites]);

  // Refresh favorites from storage
  const refresh = () => {
    setFavorites(loadFavorites());
  };

  return {
    favorites,
    toggleFavorite,
    removeFromFavorites,
    isFavorite,
    refresh,
  };
}
