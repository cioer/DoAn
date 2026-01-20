import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { aiChatApi, AiFillFormRequest } from '../../lib/api/ai-chat';
import { cn } from '../../lib/utils/cn';

interface AiFillButtonProps {
  /** Form type identifier (e.g., 'form_1b') */
  formType: string;
  /** Proposal/research title for context */
  title: string;
  /** Specific field key to fill (optional - if not provided, fills all) */
  fieldKey?: string;
  /** Current form data for context */
  existingData?: Record<string, string>;
  /** Callback when AI generates content */
  onFill: (fields: Record<string, string>) => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Button variant */
  variant?: 'button' | 'icon' | 'text';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * AI Fill Button Component
 *
 * A button that triggers AI to fill form fields based on the proposal title.
 * Can be used to fill all fields or a specific field.
 */
export function AiFillButton({
  formType,
  title,
  fieldKey,
  existingData,
  onFill,
  onError,
  variant = 'button',
  size = 'md',
  className,
  disabled = false,
}: AiFillButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFill = async () => {
    if (!title.trim()) {
      onError?.('Vui lòng nhập tên đề tài trước');
      return;
    }

    setIsLoading(true);

    try {
      const request: AiFillFormRequest = {
        formType,
        title,
        fieldKey,
        existingData,
      };

      const response = await aiChatApi.fillForm(request);
      onFill(response.fields);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI không thể tạo nội dung';
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Render based on variant
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleFill}
        disabled={disabled || isLoading}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          'text-purple-600 hover:bg-purple-50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1',
          className
        )}
        title={fieldKey ? 'AI điền trường này' : 'AI điền tất cả'}
      >
        {isLoading ? (
          <Loader2 className={cn(iconSizeClasses[size], 'animate-spin')} />
        ) : (
          <Sparkles className={iconSizeClasses[size]} />
        )}
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={handleFill}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center gap-1',
          'text-purple-600 hover:text-purple-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:underline',
          sizeClasses[size],
          className
        )}
      >
        {isLoading ? (
          <Loader2 className={cn(iconSizeClasses[size], 'animate-spin')} />
        ) : (
          <Sparkles className={iconSizeClasses[size]} />
        )}
        <span>{fieldKey ? 'AI điền' : 'AI điền tất cả'}</span>
      </button>
    );
  }

  // Default button variant
  return (
    <button
      type="button"
      onClick={handleFill}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center rounded-lg',
        'bg-gradient-to-r from-purple-500 to-indigo-600',
        'hover:from-purple-600 hover:to-indigo-700',
        'text-white font-medium',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
        'transition-all duration-200',
        sizeClasses[size],
        className
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(iconSizeClasses[size], 'animate-spin')} />
      ) : (
        <Sparkles className={iconSizeClasses[size]} />
      )}
      <span>{fieldKey ? 'AI điền' : 'AI điền tất cả'}</span>
    </button>
  );
}

/**
 * AI Fill All Button - Convenience wrapper for filling all fields
 */
export function AiFillAllButton(props: Omit<AiFillButtonProps, 'fieldKey'>) {
  return <AiFillButton {...props} />;
}

/**
 * AI Fill Field Button - Convenience wrapper for filling a specific field
 */
export function AiFillFieldButton(props: AiFillButtonProps & { fieldKey: string }) {
  return <AiFillButton {...props} variant="icon" size="sm" />;
}
