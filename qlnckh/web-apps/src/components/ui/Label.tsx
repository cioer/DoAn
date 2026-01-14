import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * Label Component Variants - Modern Soft UI
 */
const labelVariants = cva(
  'block text-sm font-semibold transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'text-gray-700',
        primary: 'text-primary-700',
        secondary: 'text-gray-600',
        muted: 'text-gray-500',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

/**
 * Required Indicator Styles - Modern Soft UI
 */
const requiredIndicator = 'text-error-500 ml-1 font-bold';

/**
 * Label Component Props
 */
export interface LabelProps
  extends HTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  htmlFor?: string;
  required?: boolean;
  requiredPosition?: 'start' | 'end';
  children: ReactNode;
  helperText?: string;
}

/**
 * Label Component - Modern Soft UI
 *
 * Form label with optional required indicator and helper text.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email" required>Email</Label>
 * <Label variant="primary">Username</Label>
 * <Label helperText="We'll never share your email">Email</Label>
 * ```
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({
    variant = 'default',
    size = 'md',
    required = false,
    requiredPosition = 'end',
    className,
    children,
    helperText,
    htmlFor,
    ...props
  },
  ref
) => {
    return (
      <div className="space-y-1">
        <label
          ref={ref}
          htmlFor={htmlFor}
          className={labelVariants({ variant, size, className })}
          {...props}
        >
          {required && requiredPosition === 'start' && (
            <span className={requiredIndicator}>*</span>
          )}
          {children}
          {required && requiredPosition === 'end' && (
            <span className={requiredIndicator}>*</span>
          )}
        </label>
        {helperText && (
          <p className="text-xs text-gray-500 leading-relaxed ml-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Label.displayName = 'Label';

/**
 * Form Field Wrapper Component - Modern Soft UI
 */
export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  htmlFor?: string;
  labelVariant?: VariantProps<typeof labelVariants>['variant'];
  children: ReactNode;
}

/**
 * FormField Component - Modern Soft UI
 *
 * Wraps form controls with label, error, and helper text.
 * Includes error icon and proper spacing.
 *
 * @example
 * ```tsx
 * <FormField label="Email" error="Invalid email" required>
 *   <Input type="email" />
 * </FormField>
 * ```
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({
    label,
    error,
    helperText,
    required,
    htmlFor,
    labelVariant = 'default',
    children,
    className,
    ...props
  },
  ref
) => {
    const fieldId = htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {label && (
          <label
            htmlFor={htmlFor || fieldId}
            className={cn('block text-sm font-semibold text-gray-700 ml-1')}
          >
            {label}
            {required && <span className="text-error-500 ml-1 font-bold">*</span>}
          </label>
        )}

        {children}

        {/* Error message with icon */}
        {error && (
          <p className="mt-2 text-sm text-error-600 ml-1 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-500 ml-1 flex items-start gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{helperText}</span>
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

/**
 * Label Group Component - For radio/checkbox groups
 */
export interface LabelGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * LabelGroup Component - Modern Soft UI
 *
 * Wraps a group of related form controls (radio buttons, checkboxes)
 * with a shared label.
 *
 * @example
 * ```tsx
 * <LabelGroup label="Notification preferences" required>
 *   <Checkbox label="Email notifications" />
 *   <Checkbox label="SMS notifications" />
 * </LabelGroup>
 * ```
 */
export const LabelGroup = forwardRef<HTMLDivElement, LabelGroupProps>(
  ({ label, description, error, required, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {(label || description) && (
          <div className="space-y-1">
            {label && (
              <label className="block text-sm font-semibold text-gray-700">
                {label}
                {required && <span className="text-error-500 ml-1 font-bold">*</span>}
              </label>
            )}
            {description && (
              <p className="text-xs text-gray-500 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}

        {children}

        {error && (
          <p className="text-sm text-error-600 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

LabelGroup.displayName = 'LabelGroup';
