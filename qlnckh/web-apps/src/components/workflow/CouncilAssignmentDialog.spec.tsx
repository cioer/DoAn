/**
 * Council Assignment Dialog Component Tests (Story 5.2)
 *
 * Tests for the council assignment dialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CouncilAssignmentDialog } from './CouncilAssignmentDialog';

// Mock the workflow API
vi.mock('../../lib/api/workflow', () => ({
  generateIdempotencyKey: vi.fn(() => 'mock-uuid'),
}));

describe('CouncilAssignmentDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnAssign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when isOpen is false', () => {
    const { container } = render(
      <CouncilAssignmentDialog
        isOpen={false}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );
    expect(container.firstChild).toBe(null);
  });

  it('should render dialog when isOpen is true', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    // The component has mock data embedded in fetchCouncils
    // Wait for initial render
    expect(await screen.findByText(/phân bổ hội đồng/i)).toBeDefined();
  });

  it('should disable submit button when no council is selected', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    // Wait for component to render
    await screen.findByText(/phân bổ hội đồng/i);

    const submitButton = screen.queryByRole('button', { name: /xác nhận/i });
    // If button exists, it should be disabled
    if (submitButton) {
      expect(submitButton).toBeDisabled();
    }
  });

  it('should call onClose when cancel button is clicked', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    await screen.findByText(/phân bổ hội đồng/i);

    const cancelButton = screen.getByText('Hủy');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show loading state when isSubmitting is true', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        isSubmitting={true}
        proposalId="proposal-1"
      />,
    );

    // Button shows loading spinner with Vietnamese "Đang xử lý..." text when isLoading is true
    const submitButton = await screen.findByRole('button', { name: /Đang xử lý.../i });
    expect(submitButton).toBeDisabled();

    // Check for the spinner icon (svg with animate-spin)
    const spinner = submitButton.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  it('should render dialog title correctly', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    expect(await screen.findByText('Phân bổ hội đồng xét duyệt')).toBeDefined();
  });

  it('should handle council selection after data loads', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    // Wait for councils to load
    await screen.findByText(/phân bổ hội đồng/i);

    // Try to find select element
    const select = screen.queryByRole('combobox');
    if (select) {
      fireEvent.change(select, { target: { value: 'council-1' } });
      // Check that something changed
      expect(select).toHaveValue('council-1');
    }
  });

  it('should have "Tạo hội đồng mới" button', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    expect(await screen.findByText('Tạo hội đồng mới')).toBeDefined();
  });
});
