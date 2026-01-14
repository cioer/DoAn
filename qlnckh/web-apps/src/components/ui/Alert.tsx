import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from './Button';

/**
 * Alert Component Variants - Modern Soft UI
 */
const alertVariants = cva(
  'flex items-start gap-3 p-4 rounded-xl border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-gray-50/80 border-gray-200/80 text-gray-800 shadow-soft',
        info: 'bg-info-50/80 border-info-200/80 text-info-800 shadow-soft',
        success: 'bg-success-50/80 border-success-200/80 text-success-800 shadow-soft',
        warning: 'bg-warning-50/80 border-warning-200/80 text-warning-800 shadow-soft',
        error: 'bg-error-50/80 border-error-200/80 text-error-800 shadow-soft',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Alert Icon Map with gradient fills for Modern Soft UI
 */
const alertIcons = {
  default: Info,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

/**
 * Alert Icon Gradient Classes
 */
const iconGradients = {
  default: 'text-gray-600',
  info: 'text-info-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  error: 'text-error-600',
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
 * Alert Component - Modern Soft UI
 *
 * Display important messages to users with soft shadows and rounded corners.
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
    const iconGradientClass = iconGradients[variant as keyof typeof iconGradients] || iconGradients.default;

    return (
      <div ref={ref} className={alertVariants({ variant, className })} {...props}>
        {/* Icon with soft gradient background */}
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          'bg-white/50 backdrop-blur-sm'
        )}>
          {customIcon || <IconComponent className={cn('w-5 h-5', iconGradientClass)} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold text-sm">
              {title}
            </p>
          )}
          {typeof children === 'string' ? (
            <p className={cn(
              'text-sm mt-0.5 leading-relaxed',
              title ? 'text-opacity-80' : ''
            )}>
              {children}
            </p>
          ) : (
            children
          )}
        </div>

        {/* Close Button */}
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
              'text-current opacity-60 hover:opacity-100 hover:bg-white/50',
              'transition-all duration-200'
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
      <div ref={ref} className={cn('flex gap-2 mt-3 ml-11', className)} {...props} />
    );
  }
);

AlertActions.displayName = 'AlertActions';
