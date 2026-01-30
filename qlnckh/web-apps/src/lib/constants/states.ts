/**
 * Project State Enum
 * Matches Prisma schema ProjectState enum
 */
export enum ProjectState {
  DRAFT = 'DRAFT',
  FACULTY_COUNCIL_OUTLINE_REVIEW = 'FACULTY_COUNCIL_OUTLINE_REVIEW',
  SCHOOL_COUNCIL_OUTLINE_REVIEW = 'SCHOOL_COUNCIL_OUTLINE_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  FACULTY_COUNCIL_ACCEPTANCE_REVIEW = 'FACULTY_COUNCIL_ACCEPTANCE_REVIEW',
  SCHOOL_COUNCIL_ACCEPTANCE_REVIEW = 'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW',
  HANDOVER = 'HANDOVER',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  PAUSED = 'PAUSED',
}

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
  Ban,
  CheckCircle,
  Clock,
  FileEdit,
  PauseCircle,
  CircleMinus,
  RotateCw,
  Users,
  XCircle,
  ClipboardCheck,
  Award,
  AlertCircle,
  ArrowUpLeft,
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
 *
 * Exception states (Story 9):
 * - PAUSED: PauseCircle (yellow)
 * - CANCELLED: XCircle (gray)
 * - REJECTED: Ban (red)
 * - WITHDRAWN: RemoveCircle (gray)
 */
const STATE_ICONS: Record<string, LucideIcon> = {
  DRAFT: FileEdit,
  FACULTY_COUNCIL_OUTLINE_REVIEW: Users,
  SCHOOL_COUNCIL_OUTLINE_REVIEW: Users,
  CHANGES_REQUESTED: ArrowUpLeft,
  APPROVED: CheckCircle,
  IN_PROGRESS: RotateCw,
  PAUSED: PauseCircle,
  FACULTY_COUNCIL_ACCEPTANCE_REVIEW: ClipboardCheck,
  SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: Award,
  REJECTED: Ban,
  WITHDRAWN: CircleMinus,
  CANCELLED: XCircle,
  HANDOVER: Award,
  COMPLETED: CheckCircle,
};

/**
 * State labels in Vietnamese
 * Story 5.1: SCHOOL_SELECTION_REVIEW label is "Đang xét (Trường)"
 */
const STATE_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  FACULTY_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Khoa - Đề cương',
  SCHOOL_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Trường - Đề cương',
  CHANGES_REQUESTED: 'Yêu cầu sửa',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang thực hiện',
  PAUSED: 'Tạm dừng',
  FACULTY_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Khoa - Nghiệm thu',
  SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Trường - Nghiệm thu',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút',
  CANCELLED: 'Đã hủy',
  HANDOVER: 'Bàn giao',
  COMPLETED: 'Đã hoàn thành',
};

/**
 * State badge variants
 * Maps each state to a visual variant
 *
 * Exception states (Story 9):
 * - PAUSED: 'warning' (yellow)
 * - CANCELLED: 'default' (gray)
 * - REJECTED: 'danger' (red)
 * - WITHDRAWN: 'default' (gray)
 */
const STATE_VARIANTS: Record<string, StateBadgeVariant> = {
  DRAFT: 'default',
  FACULTY_COUNCIL_OUTLINE_REVIEW: 'info',
  SCHOOL_COUNCIL_OUTLINE_REVIEW: 'warning',
  CHANGES_REQUESTED: 'warning',
  APPROVED: 'success',
  IN_PROGRESS: 'primary',
  PAUSED: 'warning',
  FACULTY_COUNCIL_ACCEPTANCE_REVIEW: 'info',
  SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'default',
  CANCELLED: 'default',
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
  'SCHOOL_COUNCIL_OUTLINE_REVIEW',
  'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW',
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
