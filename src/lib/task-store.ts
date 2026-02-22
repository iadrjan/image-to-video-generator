// Global task store that persists across requests
// Using a global variable to ensure the store persists during development

export type TaskStatus = 'PROCESSING' | 'SUCCESS' | 'FAIL' | 'CANCELLED';

export interface TaskData {
  status: TaskStatus;
  progress: number;
  videoUrl?: string;
  error?: string;
  startTime: number;
  imageUrl?: string;
  prompt?: string;
  settings?: {
    duration: number;
    fps: number;
    resolution: string;
    quality: string;
    matchOriginalResolution?: boolean;
    enableQualityMode?: boolean;
  };
}

// Use globalThis to persist the store across hot reloads
const globalForStore = globalThis as unknown as {
  taskStore: Map<string, TaskData> | undefined;
};

// Initialize or get existing store
export const taskStore = globalForStore.taskStore ?? new Map<string, TaskData>();

// In development, assign to global to persist across HMR
if (process.env.NODE_ENV !== 'production') {
  globalForStore.taskStore = taskStore;
}

// Helper functions
export function getTask(taskId: string): TaskData | undefined {
  return taskStore.get(taskId);
}

export function setTask(taskId: string, data: TaskData): void {
  taskStore.set(taskId, data);
}

export function deleteTask(taskId: string): boolean {
  return taskStore.delete(taskId);
}

export function hasTask(taskId: string): boolean {
  return taskStore.has(taskId);
}

export function getAllTasks(): IterableIterator<[string, TaskData]> {
  return taskStore.entries();
}
