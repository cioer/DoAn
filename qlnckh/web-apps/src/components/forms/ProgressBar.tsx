/**
 * ProgressBar Component - Modern Soft UI
 *
 * Displays upload progress from 0% to 100% with gradient effects.
 * - Uses design tokens for colors
 * - Gradient fill for modern look
 * - Soft shadow for depth
 *
 * @param progress - Progress percentage (0-100)
 * @param color - Color variant for the progress bar
 * @param size - Height variant for the progress bar
 */
interface ProgressBarProps {
  progress: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

const colorClasses = {
  primary: 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-soft',
  success: 'bg-gradient-to-r from-success-500 to-success-600 shadow-soft',
  warning: 'bg-gradient-to-r from-warning-500 to-warning-600 shadow-soft',
  error: 'bg-gradient-to-r from-error-500 to-error-600 shadow-soft',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

const trackSizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  progress,
  color = 'primary',
  size = 'md',
  showPercentage = false
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <div
          className={cn(
            'rounded-full transition-all duration-300 ease-out',
            colorClasses[color],
            sizeClasses[size]
          )}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <span className="text-xs font-semibold text-gray-600 min-w-[3rem] text-right">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}

// Helper for className merging (inline to avoid dependency)
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
