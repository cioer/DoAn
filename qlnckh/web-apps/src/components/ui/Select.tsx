import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

/**
 * Select Component Variants - Modern Soft UI
 */
const selectVariants = cva(
  // Base classes - explicit background-color for dark mode compatibility
  'w-full px-4 py-3 rounded-xl border appearance-none bg-white text-gray-900 transition-[border-color,box-shadow] duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-0 pr-10',
  'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500',
  {
    variants: {
      // Size variants
      selectSize: {
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
      selectSize: 'md',
      state: 'default',
    },
  }
);

/**
 * Select Option Type
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Select Component Props
 */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Size of the select */
  size?: VariantProps<typeof selectVariants>['selectSize'];
  /** Visual state of the select */
  state?: VariantProps<typeof selectVariants>['state'];
  /** Error message to display */
  error?: string;
  /** Helper text to display below select */
  helperText?: string;
  /** Label for the select */
  label?: string;
  /** Required field indicator */
  required?: boolean;
  /** Options for the select */
  options?: SelectOption[];
  /** Placeholder option */
  placeholder?: string;
}

/**
 * Select Component - Modern Soft UI
 *
 * Consistent select dropdown with soft rounded corners and custom icon.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Status"
 *   options={[
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' }
 *   ]}
 * />
 * <Select label="Role" error="Role is required" />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = 'md',
      state,
      error,
      helperText,
      label,
      required,
      options = [],
      placeholder,
      className,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const hasError = Boolean(error);
    const selectState = hasError ? 'error' : state;

    return (
      <div className="w-full relative">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-gray-700 mb-2 ml-1"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectVariants({ selectSize: size, state: selectState, className })}
            aria-invalid={hasError}
            aria-describedby={
              error
                ? `${selectId}-error`
                : helperText
                  ? `${selectId}-helper`
                  : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-gray-400">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={option.disabled ? 'text-gray-400' : ''}
              >
                {option.label}
              </option>
            ))}
            {children}
          </select>

          {/* Custom dropdown icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {error && (
          <p id={`${selectId}-error`} className="mt-2 text-sm text-error-600 ml-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-2 text-sm text-gray-500 ml-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
