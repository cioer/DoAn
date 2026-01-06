import { useCallback, useRef, useState, useEffect } from 'react';
import { proposalsApi } from '../lib/api/proposals';

/**
 * Auto-save state types
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveState {
  status: AutoSaveStatus;
  lastSavedAt?: Date;
  error?: Error;
}

/**
 * Options for useAutoSave hook
 */
export interface UseAutoSaveOptions {
  proposalId: string;
  enabled?: boolean; // Only auto-save if true (e.g., proposal is in DRAFT state)
  debounceMs?: number; // Default: 2000ms
  maxRetries?: number; // Default: 3
  onRetryAttempt?: (attempt: number, maxRetries: number) => void;
  onAutoSaveSuccess?: (proposal: any) => void;
  onAutoSaveError?: (error: Error) => void;
}

/**
 * Retry delay configuration for exponential backoff
 */
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

/**
 * useAutoSave Hook (Story 2.3)
 *
 * Provides auto-save functionality for proposal forms with:
 * - Configurable debounce (default 2 seconds)
 * - Queue-based saves (new changes cancel pending saves)
 * - Exponential backoff retry on failure (up to 3 attempts)
 * - Automatic cleanup on unmount
 *
 * @example
 * function ProposalForm({ proposalId }) {
 *   const { state, triggerSave } = useAutoSave({
 *     proposalId,
 *     enabled: proposal?.state === 'DRAFT',
 *   });
 *
 *   const handleFieldChange = (value: any) => {
 *     setFormData(value);
 *     triggerSave(value);
 *   };
 *
 *   return (
 *     <>
 *       <SaveIndicator state={state} />
 *       <form onChange={handleFieldChange}>...</form>
 *     </>
 *   );
 * }
 */
export function useAutoSave({
  proposalId,
  enabled = true,
  debounceMs = 2000,
  maxRetries = 3,
  onRetryAttempt,
  onAutoSaveSuccess,
  onAutoSaveError,
}: UseAutoSaveOptions) {
  const [state, setState] = useState<AutoSaveState>({ status: 'idle' });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingDataRef = useRef<Record<string, unknown>>();
  const retryCountRef = useRef(0);
  const isSavingRef = useRef(false);

  /**
   * Perform the actual save with retry logic
   */
  const performSave = useCallback(
    async (formData: Record<string, unknown>, attempt = 0): Promise<void> => {
      if (!enabled || !proposalId) {
        return;
      }

      isSavingRef.current = true;
      setState({ status: 'saving' });

      try {
        const updatedProposal = await proposalsApi.autoSave(proposalId, {
          formData,
          // Note: optimistic locking (expectedUpdatedAt) is handled by API layer
          // The API client adds the timestamp automatically from cached proposal data
        });

        setState({
          status: 'saved',
          lastSavedAt: new Date(),
        });

        // Reset retry counter on success
        retryCountRef.current = 0;
        pendingDataRef.current = undefined;

        // Call success callback
        onAutoSaveSuccess?.(updatedProposal);

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setState((prev) => (prev.status === 'saved' ? { status: 'idle' } : prev));
        }, 2000);
      } catch (error) {
        const err = error as Error & { response?: { status?: number }; code?: string };

        // Don't retry on conflict errors (optimistic locking failure)
        // Check HTTP 409 status or error code
        const isConflictError =
          err.response?.status === 409 ||
          err.code === 'CONFLICT' ||
          err.message.includes('CONFLICT');

        if (isConflictError) {
          setState({
            status: 'error',
            error: err,
          });
          retryCountRef.current = 0;
          onAutoSaveError?.(err);
          return;
        }

        // Retry logic with exponential backoff
        if (attempt < maxRetries - 1) {
          const nextAttempt = attempt + 1;
          retryCountRef.current = nextAttempt;

          onRetryAttempt?.(nextAttempt, maxRetries);

          // Wait with exponential backoff before retrying
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));

          // Retry
          return performSave(formData, nextAttempt);
        }

        // Max retries reached
        setState({
          status: 'error',
          error: err,
        });
        retryCountRef.current = 0;
        onAutoSaveError?.(err);
      } finally {
        isSavingRef.current = false;
      }
    },
    [proposalId, enabled, maxRetries, onRetryAttempt, onAutoSaveSuccess, onAutoSaveError],
  );

  /**
   * Trigger auto-save with debounce
   * Cancels any pending save and schedules a new one
   */
  const triggerSave = useCallback(
    (formData: Record<string, unknown>) => {
      if (!enabled || !proposalId) {
        return;
      }

      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Store pending data
      pendingDataRef.current = formData;

      // Schedule debounced save
      saveTimeoutRef.current = setTimeout(async () => {
        if (pendingDataRef.current && !isSavingRef.current) {
          await performSave(pendingDataRef.current);
        }
      }, debounceMs);
    },
    [enabled, proposalId, debounceMs, performSave],
  );

  /**
   * Force immediate save (bypasses debounce)
   * Useful for explicit save actions or component unmount
   */
  const forceSave = useCallback(
    async (formData?: Record<string, unknown>) => {
      const dataToSave = formData || pendingDataRef.current;

      if (!dataToSave) {
        return;
      }

      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }

      await performSave(dataToSave);
    },
    [performSave],
  );

  /**
   * Cancel any pending save operation
   */
  const cancelSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    pendingDataRef.current = undefined;
  }, []);

  /**
   * Cleanup on unmount
   * Force save pending data before unmount to preserve user input (AC5)
   */
  useEffect(() => {
    return () => {
      // Force save any pending data before unmount
      // This ensures data is preserved when user closes tab
      void forceSave();
    };
  }, [forceSave]);

  return {
    state,
    triggerSave,
    forceSave,
    cancelSave,
    isSaving: isSavingRef.current,
  };
}
