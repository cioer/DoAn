import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

/**
 * Textarea Component Variants - Modern Soft UI
 */
const textareaVariants = cva(
  // Base classes
  'w-full px-4 py-3 rounded-xl border resize-none transition-all duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-0',
  'disabled:bg-gray-100 disabled:cursor-not-allowed',
  'placeholder:text-gray-400',
  {
    variants: {
      // Size variants
      textareaSize: {
        sm: 'px-3 py-2 text-sm rounded-lg',
        md: 'px-4 py-3 text-base rounded-xl',
        lg: 'px-5 py-4 text-lg rounded-xl',
      },
      // State variants
      state: {
        default: 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20',
        error: 'border-error-300 focus:border-error-500 focus:ring-error-500/20',
        success: 'border-success-300 focus:border-success-500 focus:ring-success-500/20',
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
 * Textarea Component - Modern Soft UI
 *
 * Consistent textarea with soft rounded corners and focus states.
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
            className="block text-sm font-semibold text-gray-700 mb-2 ml-1"
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
          <p id={`${textareaId}-error`} className="mt-2 text-sm text-error-600 ml-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="mt-2 text-sm text-gray-500 ml-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
