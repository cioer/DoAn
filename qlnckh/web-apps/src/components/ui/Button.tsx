import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'success' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<ButtonProps['variant'], string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 focus:ring-offset-2',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-200 focus:ring-offset-2',
  danger:
    'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 focus:ring-offset-2',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-200 focus:ring-offset-0',
  // Story 9.3: Pause button (warning variant)
  warning:
    'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 focus:ring-offset-2',
  // Story 9.3: Resume button (success variant)
  success:
    'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 focus:ring-offset-2',
  // Alias for danger (used by SchoolSelectionActions)
  destructive:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 focus:ring-offset-2',
};

const sizeStyles: Record<ButtonProps['size'], string> = {
  xs: 'px-2 py-1 text-xs rounded-sm',
  sm: 'px-3 py-1.5 text-sm rounded-sm',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled,
      className = '',
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const classes = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Extract leftIcon and rightIcon from props so they don't get passed to DOM element
    const { leftIcon: _, rightIcon: __, ...domProps } = props as any;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={classes}
        {...domProps}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
