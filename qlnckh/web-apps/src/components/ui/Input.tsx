import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';

/**
 * Input Component Variants
 */
const inputVariants = cva(
  // Base classes
  'w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-100 disabled:cursor-not-allowed',
  {
    variants: {
      // Size variants - renamed to avoid conflict with HTML size attribute
      inputSize: {
        sm: 'px-2.5 py-1.5 text-sm',
        md: 'px-3 py-2 text-base',
        lg: 'px-4 py-3 text-lg',
      },
      // State variants
      state: {
        default: 'border-gray-300 focus:ring-primary-500 focus:border-transparent',
        error: 'border-error-500 focus:ring-error-500 focus:border-transparent',
        success: 'border-success-500 focus:ring-success-500 focus:border-transparent',
      },
    },
    // Default values
    defaultVariants: {
      inputSize: 'md',
      state: 'default',
    },
  }
);

/**
 * Input Component Props
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Size of the input */
  size?: VariantProps<typeof inputVariants>['inputSize'];
  /** Visual state of the input */
  state?: VariantProps<typeof inputVariants>['state'];
  /** Error message to display */
  error?: string;
  /** Helper text to display below input */
  helperText?: string;
  /** Label for the input */
  label?: string;
  /** Required field indicator */
  required?: boolean;
}

/**
 * Input Component
 *
 * Consistent text input with error states and helper text.
 *
 * @example
 * ```tsx
 * <Input label="Email" type="email" placeholder="user@example.com" />
 * <Input label="Password" type="password" error="Password is required" />
 * <Input label="Notes" helperText="Optional field" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      state,
      error,
      helperText,
      label,
      required,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);
    const inputState = hasError ? 'error' : state;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={inputVariants({ inputSize: size, state: inputState, className })}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />

        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
