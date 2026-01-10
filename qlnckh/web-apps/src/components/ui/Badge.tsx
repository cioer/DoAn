import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

/**
 * Badge Component Variants
 */
const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-primary-100 text-primary-800',
        secondary: 'bg-secondary-100 text-secondary-800',
        success: 'bg-success-100 text-success-800',
        warning: 'bg-warning-100 text-warning-800',
        error: 'bg-error-100 text-error-800',
        info: 'bg-info-100 text-info-800',
        outline: 'border border-gray-300 text-gray-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

/**
 * Badge Component Props
 */
export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional icon to display before text */
  icon?: React.ReactNode;
}

/**
 * Badge Component
 *
 * Small status indicator for labels, counts, and states.
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error">3 errors</Badge>
 * <Badge variant="warning" icon={<AlertTriangle />}>Pending</Badge>
 * ```
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, size, icon, children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={badgeVariants({ variant, size, className })}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * Status Badge Props - for common workflow states
 */
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled' | 'paused' | 'changes_requested';
}

const statusVariantMap: Record<StatusBadgeProps['status'], BadgeProps['variant']> = {
  draft: 'default',
  pending: 'info',
  in_review: 'primary',
  approved: 'success',
  rejected: 'error',
  cancelled: 'secondary',
  paused: 'warning',
  changes_requested: 'warning',
};

/**
 * Status Badge Component
 *
 * Pre-configured badge for common workflow states.
 *
 * @example
 * ```tsx
 * <StatusBadge status="approved" />
 * <StatusBadge status="pending">Đang chờ</StatusBadge>
 * ```
 */
export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const variant = statusVariantMap[status];

    // Default labels for Vietnamese
    const defaultLabels: Record<StatusBadgeProps['status'], string> = {
      draft: 'Bản nháp',
      pending: 'Đang chờ',
      in_review: 'Đang xem xét',
      approved: 'Đã duyệt',
      rejected: 'Đã từ chối',
      cancelled: 'Đã hủy',
      paused: 'Tạm dừng',
      changes_requested: 'Yêu cầu sửa',
    };

    return (
      <Badge ref={ref} variant={variant} {...props}>
        {children || defaultLabels[status]}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
