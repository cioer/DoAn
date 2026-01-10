import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

/**
 * Checkbox Container Variants
 */
const checkboxContainerVariants = cva(
  'flex items-center gap-2 cursor-pointer',
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
 * Checkbox Input Variants
 */
const checkboxVariants = cva(
  'w-4 h-4 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0',
  {
    variants: {
      color: {
        default: 'text-gray-600 border-gray-300 focus:ring-gray-500 checked:bg-gray-600 checked:border-gray-600',
        primary: 'text-primary-600 border-gray-300 focus:ring-primary-500 checked:bg-primary-600 checked:border-primary-600',
        success: 'text-success-600 border-gray-300 focus:ring-success-500 checked:bg-success-600 checked:border-success-600',
        warning: 'text-warning-600 border-gray-300 focus:ring-warning-500 checked:bg-warning-600 checked:border-warning-600',
        error: 'text-error-600 border-gray-300 focus:ring-error-500 checked:bg-error-600 checked:border-error-600',
      },
    },
    defaultVariants: {
      color: 'default',
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
 * Checkbox Component
 *
 * Form checkbox with label and helper text.
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms" />
 * <Checkbox label="Subscribe" helperText="Get email updates" />
 * <Checkbox label="I agree" color="primary" />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText,
      color = 'default',
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
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={checkboxVariants({ color })}
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
          <div className="flex-1 min-w-0">
            {label && (
              <span className="text-sm font-medium text-gray-700">
                {label}
              </span>
            )}
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </label>

        {error && (
          <p id={`${checkboxId}-error`} className="mt-1 text-sm text-error-600">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${checkboxId}-helper`} className="mt-1 text-sm text-gray-500">
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
      className="w-3 h-3"
      {...props}
    >
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
});

IndeterminateIcon.displayName = 'IndeterminateIcon';
