import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Label Component Variants
 */
const labelVariants = cva(
  'block text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'text-gray-700',
        primary: 'text-primary-700',
        secondary: 'text-gray-600',
      },
      required: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      required: false,
    },
  }
);

/**
 * Label Component Props
 */
export interface LabelProps
  extends HTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Label Component
 *
 * Form label with optional required indicator.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email" required>Email</Label>
 * <Label variant="primary">Username</Label>
 * ```
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ variant = 'default', required = false, className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={labelVariants({ variant, required, className })}
        {...props}
      >
        {children}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';

/**
 * Form Field Wrapper Component
 */
export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

/**
 * FormField Component
 *
 * Wraps form controls with label, error, and helper text.
 *
 * @example
 * ```tsx
 * <FormField label="Email" error="Invalid email" required>
 *   <Input type="email" />
 * </FormField>
 * ```
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, helperText, required, htmlFor, children, className, ...props }, ref) => {
    const fieldId = htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div ref={ref} className={className} {...props}>
        {label && (
          <Label htmlFor={htmlFor || fieldId} required={required}>
            {label}
          </Label>
        )}

        {children}

        {error && (
          <p className="mt-1 text-sm text-error-600">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
