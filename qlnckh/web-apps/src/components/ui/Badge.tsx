import { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<Required<BadgeProps>['variant'], string> = {
  primary: 'bg-primary-50 text-primary-700 border border-primary-100',
  secondary: 'bg-purple-50 text-purple-700 border border-purple-100',
  success: 'bg-success-50 text-success-700 border border-success-100',
  warning: 'bg-warning-50 text-warning-700 border border-warning-100',
  danger: 'bg-error-50 text-error-700 border border-error-100',
  info: 'bg-info-50 text-info-700 border border-info-100',
  gray: 'bg-gray-100 text-gray-700 border border-gray-200',
};

const sizeStyles: Record<Required<BadgeProps>['size'], string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'gray', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center justify-center font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
