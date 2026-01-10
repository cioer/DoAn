import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

/**
 * Textarea Component Variants
 */
const textareaVariants = cva(
  // Base classes
  'w-full px-3 py-2 border rounded-md resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-100 disabled:cursor-not-allowed',
  {
    variants: {
      // Size variants
      textareaSize: {
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
      textareaSize: 'md',
      state: 'default',
    },
  }
);

/**
 * Textarea Component Props
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Size of the textarea */
  size?: VariantProps<typeof textareaVariants>['textareaSize'];
  /** Visual state of the textarea */
  state?: VariantProps<typeof textareaVariants>['state'];
  /** Error message to display */
  error?: string;
  /** Helper text to display below textarea */
  helperText?: string;
  /** Label for the textarea */
  label?: string;
  /** Required field indicator */
  required?: boolean;
}

/**
 * Textarea Component
 *
 * Consistent textarea input with error states and helper text.
 *
 * @example
 * ```tsx
 * <Textarea label="Description" rows={4} />
 * <Textarea label="Notes" error="This field is required" />
 * <Textarea label="Comments" helperText="Max 500 characters" />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);
    const textareaState = hasError ? 'error' : state;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={textareaVariants({ textareaSize: size, state: textareaState, className })}
          aria-invalid={hasError}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />

        {error && (
          <p id={`${textareaId}-error`} className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
