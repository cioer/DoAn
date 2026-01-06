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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SLABadge } from './SLABadge';

describe('SLABadge Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('AC1: SLA Badge - OK (Normal)', () => {
    it('should display Clock icon with "Còn X ngày làm việc" text for future deadline', () => {
      // Set current time to 2026-01-07 10:00
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z" // 3 days from now
          currentState="FACULTY_REVIEW"
        />,
      );

      // Check for Clock icon
      expect(container.querySelector('svg')).toBeInTheDocument();

      // Check for text
      expect(screen.getByText(/Còn \d+ ngày làm việc/)).toBeInTheDocument();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="ok"]')).toBeInTheDocument();
    });

    it('should use blue color scheme for OK status', () => {
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_REVIEW"
        />,
      );

      const badge = container.querySelector('[data-sla-status="ok"]');
      expect(badge).toHaveClass('bg-blue-50');
      expect(badge).toHaveClass('text-blue-700');
    });
  });

  describe('AC2: SLA Badge - Warning (T-2)', () => {
    it('should display AlertTriangle icon with "T-2 (Còn X ngày)" text when ≤ 2 days remaining', () => {
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-08T17:00:00Z" // 1 day from now (≤ 2 days)
          currentState="FACULTY_REVIEW"
        />,
      );

      // Check for text contains T-2
      expect(screen.getByText(/T-2.*Còn \d+ ngày/)).toBeInTheDocument();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="warning"]')).toBeInTheDocument();
    });

    it('should use amber color scheme for warning status', () => {
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-08T17:00:00Z"
          currentState="FACULTY_REVIEW"
        />,
      );

      const badge = container.querySelector('[data-sla-status="warning"]');
      expect(badge).toHaveClass('bg-amber-50');
      expect(badge).toHaveClass('text-amber-700');
    });
  });

  describe('AC3: SLA Badge - Overdue', () => {
    it('should display AlertCircle icon with "Quá hạn X ngày" text for past deadline', () => {
      vi.setSystemTime(new Date('2026-01-10T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-07T17:00:00Z" // 3 days ago
          currentState="FACULTY_REVIEW"
        />,
      );

      // Check for text contains overdue
      expect(screen.getByText(/Quá hạn \d+ ngày/)).toBeInTheDocument();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="overdue"]')).toBeInTheDocument();
    });

    it('should use red color scheme for overdue status', () => {
      vi.setSystemTime(new Date('2026-01-10T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-07T17:00:00Z"
          currentState="FACULTY_REVIEW"
        />,
      );

      const badge = container.querySelector('[data-sla-status="overdue"]');
      expect(badge).toHaveClass('bg-red-50');
      expect(badge).toHaveClass('text-red-700');
    });
  });

  describe('AC4: SLA Badge - Paused', () => {
    it('should display PauseCircle icon with "Đã tạm dừng" text when state is PAUSED', () => {
      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="PAUSED"
        />,
      );

      // Check for exact text
      expect(screen.getByText('Đã tạm dừng')).toBeInTheDocument();

      // Check data attribute for status
      expect(container.querySelector('[data-sla-status="paused"]')).toBeInTheDocument();
    });

    it('should display paused status when slaPausedAt is provided', () => {
      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_REVIEW"
          slaPausedAt="2026-01-05T10:00:00Z"
        />,
      );

      expect(screen.getByText('Đã tạm dừng')).toBeInTheDocument();
      expect(container.querySelector('[data-sla-status="paused"]')).toBeInTheDocument();
    });

    it('should use gray color scheme for paused status', () => {
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
      render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="PAUSED"
        />,
      );

      // Should only show "Đã tạm dừng", no day count
      expect(screen.queryByText(/ngày/)).not.toBeInTheDocument();
      expect(screen.getByText('Đã tạm dừng')).toBeInTheDocument();
    });
  });

  describe('AC5: Icon + Text ALWAYS (no icon-only)', () => {
    it('should always render both icon and text for OK status', () => {
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_REVIEW"
        />,
      );

      // Icon should exist
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();

      // Text should exist
      const text = screen.queryByText(/Còn \d+ ngày làm việc/);
      expect(text).toBeInTheDocument();

      // Both should be in the same container
      const badge = container.querySelector('[data-sla-status="ok"]');
      expect(badge).toContainElement(icon);
      expect(badge).toContainElement(text);
    });

    it('should always render both icon and text for warning status', () => {
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-08T17:00:00Z"
          currentState="FACULTY_REVIEW"
        />,
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();

      const text = screen.queryByText(/T-2/);
      expect(text).toBeInTheDocument();
    });

    it('should always render both icon and text for overdue status', () => {
      vi.setSystemTime(new Date('2026-01-10T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-07T17:00:00Z"
          currentState="FACULTY_REVIEW"
        />,
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();

      const text = screen.queryByText(/Quá hạn/);
      expect(text).toBeInTheDocument();
    });

    it('should always render both icon and text for paused status', () => {
      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="PAUSED"
        />,
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();

      const text = screen.queryByText('Đã tạm dừng');
      expect(text).toBeInTheDocument();
    });

    it('should preserve text in compact variant', () => {
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_REVIEW"
          compact
        />,
      );

      // Compact still has text
      expect(screen.getByText(/Còn \d+ ngày làm việc/)).toBeInTheDocument();
    });
  });

  describe('Edge cases and variations', () => {
    it('should handle null deadline gracefully', () => {
      const { container } = render(
        <SLABadge
          slaDeadline={null}
          currentState="DRAFT"
        />,
      );

      expect(screen.getByText('Chưa có hạn chót')).toBeInTheDocument();
      expect(container.querySelector('[data-sla-status="ok"]')).toBeInTheDocument();
    });

    it('should handle undefined deadline gracefully', () => {
      const { container } = render(
        <SLABadge
          slaDeadline={undefined}
          currentState="DRAFT"
        />,
      );

      expect(screen.getByText('Chưa có hạn chót')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_REVIEW"
          className="custom-class"
        />,
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('custom-class');
    });

    it('should use smaller classes in compact variant', () => {
      vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));

      const { container } = render(
        <SLABadge
          slaDeadline="2026-01-10T17:00:00Z"
          currentState="FACULTY_REVIEW"
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
