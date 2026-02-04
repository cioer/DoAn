import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  helperText?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      helperText,
      className = '',
      containerClassName = '',
      id,
      disabled,
      autoComplete,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || props.name || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const hasError = Boolean(error);
    const hasHelper = Boolean(helperText);

    // Determine aria-describedby value
    const ariaDescribedBy = hasError
      ? errorId
      : hasHelper
        ? helperId
        : undefined;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            autoComplete={autoComplete || 'off'}
            aria-invalid={hasError}
            aria-describedby={ariaDescribedBy}
            className={`input ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''
              } ${error ? '!border-error-500 !focus:ring-error-500/20' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {hasError && (
          <p
            id={errorId}
            className="mt-1.5 text-sm ml-1 text-error-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {hasHelper && !hasError && (
          <p
            id={helperId}
            className="mt-1.5 text-sm ml-1 text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
