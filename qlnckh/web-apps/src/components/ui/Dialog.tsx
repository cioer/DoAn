import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from './Button';

/**
 * Dialog Component Variants - Modern Soft UI
 */
const dialogVariants = cva(
  'fixed bg-gray-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-[9999]',
  {
    variants: {
      position: {
        center: 'inset-0 flex items-center justify-center p-4',
        top: 'inset-x-0 top-0 flex items-center justify-center p-4',
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
 * Dialog Content Size Classes - Modern Soft UI
 */
const dialogSizes = {
  sm: 'max-w-sm w-full',
  md: 'max-w-md w-full',
  lg: 'max-w-lg w-full',
  xl: 'max-w-xl w-full',
  full: 'max-w-4xl w-full',
};

/**
 * Dialog Component - Modern Soft UI
 *
 * Modal dialog with glassmorphism backdrop and soft shadows.
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

    const dialogContent = (
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
            'bg-white/95 backdrop-blur-md rounded-2xl shadow-soft-lg w-full relative',
            'animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4',
            dialogSizes[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-100/80">
              <div className="flex-1">
                {title && (
                  <h2
                    id="dialog-title"
                    className="text-lg font-bold text-gray-900"
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
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                    'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                    'transition-all duration-200'
                  )}
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          {children && (
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          )}

          {/* Footer */}
          {footer && (
            <div className="p-6 border-t border-gray-100/80 bg-gray-50/50 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    // Use Portal to render dialog at document.body level
    // This ensures the dialog is outside any parent stacking contexts
    return createPortal(dialogContent, document.body);
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
      <div ref={ref} className={cn('p-6 border-b border-gray-100/80', className)} {...props}>
        {title && (
          <h2 id="dialog-title" className="text-lg font-bold text-gray-900">
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
    return (
      <div
        ref={ref}
        className={cn('p-6 max-h-[70vh] overflow-y-auto custom-scrollbar', className)}
        {...props}
      />
    );
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
        className={cn('p-6 border-t border-gray-100/80 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3', className)}
        {...props}
      />
    );
  }
);

DialogFooter.displayName = 'DialogFooter';
