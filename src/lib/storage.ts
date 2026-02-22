// localStorage utilities for video generation app

import {
  VideoSettings,
  HistoryItem,
  DEFAULT_SETTINGS,
  MAX_HISTORY_ITEMS,
} from './types';

const STORAGE_KEYS = {
  PROMPT: 'video-gen-prompt',
  SETTINGS: 'video-gen-settings',
  HISTORY: 'video-gen-history',
  FAVORITES: 'video-gen-favorites',
} as const;

// Debounce utility
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Get item from localStorage with JSON parsing
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !isLocalStorageAvailable()) {
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Set item in localStorage with JSON stringification
function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || !isLocalStorageAvailable()) {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Prompt storage
export function savePrompt(prompt: string): void {
  setItem(STORAGE_KEYS.PROMPT, prompt);
}

export function loadPrompt(): string {
  return getItem<string>(STORAGE_KEYS.PROMPT, '');
}

// Settings storage
export function saveSettings(settings: VideoSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

export function loadSettings(): VideoSettings {
  return getItem<VideoSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

// History storage
export function saveHistory(history: HistoryItem[]): void {
  // Limit to MAX_HISTORY_ITEMS
  const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);
  setItem(STORAGE_KEYS.HISTORY, limitedHistory);
}

export function loadHistory(): HistoryItem[] {
  return getItem<HistoryItem[]>(STORAGE_KEYS.HISTORY, []);
}

export function addToHistory(item: HistoryItem): HistoryItem[] {
  const history = loadHistory();
  const newHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
  saveHistory(newHistory);
  return newHistory;
}

export function removeFromHistory(id: string): HistoryItem[] {
  const history = loadHistory();
  const newHistory = history.filter((item) => item.id !== id);
  saveHistory(newHistory);
  return newHistory;
}

export function clearHistory(): void {
  saveHistory([]);
}

// Favorites storage
export function toggleFavorite(id: string): HistoryItem[] {
  const history = loadHistory();
  const newHistory = history.map((item) =>
    item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
  );
  saveHistory(newHistory);
  return newHistory;
}

export function loadFavorites(): HistoryItem[] {
  return loadHistory().filter((item) => item.isFavorite);
}

// Export/Import settings
export function exportSettings(): string {
  const prompt = loadPrompt();
  const settings = loadSettings();
  
  return JSON.stringify(
    {
      prompt,
      settings,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importSettings(jsonString: string): {
  prompt: string;
  settings: VideoSettings;
} | null {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.prompt) savePrompt(data.prompt);
    if (data.settings) saveSettings(data.settings);
    
    return {
      prompt: data.prompt || '',
      settings: data.settings || DEFAULT_SETTINGS,
    };
  } catch (error) {
    console.error('Error importing settings:', error);
    return null;
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
