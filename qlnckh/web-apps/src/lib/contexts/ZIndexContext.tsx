'use client';

import { createContext, useContext, useCallback, useRef, useMemo, useEffect } from 'react';

/**
 * Z-Index Layer System
 *
 * Base z-index values for different UI layers:
 * - dropdown: 100
 * - sticky: 200
 * - fixed (sidebar, header): 300
 * - modal/dialog: 1000+ (dynamic, increments by 10 for each new modal)
 * - popover: 2000
 * - tooltip: 3000
 * - notification/toast: 4000
 */
export const Z_INDEX_BASE = {
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  sidebar: 300,
  header: 300,
  modal: 1000,
  popover: 2000,
  tooltip: 3000,
  notification: 4000,
} as const;

interface ZIndexContextType {
  /** Get the next available z-index for a modal/dialog */
  getNextZIndex: () => number;
  /** Release a z-index when modal closes */
  releaseZIndex: (zIndex: number) => void;
  /** Current highest z-index in use */
  currentMaxZIndex: number;
}

const ZIndexContext = createContext<ZIndexContextType | null>(null);

/**
 * ZIndexProvider - Manages dynamic z-index for modals/dialogs
 *
 * Ensures that modals opened later always appear on top of earlier ones.
 * Each new modal gets z-index = base + (count * 10)
 */
export function ZIndexProvider({ children }: { children: React.ReactNode }) {
  const counterRef = useRef(0);
  const activeZIndicesRef = useRef<Set<number>>(new Set());

  const getNextZIndex = useCallback(() => {
    counterRef.current += 1;
    const zIndex = Z_INDEX_BASE.modal + (counterRef.current * 10);
    activeZIndicesRef.current.add(zIndex);
    return zIndex;
  }, []);

  const releaseZIndex = useCallback((zIndex: number) => {
    activeZIndicesRef.current.delete(zIndex);
    // Reset counter if no modals are open
    if (activeZIndicesRef.current.size === 0) {
      counterRef.current = 0;
    }
  }, []);

  const value = useMemo(() => ({
    getNextZIndex,
    releaseZIndex,
    get currentMaxZIndex() {
      return Z_INDEX_BASE.modal + (counterRef.current * 10);
    },
  }), [getNextZIndex, releaseZIndex]);

  return (
    <ZIndexContext.Provider value={value}>
      {children}
    </ZIndexContext.Provider>
  );
}

/**
 * Hook to get dynamic z-index for a modal/dialog
 *
 * @example
 * ```tsx
 * function MyDialog({ isOpen }) {
 *   const zIndex = useModalZIndex(isOpen);
 *   return isOpen ? <div style={{ zIndex }}>...</div> : null;
 * }
 * ```
 */
export function useModalZIndex(isOpen: boolean): number {
  const context = useContext(ZIndexContext);
  const zIndexRef = useRef<number | null>(null);

  // If no provider, use fallback z-index
  const hasContext = context !== null;
  const getNextZIndex = context?.getNextZIndex;
  const releaseZIndex = context?.releaseZIndex;

  useEffect(() => {
    if (!hasContext || !getNextZIndex || !releaseZIndex) {
      return;
    }

    // Get z-index when opening
    if (isOpen && zIndexRef.current === null) {
      zIndexRef.current = getNextZIndex();
    }

    // Release z-index when closing
    return () => {
      if (zIndexRef.current !== null) {
        releaseZIndex(zIndexRef.current);
        zIndexRef.current = null;
      }
    };
  }, [isOpen, hasContext, getNextZIndex, releaseZIndex]);

  if (!hasContext) {
    return Z_INDEX_BASE.modal;
  }

  return zIndexRef.current ?? Z_INDEX_BASE.modal;
}

/**
 * Hook to access z-index context directly
 */
export function useZIndex() {
  const context = useContext(ZIndexContext);
  if (!context) {
    // Return default values if no provider
    return {
      getNextZIndex: () => Z_INDEX_BASE.modal,
      releaseZIndex: () => {},
      currentMaxZIndex: Z_INDEX_BASE.modal,
    };
  }
  return context;
}

export { ZIndexContext };

/**
 * Hook to manage z-index for custom dialogs
 * Use this when creating custom modal/dialog components
 *
 * @example
 * ```tsx
 * function CustomDialog({ isOpen, onClose }) {
 *   const { zIndex, style } = useDynamicZIndex(isOpen);
 *
 *   if (!isOpen) return null;
 *
 *   return createPortal(
 *     <div className="fixed inset-0 bg-black/50" style={style}>
 *       <div className="bg-white p-4">Dialog content</div>
 *     </div>,
 *     document.body
 *   );
 * }
 * ```
 */
export function useDynamicZIndex(isOpen: boolean) {
  const { getNextZIndex, releaseZIndex } = useZIndex();
  const zIndexRef = useRef<number | null>(null);

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

  const currentZIndex = zIndexRef.current ?? Z_INDEX_BASE.modal;

  return {
    zIndex: currentZIndex,
    style: { zIndex: currentZIndex } as React.CSSProperties,
  };
}
