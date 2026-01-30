/**
 * States Constants Tests (Story 5.1)
 *
 * Tests for state badge configurations, labels, and PKHCN queue detection.
 */

import { getStateBadge, getStateBadgeClasses, getStateLabel, isPKHCNQueueState, STATE_BADGES } from './states';

describe('States Constants (Story 5.1)', () => {
  describe('SCHOOL_SELECTION_REVIEW State Badge', () => {
    it('should have correct Vietnamese label "Đang xét (Trường)"', () => {
      const badge = getStateBadge('SCHOOL_COUNCIL_OUTLINE_REVIEW');

      expect(badge.label).toBe('Đang xét (Trường)');
    });

    it('should have Clock icon for pending state', () => {
      const badge = getStateBadge('SCHOOL_COUNCIL_OUTLINE_REVIEW');

      // Lucide icons are React components, just verify the icon is defined
      expect(badge.icon).toBeDefined();
      expect(typeof badge.icon).toBe('object'); // Lucide icons are objects with $$typeof
    });

    it('should have warning variant (amber/yellow for pending)', () => {
      const badge = getStateBadge('SCHOOL_COUNCIL_OUTLINE_REVIEW');

      expect(badge.variant).toBe('warning');
    });
  });

  describe('State Badges for All States', () => {
    it('should have badge configuration for all project states', () => {
      const states = [
        'DRAFT',
        'FACULTY_COUNCIL_OUTLINE_REVIEW',
        'SCHOOL_COUNCIL_OUTLINE_REVIEW',
        'SCHOOL_COUNCIL_OUTLINE_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'IN_PROGRESS',
        'PAUSED',
        'FACULTY_COUNCIL_ACCEPTANCE_REVIEW',
        'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW',
        'REJECTED',
        'WITHDRAWN',
        'CANCELLED',
        'HANDOVER',
        'COMPLETED',
      ];

      states.forEach((state) => {
        const badge = getStateBadge(state);
        expect(badge).toBeDefined();
        expect(badge.label).toBeDefined();
        expect(badge.icon).toBeDefined();
        expect(badge.variant).toBeDefined();
      });
    });
  });

  describe('Vietnamese Localization', () => {
    it('should provide Vietnamese labels for all states', () => {
      expect(getStateLabel('DRAFT')).toBe('Nháp');
      expect(getStateLabel('FACULTY_COUNCIL_OUTLINE_REVIEW')).toBe('Đang xét (Khoa)');
      expect(getStateLabel('SCHOOL_COUNCIL_OUTLINE_REVIEW')).toBe('Đang xét (Trường)');
      expect(getStateLabel('CHANGES_REQUESTED')).toBe('Yêu cầu sửa');
      expect(getStateLabel('APPROVED')).toBe('Đã duyệt');
      expect(getStateLabel('REJECTED')).toBe('Từ chối');
    });

    it('should return original state if label not found', () => {
      const unknownState = 'UNKNOWN_STATE';
      expect(getStateLabel(unknownState)).toBe(unknownState);
    });
  });

  describe('State Badge CSS Classes', () => {
    it('should return correct CSS classes for each variant', () => {
      expect(getStateBadgeClasses('default')).toContain('bg-gray-100');
      expect(getStateBadgeClasses('primary')).toContain('bg-blue-100');
      expect(getStateBadgeClasses('warning')).toContain('bg-amber-100');
      expect(getStateBadgeClasses('success')).toContain('bg-green-100');
      expect(getStateBadgeClasses('danger')).toContain('bg-red-100');
      expect(getStateBadgeClasses('info')).toContain('bg-cyan-100');
    });

    it('should include base classes in all variants', () => {
      const baseClass = 'inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full';

      expect(getStateBadgeClasses('default')).toContain(baseClass);
      expect(getStateBadgeClasses('primary')).toContain(baseClass);
      expect(getStateBadgeClasses('warning')).toContain(baseClass);
    });
  });

  describe('PKHCN Queue States', () => {
    it('should identify SCHOOL_SELECTION_REVIEW as PKHCN queue state', () => {
      expect(isPKHCNQueueState('SCHOOL_COUNCIL_OUTLINE_REVIEW')).toBe(true);
    });

    it('should identify SCHOOL_ACCEPTANCE_REVIEW as PKHCN queue state', () => {
      expect(isPKHCNQueueState('SCHOOL_COUNCIL_ACCEPTANCE_REVIEW')).toBe(true);
    });

    it('should identify PAUSED as PKHCN queue state', () => {
      expect(isPKHCNQueueState('PAUSED')).toBe(true);
    });

    it('should NOT identify FACULTY_REVIEW as PKHCN queue state', () => {
      expect(isPKHCNQueueState('FACULTY_COUNCIL_OUTLINE_REVIEW')).toBe(false);
    });

    it('should NOT identify DRAFT as PKHCN queue state', () => {
      expect(isPKHCNQueueState('DRAFT')).toBe(false);
    });
  });

  describe('UX-7: Icon + Text Always Displayed', () => {
    it('should provide both icon and label for all states (UX-7 compliance)', () => {
      Object.entries(STATE_BADGES).forEach(([state, badge]) => {
        expect(badge.label).toBeTruthy();
        expect(badge.label.length).toBeGreaterThan(0);
        expect(badge.icon).toBeDefined();
      });
    });
  });
});
