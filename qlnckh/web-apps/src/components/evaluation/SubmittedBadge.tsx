/**
 * Submitted Badge Component (Story 5.5)
 *
 * Displays "Đã nộp" badge for finalized evaluations.
 * Features:
 * - Green checkmark icon
 * - "Đã nộp" text
 * - Timestamp in Vietnamese format
 * - Prominent display at top of form
 *
 * Story 5.5: AC1 - Read-Only UI Mode
 */

import { CheckCircle } from 'lucide-react';

export interface SubmittedBadgeProps {
  submittedAt: Date | string;
  className?: string;
}

/**
 * Format timestamp to Vietnamese format (Story 5.5)
 * Format: "Đã nộp vào HH:mm:ss ngày dd/mm/yyyy"
 */
function formatSubmittedTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  const time = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const day = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `${time} ngày ${day}`;
}

/**
 * Submitted Badge Component (Story 5.5)
 * Displays prominent "Đã nộp" badge with timestamp
 */
export function SubmittedBadge({ submittedAt, className = '' }: SubmittedBadgeProps) {
  const timestamp = formatSubmittedTimestamp(submittedAt);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-green-800 dark:text-green-200">
        Đã nộp vào {timestamp}
      </span>
    </div>
  );
}
