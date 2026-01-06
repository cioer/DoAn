/**
 * State Badge Constants (Story 5.1)
 *
 * Provides state badge configurations for UI components.
 * Includes label, icon, and variant styling for each ProjectState.
 *
 * UX-7: Icons must be accompanied by text (icon-only is forbidden)
 */

import { LucideIcon } from 'lucide-react';
import {
  FileEdit,
  Clock,
  AlertCircle,
  CheckCircle,
  RotateCw,
  PauseCircle,
  FileX,
  XCircle,
  Users,
  ClipboardList,
} from 'lucide-react';

/**
 * State badge variant types
 */
export type StateBadgeVariant = 'default' | 'primary' | 'warning' | 'success' | 'danger' | 'info';

/**
 * State badge configuration
 */
export interface StateBadgeConfig {
  label: string;
  icon: LucideIcon;
  variant: StateBadgeVariant;
}

/**
 * Icon mapping for states
 * Using Lucide React icons (UX-7: icon + text always displayed)
 */
const STATE_ICONS: Record<string, LucideIcon> = {
  DRAFT: FileEdit,
  FACULTY_REVIEW: Clock,
  SCHOOL_SELECTION_REVIEW: Clock,
  OUTLINE_COUNCIL_REVIEW: Users,
  CHANGES_REQUESTED: AlertCircle,
  APPROVED: CheckCircle,
  IN_PROGRESS: RotateCw,
  PAUSED: PauseCircle,
  FACULTY_ACCEPTANCE_REVIEW: ClipboardList,
  SCHOOL_ACCEPTANCE_REVIEW: ClipboardList,
  REJECTED: XCircle,
  WITHDRAWN: FileX,
  CANCELLED: XCircle,
  HANDOVER: ClipboardList,
  COMPLETED: CheckCircle,
};

/**
 * State labels in Vietnamese
 * Story 5.1: SCHOOL_SELECTION_REVIEW label is "Đang xét (Trường)"
 */
const STATE_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  FACULTY_REVIEW: 'Đang xét (Khoa)',
  SCHOOL_SELECTION_REVIEW: 'Đang xét (Trường)',
  OUTLINE_COUNCIL_REVIEW: 'Đang xét (Hội đồng)',
  CHANGES_REQUESTED: 'Yêu cầu sửa',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang thực hiện',
  PAUSED: 'Tạm dừng',
  FACULTY_ACCEPTANCE_REVIEW: 'Nghiệm thu (Khoa)',
  SCHOOL_ACCEPTANCE_REVIEW: 'Nghiệm thu (Trường)',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút',
  CANCELLED: 'Đã hủy',
  HANDOVER: 'Bàn giao',
  COMPLETED: 'Đã hoàn thành',
};

/**
 * State badge variants
 * Maps each state to a visual variant
 */
const STATE_VARIANTS: Record<string, StateBadgeVariant> = {
  DRAFT: 'default',
  FACULTY_REVIEW: 'info',
  SCHOOL_SELECTION_REVIEW: 'warning', // Story 5.1: amber/yellow for pending
  OUTLINE_COUNCIL_REVIEW: 'info',
  CHANGES_REQUESTED: 'danger',
  APPROVED: 'success',
  IN_PROGRESS: 'primary',
  PAUSED: 'default',
  FACULTY_ACCEPTANCE_REVIEW: 'info',
  SCHOOL_ACCEPTANCE_REVIEW: 'warning',
  REJECTED: 'danger',
  WITHDRAWN: 'default',
  CANCELLED: 'danger',
  HANDOVER: 'info',
  COMPLETED: 'success',
};

/**
 * Complete state badge configuration
 * Story 5.1: Added SCHOOL_SELECTION_REVIEW configuration
 */
export const STATE_BADGES: Record<string, StateBadgeConfig> = Object.keys(
  STATE_LABELS,
).reduce((acc, state) => {
  acc[state] = {
    label: STATE_LABELS[state],
    icon: STATE_ICONS[state] || FileEdit,
    variant: STATE_VARIANTS[state] || 'default',
  };
  return acc;
}, {} as Record<string, StateBadgeConfig>);

/**
 * Get state badge configuration for a state
 *
 * @param state - ProjectState string value
 * @returns StateBadgeConfig with label, icon, and variant
 */
export function getStateBadge(state: string): StateBadgeConfig {
  return (
    STATE_BADGES[state] || {
      label: state,
      icon: FileEdit,
      variant: 'default',
    }
  );
}

/**
 * Get CSS classes for state badge based on variant
 *
 * @param variant - State badge variant
 * @returns CSS classes string
 */
export function getStateBadgeClasses(variant: StateBadgeVariant): string {
  const baseClasses = 'inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full';

  const variantClasses: Record<StateBadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700', // Story 5.1: for SCHOOL_SELECTION_REVIEW
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-cyan-100 text-cyan-700',
  };

  return `${baseClasses} ${variantClasses[variant]}`;
}

/**
 * Get state label in Vietnamese
 * Story 5.1: Vietnamese localization for all states
 *
 * @param state - ProjectState string value
 * @returns Vietnamese label
 */
export function getStateLabel(state: string): string {
  return STATE_LABELS[state] || state;
}

/**
 * States that appear in PKHCN queue (Story 5.1)
 * These are the states where holder_unit = PHONG_KHCN
 */
export const PKHCN_QUEUE_STATES = [
  'SCHOOL_SELECTION_REVIEW',
  'SCHOOL_ACCEPTANCE_REVIEW',
  'PAUSED',
] as const;

/**
 * Check if state is in PKHCN queue
 *
 * @param state - ProjectState string value
 * @returns true if state is in PKHCN queue
 */
export function isPKHCNQueueState(state: string): boolean {
  return PKHCN_QUEUE_STATES.includes(state as any);
}
