import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from './Button';

/**
 * Alert Component Variants
 */
const alertVariants = cva(
  'flex items-start gap-3 p-3 rounded-md border',
  {
    variants: {
      variant: {
        default: 'bg-gray-50 border-gray-200 text-gray-800',
        info: 'bg-info-50 border-info-200 text-info-800',
        success: 'bg-success-50 border-success-200 text-success-800',
        warning: 'bg-warning-50 border-warning-200 text-warning-800',
        error: 'bg-error-50 border-error-200 text-error-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Alert Icon Map
 */
const alertIcons = {
  default: Info,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

/**
 * Alert Component Props
 */
export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: ReactNode;
  showCloseButton?: boolean;
  onClose?: () => void;
}

/**
 * Alert Component
 *
 * Display important messages to users.
 *
 * @example
 * ```tsx
 * <Alert variant="error">Something went wrong</Alert>
 * <Alert variant="success" title="Success!">Your changes have been saved</Alert>
 * <Alert variant="warning" showCloseButton>Warning message</Alert>
 * ```
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({
    variant = 'default',
    title,
    icon: customIcon,
    showCloseButton = false,
    onClose,
    children,
    className,
    ...props
  },
  ref
) => {
    const IconComponent = alertIcons[variant as keyof typeof alertIcons] || Info;

    return (
      <div ref={ref} className={alertVariants({ variant, className })} {...props}>
        {customIcon || <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />}

        <div className="flex-1 min-w-0">
          {title && <p className="font-medium">{title}</p>}
          {typeof children === 'string' ? (
            <p className={title ? 'text-sm mt-1' : 'text-sm'}>{children}</p>
          ) : (
            children
          )}
        </div>

        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className={cn(
              'text-current opacity-70 hover:opacity-100',
              'transition-opacity'
            )}
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

/**
 * Alert Actions Component
 */
export const AlertActions = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex gap-2 mt-3', className)} {...props} />
    );
  }
);

AlertActions.displayName = 'AlertActions';
