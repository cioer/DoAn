/**
 * ProgressBar Component (Story 2.4)
 *
 * Displays upload progress from 0% to 100%
 * - Uses design tokens for colors
 *
 * @param progress - Progress percentage (0-100)
 */
interface ProgressBarProps {
  progress: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

const colorClasses = {
  primary: 'bg-primary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  error: 'bg-error-600',
};

export function ProgressBar({ progress, color = 'primary' }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-300 ease-out ${colorClasses[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
