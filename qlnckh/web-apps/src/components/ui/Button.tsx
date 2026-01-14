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
    'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 border-transparent',
  secondary:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:-translate-y-0.5',
  danger:
    'bg-error-500 text-white shadow-soft hover:shadow-soft-lg hover:bg-error-600 hover:-translate-y-0.5 border-transparent',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-primary-600 border-transparent',
  warning:
    'bg-warning-500 text-white shadow-soft hover:shadow-soft-lg hover:bg-warning-600 hover:-translate-y-0.5 border-transparent',
  success:
    'bg-success-500 text-white shadow-soft hover:shadow-soft-lg hover:bg-success-600 hover:-translate-y-0.5 border-transparent',
  destructive:
    'bg-error-600 text-white shadow-soft hover:shadow-soft-lg hover:bg-error-700 hover:-translate-y-0.5 border-transparent',
};

const sizeStyles: Record<ButtonProps['size'], string> = {
  xs: 'px-3 py-1.5 text-xs rounded-lg',
  sm: 'px-3.5 py-2 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
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
      'inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none active:scale-95';

    const classes = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className,
    ]
      .filter(Boolean)
      .join(' ');

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
            {leftIcon && <span className="mr-2 -ml-1">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2 -mr-1">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
