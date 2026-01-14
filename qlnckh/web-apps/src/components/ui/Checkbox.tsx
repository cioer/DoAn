import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

/**
 * Checkbox Container Variants - Modern Soft UI
 */
const checkboxContainerVariants = cva(
  'flex items-center gap-3 cursor-pointer transition-all duration-200',
  {
    variants: {
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      disabled: false,
    },
  }
);

/**
 * Checkbox Input Variants - Modern Soft UI
 */
const checkboxVariants = cva(
  'w-5 h-5 rounded-lg border transition-all duration-200 flex items-center justify-center',
  'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-white',
  {
    variants: {
      color: {
        default: 'border-gray-300 focus:ring-gray-500 checked:bg-gray-600 checked:border-gray-600',
        primary: 'border-gray-300 focus:ring-primary-500 checked:bg-gradient-to-br checked:from-primary-500 checked:to-primary-600 checked:border-primary-600',
        success: 'border-gray-300 focus:ring-success-500 checked:bg-gradient-to-br checked:from-success-500 checked:to-success-600 checked:border-success-600',
        warning: 'border-gray-300 focus:ring-warning-500 checked:bg-gradient-to-br checked:from-warning-500 checked:to-warning-600 checked:border-warning-600',
        error: 'border-gray-300 focus:ring-error-500 checked:bg-gradient-to-br checked:from-error-500 checked:to-error-600 checked:border-error-600',
      },
    },
    defaultVariants: {
      color: 'primary',
    },
  }
);

/**
 * Checkbox Component Props
 */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  color?: VariantProps<typeof checkboxVariants>['color'];
  error?: string;
  description?: string;
}

/**
 * Checkbox Component - Modern Soft UI
 *
 * Form checkbox with soft rounded corners and gradient checked state.
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms" />
 * <Checkbox label="Subscribe" helperText="Get email updates" />
 * <Checkbox label="I agree" color="success" />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText,
      color = 'primary',
      error,
      description,
      className,
      id,
      disabled,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        <label
          htmlFor={checkboxId}
          className={checkboxContainerVariants({ disabled })}
        >
          <div className="relative">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              className={cn(
                'peer appearance-none',
                checkboxVariants({ color })
              )}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? `${checkboxId}-error`
                  : helperText
                    ? `${checkboxId}-helper`
                    : description
                      ? `${checkboxId}-description`
                      : undefined
              }
              {...props}
            />
            {/* Custom check icon - only shows when checked */}
            <Check className={cn(
              'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none',
              'opacity-0 peer-checked:opacity-100 transition-opacity duration-200'
            )} />
          </div>

          <div className="flex-1 min-w-0">
            {label && (
              <span className="text-sm font-semibold text-gray-700">
                {label}
              </span>
            )}
            {description && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        </label>

        {error && (
          <p id={`${checkboxId}-error`} className="mt-2 text-sm text-error-600 ml-8 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${checkboxId}-helper`} className="mt-2 text-sm text-gray-500 ml-8">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/**
 * Indeterminate Checkbox Icon Component
 */
export const IndeterminateIcon = forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
      {...props}
    >
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
});

IndeterminateIcon.displayName = 'IndeterminateIcon';
