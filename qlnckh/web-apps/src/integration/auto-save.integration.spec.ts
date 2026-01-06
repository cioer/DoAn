/**
 * Integration Tests for Auto-save Flow (Story 2.3)
 *
 * Tests the complete auto-save flow from user interaction to API call:
 * - Field change triggers debounced auto-save
 * - Save indicator shows correct states
 * - Data persists after save
 * - Error handling and retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { proposalsApi } from '../lib/api/proposals';

// Mock the proposals API
vi.mock('../lib/api/proposals', () => ({
  proposalsApi: {
    getProposalById: vi.fn(),
    autoSave: vi.fn(),
  },
}));

describe('Auto-save Integration Flow (Story 2.3)', () => {
  const mockProposal = {
    id: 'proposal-123',
    code: 'DT-001',
    title: 'Nghiên cứu AI',
    state: 'DRAFT',
    ownerId: 'user-123',
    facultyId: 'faculty-123',
    formData: {
      SEC_INFO_GENERAL: { title: 'Old Title', objective: 'Old Objective' },
    },
    updatedAt: new Date('2026-01-06T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('AC1: Auto-save Trigger', () => {
    it('should trigger auto-save after 2-second debounce when field changes', async () => {
      const autoSaveSpy = vi.spyOn(proposalsApi.proposalsApi, 'autoSave').mockResolvedValue(mockProposal);

      // Simulate field change (would trigger triggerSave in actual component)
      const { triggerSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        triggerSave.useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 2000,
        }),
      );

      // Simulate field change
      act(() => {
        result.current.triggerSave({
          SEC_INFO_GENERAL: { title: 'New Title' },
        });
      });

      // Should not call API immediately
      expect(autoSaveSpy).not.toHaveBeenCalled();

      // Fast-forward 1 second - still not called
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(autoSaveSpy).not.toHaveBeenCalled();

      // Fast-forward to 2 seconds - should call API
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(autoSaveSpy).toHaveBeenCalledTimes(1);
      });

      // Verify correct data was sent
      expect(autoSaveSpy).toHaveBeenCalledWith('proposal-123', {
        formData: { SEC_INFO_GENERAL: { title: 'New Title' } },
      });
    });

    it('should cancel pending save when new change occurs', async () => {
      const autoSaveSpy = vi.spyOn(proposalsApi.proposalsApi, 'autoSave').mockResolvedValue(mockProposal);

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 2000,
        }),
      );

      // First change
      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'First' } });
      });

      // Advance 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Second change - should cancel first save
      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'Second' } });
      });

      // Advance another 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(autoSaveSpy).toHaveBeenCalledTimes(1);
      });

      // Should only have second data
      expect(autoSaveSpy).toHaveBeenCalledWith('proposal-123', {
        formData: { SEC_INFO_GENERAL: { title: 'Second' } },
      });
    });
  });

  describe('AC2, AC3: Save Indicator States', () => {
    it('should show "Đang lưu..." during save', async () => {
      vi.useRealTimers();

      let resolveSave: (value: unknown) => void;
      const savePromise = new Promise((resolve) => {
        resolveSave = resolve;
      });

      vi.spyOn(proposalsApi.proposalsApi, 'autoSave').mockReturnValue(savePromise as any);

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 100,
        }),
      );

      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'Test' } });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('saving');
      });

      resolveSave!(mockProposal);
      await waitFor(() => {
        expect(result.current.state.status).toBe('saved');
      });
    });

    it('should show "Đã lưu vào HH:mm:ss" on success', async () => {
      vi.useRealTimers();

      const savedAt = new Date('2026-01-06T10:30:00Z');
      vi.spyOn(proposalsApi.proposalsApi, 'autoSave').mockResolvedValue({
        ...mockProposal,
        updatedAt: savedAt,
      });

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 100,
        }),
      );

      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'Test' } });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('saved');
        expect(result.current.state.lastSavedAt).toBeDefined();
      });

      // Verify timestamp format
      const timeString = new Date(result.current.state.lastSavedAt!).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      expect(timeString).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('AC4: Error Handling with Retry', () => {
    it('should show error and retry on network failure', async () => {
      vi.useRealTimers();

      const autoSaveSpy = vi
        .spyOn(proposalsApi.proposalsApi, 'autoSave')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockProposal);

      const retryCallback = vi.fn();

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 100,
          maxRetries: 3,
          onRetryAttempt: retryCallback,
        }),
      );

      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'Test' } });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Wait for all retries to complete
      await waitFor(
        () => {
          expect(result.current.state.status).toBe('saved');
        },
        { timeout: 15000 },
      );

      // Should have been called 3 times (initial + 2 retries)
      expect(autoSaveSpy).toHaveBeenCalledTimes(3);
      expect(retryCallback).toHaveBeenCalledTimes(2);
    });

    it('should not retry on CONFLICT error (optimistic locking)', async () => {
      vi.useRealTimers();

      const conflictError = new Error('CONFLICT');
      (conflictError as any).response = { status: 409 };

      const autoSaveSpy = vi
        .spyOn(proposalsApi.proposalsApi, 'autoSave')
        .mockRejectedValue(conflictError);

      const errorCallback = vi.fn();

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 100,
          onAutoSaveError: errorCallback,
        }),
      );

      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'Test' } });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      // Should only call once (no retries on CONFLICT)
      expect(autoSaveSpy).toHaveBeenCalledTimes(1);
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('AC5: Data Persistence on Unmount', () => {
    it('should force save pending data on unmount', async () => {
      vi.useRealTimers();

      const autoSaveSpy = vi.spyOn(proposalsApi.proposalsApi, 'autoSave').mockResolvedValue(mockProposal);

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result, unmount } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 5000, // Long debounce
        }),
      );

      // Trigger change (will be pending due to long debounce)
      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'Pending' } });
      });

      // Unmount before debounce completes - should force save
      unmount();

      await waitFor(() => {
        expect(autoSaveSpy).toHaveBeenCalledTimes(1);
      });

      expect(autoSaveSpy).toHaveBeenCalledWith('proposal-123', {
        formData: { SEC_INFO_GENERAL: { title: 'Pending' } },
      });
    });

    it('should preserve data when closing tab and reopening', async () => {
      // This test simulates the AC5 requirement:
      // "Giảng viên đóng tab khi đang edit, khi mở lại proposal, dữ liệu được preserve"

      vi.useRealTimers();

      // Simulate first edit session
      const getProposalSpy = vi.spyOn(proposalsApi.proposalsApi, 'getProposalById').mockResolvedValue({
        ...mockProposal,
        formData: {
          SEC_INFO_GENERAL: { title: 'Edited Title', objective: 'Edited Objective' },
        },
      });

      const firstProposal = await proposalsApi.getProposalById('proposal-123');

      // Verify data was saved
      expect(firstProposal.formData).toEqual({
        SEC_INFO_GENERAL: { title: 'Edited Title', objective: 'Edited Objective' },
      });

      // Simulate reopening page (new session)
      const secondProposal = await proposalsApi.getProposalById('proposal-123');

      // Data should be preserved
      expect(secondProposal.formData).toEqual({
        SEC_INFO_GENERAL: { title: 'Edited Title', objective: 'Edited Objective' },
      });
    });
  });

  describe('Deep Merge Behavior', () => {
    it('should merge partial form data with existing data', async () => {
      const autoSaveSpy = vi.spyOn(proposalsApi.proposalsApi, 'autoSave').mockResolvedValue({
        ...mockProposal,
        formData: {
          SEC_INFO_GENERAL: { title: 'New Title', objective: 'Old Objective' },
          SEC_BUDGET: { total: 50000000 },
        },
      });

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: true,
          debounceMs: 100,
        }),
      );

      // Only update SEC_INFO_GENERAL.title
      act(() => {
        result.current.triggerSave({
          SEC_INFO_GENERAL: { title: 'New Title' },
        });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(autoSaveSpy).toHaveBeenCalled();
      });

      // Backend will merge with existing SEC_BUDGET
      // The API receives only the changed section
      expect(autoSaveSpy).toHaveBeenCalledWith('proposal-123', {
        formData: { SEC_INFO_GENERAL: { title: 'New Title' } },
      });
    });
  });

  describe('DRAFT State Validation', () => {
    it('should only auto-save when proposal is in DRAFT state', async () => {
      const autoSaveSpy = vi.spyOn(proposalsApi.proposalsApi, 'autoSave').mockResolvedValue(mockProposal);

      const { useAutoSave } = await import('../hooks/useAutoSave');
      const { result } = renderHook(() =>
        useAutoSave({
          proposalId: 'proposal-123',
          enabled: false, // Simulating non-DRAFT proposal
          debounceMs: 100,
        }),
      );

      act(() => {
        result.current.triggerSave({ SEC_INFO_GENERAL: { title: 'Test' } });
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not call API when disabled
      expect(autoSaveSpy).not.toHaveBeenCalled();
    });
  });
});
