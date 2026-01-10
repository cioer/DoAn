import { useEffect, useRef, useState } from 'react';

/**
 * Auto-save status
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Auto-save hook options
 */
export interface UseAutoSaveOptions<T> {
  /** Data to save */
  data: T;
  /** Original data to compare against */
  originalData: T;
  /** Delay in milliseconds before auto-saving (default: 2000) */
  delay?: number;
  /** Save function that returns a Promise */
  onSave: (data: T) => Promise<void>;
  /** Whether auto-save is enabled */
  enabled?: boolean;
}

/**
 * Auto-save result
 */
export interface AutoSaveResult<T> {
  /** Current save status */
  status: AutoSaveStatus;
  /** Whether data has changed from original */
  hasChanges: boolean;
  /** Manually trigger save */
  saveNow: () => Promise<void>;
  /** Last saved data */
  lastSavedData: T | null;
}

/**
 * Deep equality check for objects
 */
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== 'object') return obj1 === obj2;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * useAutoSave Hook
 *
 * Automatically saves data after a delay when changes are detected.
 */
export function useAutoSave<T extends Record<string, any>>({
  data,
  originalData,
  delay = 2000,
  onSave,
  enabled = true,
}: UseAutoSaveOptions<T>): AutoSaveResult<T> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedData, setLastSavedData] = useState<T | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Check if data has changed
  const hasChanges = !deepEqual(data, originalData);

  // Clear timeout on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !hasChanges) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      setStatus('saving');

      try {
        await onSave(data);

        if (isMountedRef.current) {
          setStatus('saved');
          setLastSavedData(data);

          // Reset to idle after 3 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setStatus('idle');
            }
          }, 3000);
        }
      } catch (error) {
        if (isMountedRef.current) {
          setStatus('error');
          console.error('Auto-save failed:', error);
        }
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, hasChanges, delay, enabled, onSave]);

  // Manual save function
  const saveNow = async () => {
    if (!hasChanges) return;

    setStatus('saving');

    try {
      await onSave(data);
      setStatus('saved');
      setLastSavedData(data);

      setTimeout(() => {
        if (isMountedRef.current) {
          setStatus('idle');
        }
      }, 3000);
    } catch (error) {
      setStatus('error');
      console.error('Manual save failed:', error);
      throw error;
    }
  };

  return {
    status,
    hasChanges,
    saveNow,
    lastSavedData,
  };
}
