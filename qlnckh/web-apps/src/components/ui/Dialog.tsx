import { cva } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { useZIndex, Z_INDEX_BASE } from '../../lib/contexts/ZIndexContext';

/**
 * Dialog Component Variants - Modern Soft UI
 * Note: z-index is applied dynamically via inline style
 */
const dialogVariants = cva(
  'fixed inset-0 bg-gray-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  {
    variants: {
      position: {
        center: 'flex items-center justify-center p-4',
        top: 'flex items-center justify-center p-4',
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
 * Dialog Content Size Classes - Mobile-first responsive sizes
 */
const dialogSizes = {
  sm: 'w-full max-w-[calc(100vw-1.5rem)] sm:max-w-sm',
  md: 'w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md',
  lg: 'w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md md:max-w-lg',
  xl: 'w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg md:max-w-xl',
  full: 'w-full max-w-[calc(100vw-1.5rem)] sm:max-w-xl md:max-w-2xl lg:max-w-4xl',
};

/**
 * Dialog Component - Modern Soft UI with Dynamic Z-Index
 *
 * Modal dialog with glassmorphism backdrop and soft shadows.
 * Z-index is managed dynamically - dialogs opened later appear on top.
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
    const { getNextZIndex, releaseZIndex } = useZIndex();
    const zIndexRef = useRef<number | null>(null);

    // Manage z-index lifecycle
    useEffect(() => {
      if (isOpen && zIndexRef.current === null) {
        zIndexRef.current = getNextZIndex();
      }

      return () => {
        if (zIndexRef.current !== null) {
          releaseZIndex(zIndexRef.current);
          zIndexRef.current = null;
        }
      };
    }, [isOpen, getNextZIndex, releaseZIndex]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    };

    // Use current z-index or fallback to base
    const currentZIndex = zIndexRef.current ?? Z_INDEX_BASE.modal;

    const dialogContent = (
      <div
        ref={ref}
        className={dialogVariants({ position: 'center' })}
        style={{ zIndex: currentZIndex }}
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
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100/80">
              <div className="flex-1 pr-2">
                {title && (
                  <h2
                    id="dialog-title"
                    className="text-base sm:text-lg font-bold text-gray-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="dialog-description" className="text-xs sm:text-sm text-gray-600 mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className={cn(
                    'flex-shrink-0 min-w-[44px] min-h-[44px] w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center',
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
            <div className="p-4 sm:p-6 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          )}

          {/* Footer */}
          {footer && (
            <div className="p-4 sm:p-6 border-t border-gray-100/80 bg-gray-50/50 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    // Use Portal to render dialog at document.body level
    // This ensures the dialog is outside any parent stacking contexts
    if (typeof window === 'undefined') return null;
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
        className={cn('p-4 sm:p-6 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar', className)}
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
        className={cn('p-4 sm:p-6 border-t border-gray-100/80 bg-gray-50/50 rounded-b-2xl flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3', className)}
        {...props}
      />
    );
  }
);

DialogFooter.displayName = 'DialogFooter';
