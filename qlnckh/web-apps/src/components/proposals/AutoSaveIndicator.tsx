import { AutoSaveStatus } from '../../hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
}

/**
 * AutoSaveIndicator Component
 *
 * Shows the current auto-save status with appropriate icon and text.
 *
 * - idle: Not shown
 * - saving: "Đang lưu..." (spinning icon)
 * - saved: "Đã lưu ✓" (green checkmark, fades after 3s)
 * - error: "Lỗi lưu" (red, retry button)
 */
export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  const styles = {
    saving: 'text-blue-600 flex items-center gap-2',
    saved: 'text-green-600 flex items-center gap-2',
    error: 'text-red-600 flex items-center gap-2',
  };

  const icons = {
    saving: (
      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
    saved: (
      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  const messages = {
    saving: 'Đang lưu...',
    saved: 'Đã lưu',
    error: 'Lỗi lưu',
  };

  return (
    <div className={`text-sm font-medium ${styles[status]}`}>
      {icons[status]}
      <span>{messages[status]}</span>
    </div>
  );
}
