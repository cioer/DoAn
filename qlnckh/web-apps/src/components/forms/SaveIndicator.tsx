import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { AutoSaveState } from '../../hooks/useAutoSave';

export interface SaveIndicatorProps {
  state: AutoSaveState;
  className?: string;
}

/**
 * SaveIndicator Component (Story 2.3)
 *
 * Displays auto-save status with Vietnamese labels:
 * - "Đang lưu..." with spinner when saving
 * - "Đã lưu vào HH:mm:ss" when saved successfully
 * - "Lưu thất bại. Đang thử lại..." when error occurs
 *
 * @example
 * <SaveIndicator state={autoSaveState} />
 */
export function SaveIndicator({ state, className = '' }: SaveIndicatorProps) {
  if (state.status === 'idle') {
    return null;
  }

  const baseClass = 'flex items-center gap-2 text-sm';

  if (state.status === 'saving') {
    return (
      <div className={`${baseClass} text-gray-500 dark:text-gray-400 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Đang lưu...</span>
      </div>
    );
  }

  if (state.status === 'saved' && state.lastSavedAt) {
    const time = new Date(state.lastSavedAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return (
      <div className={`${baseClass} text-success-600 dark:text-success-400 ${className}`}>
        <CheckCircle className="h-4 w-4" />
        <span>Đã lưu vào {time}</span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`${baseClass} text-error-600 dark:text-error-400 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span>Lưu thất bại. Đang thử lại...</span>
      </div>
    );
  }

  return null;
}
