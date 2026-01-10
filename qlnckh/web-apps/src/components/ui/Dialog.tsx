import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from './Button';

/**
 * Dialog Component Variants
 */
const dialogVariants = cva(
  'fixed bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  {
    variants: {
      position: {
        center: 'inset-0 flex items-center justify-center',
        top: 'inset-x-0 top-0 flex items-center justify-center',
      },
    },
    defaultVariants: {
      position: 'center',
    },
  }
);

/**
 * Dialog Root Props
 */
export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Dialog Content Size Classes
 */
const dialogSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

/**
 * Dialog Component
 *
 * Modal dialog for focused user interactions.
 *
 * @example
 * ```tsx
 * <Dialog isOpen={show} onClose={() => setShow(false)} title="Title">
 *   <p>Content goes here</p>
 *   <DialogFooter>
 *     <Button variant="secondary">Cancel</Button>
 *     <Button>Confirm</Button>
 *   </DialogFooter>
 * </Dialog>
 * ```
 */
export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  (
    {
      isOpen = false,
      onClose,
      title,
      description,
      showCloseButton = true,
      children,
      footer,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    };

    return (
      <div
        ref={ref}
        className={dialogVariants({ position: 'center', className })}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-description' : undefined}
      >
        <div
          className={cn(
            'bg-white rounded-lg shadow-xl w-full',
            'animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            dialogSizes[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex-1">
                {title && (
                  <h2
                    id="dialog-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="dialog-description" className="text-sm text-gray-600 mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          {children && <div className="p-6">{children}</div>}

          {/* Footer */}
          {footer && (
            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Dialog.displayName = 'Dialog';

/**
 * Dialog Header Component
 */
export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ title, description, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6 border-b', className)} {...props}>
        {title && (
          <h2 id="dialog-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
        )}
        {description && (
          <p id="dialog-description" className="text-sm text-gray-600 mt-1">
            {description}
          </p>
        )}
      </div>
    );
  }
);

DialogHeader.displayName = 'DialogHeader';

/**
 * Dialog Body Component
 */
export const DialogBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6', className)} {...props} />;
  }
);

DialogBody.displayName = 'DialogBody';

/**
 * Dialog Footer Component
 */
export const DialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3', className)}
        {...props}
      />
    );
  }
);

DialogFooter.displayName = 'DialogFooter';
