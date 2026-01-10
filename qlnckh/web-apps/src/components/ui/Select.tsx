import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Select Component Variants
 */
const selectVariants = cva(
  // Base classes
  'w-full px-3 py-2 border rounded-md appearance-none bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-100 disabled:cursor-not-allowed pr-10',
  {
    variants: {
      // Size variants
      selectSize: {
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
 * Select Component
 *
 * Consistent select dropdown with error states and helper text.
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
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);
    const selectState = hasError ? 'error' : state;

    return (
      <div className="w-full relative">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1"
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
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
            {children}
          </select>

          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
