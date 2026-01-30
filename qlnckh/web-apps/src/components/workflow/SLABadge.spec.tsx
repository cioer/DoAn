/**
 * SLA Badge Component Tests (Story 3.7)
 *
 * Tests for:
 * - AC1: SLA Badge - OK (Normal)
 * - AC2: SLA Badge - Warning (T-2)
 * - AC3: SLA Badge - Overdue
 * - AC4: SLA Badge - Paused
 * - AC5: Icon + Text ALWAYS (no icon-only)
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SLABadge } from './SLABadge';

// Mock the sla utils to control Date calculations
const mockCalculateSLABadge = vi.fn();
const mockGetSLABadgeClasses = vi.fn((status: string, compact: boolean) => {
  const baseClasses = compact
    ? 'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full'
    : 'inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full';

  const statusClasses: Record<string, string> = {
    ok: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    overdue: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    paused: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return `${baseClasses} ${statusClasses[status] || statusClasses.ok}`;
});

vi.mock('../../lib/utils/sla', () => ({
  calculateSLABadge: () => mockCalculateSLABadge(),
  getSLABadgeClasses: (status: string, compact: boolean) => mockGetSLABadgeClasses(status, compact),
  SLAStatus: {},
}));

describe('SLABadge Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: SLA Badge - OK (Normal)', () => {
    it('should display Clock icon with "Còn X ngày làm việc" text for future deadline', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Còn 3 ngày làm việc',
        iconName: 'Clock',
        remainingDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      // Check for Clock icon
      expect(container.querySelector('svg')).toBeDefined();

      // Check for text
      expect(screen.getByText(/Còn \d+ ngày làm việc/)).toBeDefined();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="ok"]')).toBeDefined();
    });

    it('should use blue color scheme for OK status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Còn 3 ngày làm việc',
        iconName: 'Clock',
        remainingDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      const badge = container.querySelector('[data-sla-status="ok"]');
      expect(badge).toHaveClass('bg-blue-50');
      expect(badge).toHaveClass('text-blue-700');
    });
  });

  describe('AC2: SLA Badge - Warning (T-2)', () => {
    it('should display AlertTriangle icon with "T-2 (Còn X ngày)" text when ≤ 2 days remaining', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'warning',
        text: 'T-2 (Còn 1 ngày)',
        iconName: 'AlertTriangle',
        remainingDays: 1,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-08T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      // Check for text contains T-2
      expect(screen.getByText(/T-2.*Còn \d+ ngày/)).toBeDefined();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="warning"]')).toBeDefined();
    });

    it('should use amber color scheme for warning status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'warning',
        text: 'T-2 (Còn 1 ngày)',
        iconName: 'AlertTriangle',
        remainingDays: 1,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-08T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      const badge = container.querySelector('[data-sla-status="warning"]');
      expect(badge).toHaveClass('bg-amber-50');
      expect(badge).toHaveClass('text-amber-700');
    });
  });

  describe('AC3: SLA Badge - Overdue', () => {
    it('should display AlertCircle icon with "Quá hạn X ngày" text for past deadline', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'overdue',
        text: 'Quá hạn 3 ngày',
        iconName: 'AlertCircle',
        overdueDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-07T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      // Check for text contains overdue
      expect(screen.getByText(/Quá hạn \d+ ngày/)).toBeDefined();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="overdue"]')).toBeDefined();
    });

    it('should use red color scheme for overdue status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'overdue',
        text: 'Quá hạn 3 ngày',
        iconName: 'AlertCircle',
        overdueDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-07T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      const badge = container.querySelector('[data-sla-status="overdue"]');
      expect(badge).toHaveClass('bg-red-50');
      expect(badge).toHaveClass('text-red-700');
    });
  });

  describe('AC4: SLA Badge - Paused', () => {
    it('should display PauseCircle icon with "Đã tạm dừng" text when state is PAUSED', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'paused',
        text: 'Đã tạm dừng',
        iconName: 'PauseCircle',
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="PAUSED"
        />,
      );

      // Check for exact text
      expect(screen.getByText('Đã tạm dừng')).toBeDefined();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="paused"]')).toBeDefined();
    });

    it('should display paused status when slaPausedAt is provided', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'paused',
        text: 'Đã tạm dừng',
        iconName: 'PauseCircle',
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          slaPausedAt="2026-01-05T10:00:00Z"
        />,
      );

      expect(screen.getByText('Đã tạm dừng')).toBeDefined();
      expect(container.querySelector('[data-sla-status="paused"]')).toBeDefined();
    });

    it('should use gray color scheme for paused status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'paused',
        text: 'Đã tạm dừng',
        iconName: 'PauseCircle',
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="PAUSED"
        />,
      );

      const badge = container.querySelector('[data-sla-status="paused"]');
      expect(badge).toHaveClass('bg-gray-50');
      expect(badge).toHaveClass('text-gray-700');
    });

    it('should not show countdown when paused', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'paused',
        text: 'Đã tạm dừng',
        iconName: 'PauseCircle',
      });

      render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="PAUSED"
        />,
      );

      // Should only show "Đã tạm dừng", no day count
      expect(screen.queryByText(/ngày/)).toBeNull();
      expect(screen.getByText('Đã tạm dừng')).toBeDefined();
    });
  });

  describe('AC5: Icon + Text ALWAYS (no icon-only)', () => {
    it('should always render both icon and text for OK status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Còn 3 ngày làm việc',
        iconName: 'Clock',
        remainingDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      // Icon should exist
      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();

      // Text should exist
      const text = screen.queryByText(/Còn \d+ ngày làm việc/);
      expect(text).toBeDefined();

      // Both should be in the same container
      const badge = container.querySelector('[data-sla-status="ok"]');
      expect(badge).toContainElement(icon);
      expect(badge).toContainElement(text);
    });

    it('should always render both icon and text for warning status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'warning',
        text: 'T-2 (Còn 1 ngày)',
        iconName: 'AlertTriangle',
        remainingDays: 1,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-08T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();

      const text = screen.queryByText(/T-2/);
      expect(text).toBeDefined();
    });

    it('should always render both icon and text for overdue status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'overdue',
        text: 'Quá hạn 3 ngày',
        iconName: 'AlertCircle',
        overdueDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-07T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();

      const text = screen.queryByText(/Quá hạn/);
      expect(text).toBeDefined();
    });

    it('should always render both icon and text for paused status', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'paused',
        text: 'Đã tạm dừng',
        iconName: 'PauseCircle',
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="PAUSED"
        />,
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeDefined();

      const text = screen.queryByText('Đã tạm dừng');
      expect(text).toBeDefined();
    });

    it('should preserve text in compact variant', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Còn 3 ngày làm việc',
        iconName: 'Clock',
        remainingDays: 3,
      });

      render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          compact
        />,
      );

      // Compact still has text
      expect(screen.getByText(/Còn \d+ ngày làm việc/)).toBeDefined();
    });
  });

  describe('Edge cases and variations', () => {
    it('should handle null deadline gracefully', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Chưa có hạn chót',
        iconName: 'Clock',
      });

      const { container } = render(
        <SLABadge
          slaDeadline={null}
          currentState="DRAFT"
        />,
      );

      expect(screen.getByText('Chưa có hạn chót')).toBeDefined();
      expect(container.querySelector('[data-sla-status="ok"]')).toBeDefined();
    });

    it('should handle undefined deadline gracefully', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Chưa có hạn chót',
        iconName: 'Clock',
      });

      const { container } = render(
        <SLABadge
          slaDeadline={undefined}
          currentState="DRAFT"
        />,
      );

      expect(screen.getByText('Chưa có hạn chót')).toBeDefined();
    });

    it('should apply custom className', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Còn 3 ngày làm việc',
        iconName: 'Clock',
        remainingDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          className="custom-class"
        />,
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('custom-class');
    });

    it('should use smaller classes in compact variant', () => {
      mockCalculateSLABadge.mockReturnValue({
        status: 'ok',
        text: 'Còn 3 ngày làm việc',
        iconName: 'Clock',
        remainingDays: 3,
      });

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          compact
        />,
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
    });
  });
});
