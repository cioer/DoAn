/**
 * SLA Utility Functions for Frontend
 *
 * Story 3.7: SLA Badge Component (Icon + Text)
 *
 * Provides client-side SLA status calculation for displaying badges.
 * Works with backend SLA data from Story 3.6 (SLA Calculator).
 *
 * NOTE: For accurate business day calculations (excluding weekends, holidays),
 * the frontend should use SLA data from backend API which has full calendar context.
 * This utility provides approximate calendar-day calculations for immediate display.
 */

/**
 * SLA Status Types
 */
export type SLAStatus = 'ok' | 'warning' | 'overdue' | 'paused';

/**
 * SLA Badge Data
 * Contains all information needed to render an SLA badge
 */
export interface SLABadgeData {
  status: SLAStatus;
  text: string;
  iconName: 'Clock' | 'AlertTriangle' | 'AlertCircle' | 'PauseCircle';
  remainingDays?: number;
  overdueDays?: number;
}

/**
 * Check if a date string is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Calculate SLA badge status from deadline and current state
 *
 * Priority: PAUSED > OVERDUE > WARNING > OK
 *
 * AC6 Note: This is a client-side approximation using calendar days.
 * For accurate business day calculations (excluding weekends/holidays),
 * use backend SLA data from Story 3.6 (sla.service.ts).
 *
 * @param slaDeadline - The SLA deadline (ISO string or Date)
 * @param currentState - The current proposal state
 * @param slaPausedAt - Optional timestamp when SLA was paused
 * @returns SLABadgeData with status, text, icon, and day counts
 */
export function calculateSLABadge(
  slaDeadline: string | Date | null | undefined,
  currentState: string,
  slaPausedAt?: string | Date | null,
): SLABadgeData {
  // PAUSED state has highest priority
  if (currentState === 'PAUSED' || slaPausedAt) {
    return {
      status: 'paused',
      text: 'Đã tạm dừng',
      iconName: 'PauseCircle',
    };
  }

  // If no deadline, return neutral status
  if (!slaDeadline) {
    return {
      status: 'ok',
      text: 'Chưa có hạn chót',
      iconName: 'Clock',
    };
  }

  const deadline = new Date(slaDeadline);

  // Validate the date
  if (!isValidDate(deadline)) {
    return {
      status: 'ok',
      text: 'Ngày không hợp lệ',
      iconName: 'Clock',
    };
  }

  const now = new Date();

  // Check if overdue
  const isOverdue = now > deadline;

  if (isOverdue) {
    // Calculate overdue days (approximate calendar days)
    // Note: For exact business day count, use backend getRemainingBusinessDays()
    const overdueMs = now.getTime() - deadline.getTime();
    const overdueDays = Math.max(1, Math.ceil(overdueMs / (1000 * 60 * 60 * 24)));
    return {
      status: 'overdue',
      text: `Quá hạn ${overdueDays} ngày`,
      iconName: 'AlertCircle',
      overdueDays,
    };
  }

  // Calculate remaining days (approximate calendar days)
  // Note: For exact business day count, use backend getRemainingBusinessDays()
  const remainingMs = deadline.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

  // Warning if ≤ 2 days remaining
  if (remainingDays <= 2) {
    return {
      status: 'warning',
      text: `T-2 (Còn ${remainingDays} ngày)`,
      iconName: 'AlertTriangle',
      remainingDays,
    };
  }

  // Normal OK status
  return {
    status: 'ok',
    text: `Còn ${remainingDays} ngày làm việc`,
    iconName: 'Clock',
    remainingDays,
  };
}

/**
 * Get CSS classes for SLA badge based on status
 *
 * @param status - The SLA status
 * @param compact - Whether to use compact variant
 * @returns CSS classes string
 */
export function getSLABadgeClasses(status: SLAStatus, compact = false): string {
  const baseClasses = compact
    ? 'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full'
    : 'inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full';

  const statusClasses: Record<SLAStatus, string> = {
    ok: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    overdue: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    paused: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return `${baseClasses} ${statusClasses[status]}`;
}
