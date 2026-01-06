import { Clock, AlertTriangle, AlertCircle, PauseCircle } from 'lucide-react';
import { calculateSLABadge, getSLABadgeClasses, SLABadgeData, SLAStatus } from '../../lib/utils/sla';

export interface SLABadgeProps {
  /**
   * The SLA deadline for the proposal
   * Can be ISO string or Date object
   */
  slaDeadline: string | Date | null | undefined;

  /**
   * The current state of the proposal
   * Used to determine if SLA is paused (PAUSED state)
   */
  currentState: string;

  /**
   * Optional timestamp when SLA was paused
   * If provided, badge shows paused status regardless of deadline
   */
  slaPausedAt?: string | Date | null;

  /**
   * Optional compact variant for smaller display
   * When true, uses smaller padding and text size
   * @default false
   */
  compact?: boolean;

  /**
   * Optional additional CSS classes
   */
  className?: string;
}

/**
 * Icon Component Mapping
 * Maps status to appropriate Lucide icon
 */
const ICONS = {
  Clock,
  AlertTriangle,
  AlertCircle,
  PauseCircle,
} as const;

/**
 * SLA Badge Component (Story 3.7)
 *
 * Displays SLA status with icon + text (NEVER icon-only per UX-7).
 * Supports four status variants:
 * - OK (Clock icon): "Còn X ngày làm việc" - blue
 * - Warning (AlertTriangle): "T-2 (Còn X ngày)" - amber (≤2 days)
 * - Overdue (AlertCircle): "Quá hạn X ngày" - red
 * - Paused (PauseCircle): "Đã tạm dừng" - gray
 *
 * @example
 * ```tsx
 * <SLABadge
 *   slaDeadline={project.sla_deadline}
 *   currentState={project.state}
 *   slaPausedAt={project.sla_paused_at}
 * />
 * ```
 *
 * @example - Compact variant
 * ```tsx
 * <SLABadge
 *   slaDeadline="2026-01-10T17:00:00Z"
 *   currentState="FACULTY_REVIEW"
 *   compact
 * />
 * ```
 */
export function SLABadge({
  slaDeadline,
  currentState,
  slaPausedAt,
  compact = false,
  className = '',
}: SLABadgeProps) {
  // Calculate SLA badge data
  const badgeData: SLABadgeData = calculateSLABadge(
    slaDeadline,
    currentState,
    slaPausedAt,
  );

  // Get CSS classes
  const badgeClasses = getSLABadgeClasses(badgeData.status, compact);

  // Get the icon component
  const Icon = ICONS[badgeData.iconName];

  // Icon size based on compact variant
  const iconSize = compact ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div
      className={`${badgeClasses} ${className}`}
      data-sla-status={badgeData.status}
      role="status"
      aria-live="polite"
    >
      {/* CRITICAL: Icon + Text ALWAYS rendered (UX-7: icon-only is FORBIDDEN) */}
      <Icon className={iconSize} aria-hidden="true" />
      <span>{badgeData.text}</span>
    </div>
  );
}

/**
 * Default export for convenience
 */
export default SLABadge;
