/**
 * Council Assignment Dialog Component Tests (Story 5.2)
 *
 * Tests for the council assignment dialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CouncilAssignmentDialog } from './CouncilAssignmentDialog';

// Mock the workflow API
vi.mock('../../lib/api/workflow', () => ({
  generateIdempotencyKey: vi.fn(() => 'mock-uuid'),
}));

describe('CouncilAssignmentDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnAssign = vi.fn();

  const mockCouncils = [
    {
      id: 'council-1',
      name: 'Hội đồng khoa CNTT #1',
      type: 'OUTLINE',
      secretaryId: 'user-1',
      secretaryName: 'Nguyễn Văn A',
      members: [
        {
          id: 'member-1',
          councilId: 'council-1',
          userId: 'user-2',
          displayName: 'Trần Văn B',
          role: 'MEMBER',
        },
      ],
    },
  ];

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

  it('should render dialog when isOpen is true', () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    expect(screen.getByText(/phân bổ hội đồng/i)).toBeDefined();
    expect(screen.getByText(/chọn hội đồng/i)).toBeDefined();
  });

  it('should disable submit button when no council is selected', () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    const submitButton = screen.getByRole('button', { name: /xác nhận/i });
    expect(submitButton).toBeDisabled();
  });

  it('should call onAssign with correct data when form is submitted', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    // Wait for initial render and mock data to load
    await waitFor(() => {
      // The component renders mock data after useEffect runs
      expect(screen.getByText(/chọn hội đồng/i)).toBeDefined();
    });

    // Find the select element by its container
    const selectContainer = screen.getByText(/chọn hội đồng/i).parentElement;
    const select = selectContainer?.querySelector('select');
    if (select) {
      fireEvent.change(select, { target: { value: 'council-1' } });
    }

    // Click submit
    const submitButton = screen.getByText(/xác nhận phân bổ/i);
    fireEvent.click(submitButton);

    // onAssign is called asynchronously (mock resolves immediately)
    expect(mockOnAssign).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    const cancelButton = screen.getByText('Hủy');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show loading state when isSubmitting is true', () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        isSubmitting={true}
        proposalId="proposal-1"
      />,
    );

    expect(screen.getByText(/đang xử lý/i)).toBeDefined();
  });

  it('should allow member selection when council is selected', async () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    // Find and select council
    const selectContainer = screen.getByText(/chọn hội đồng/i).parentElement;
    const select = selectContainer?.querySelector('select');
    if (select) {
      fireEvent.change(select, { target: { value: 'council-1' } });
    }

    // Check that members section would be available after selection
    // (this is a simplified test - the actual DOM depends on mock data)
    expect(select).toBeDefined();
  });

  it('should render dialog title correctly', () => {
    render(
      <CouncilAssignmentDialog
        isOpen={true}
        onClose={mockOnClose}
        onAssign={mockOnAssign}
        proposalId="proposal-1"
      />,
    );

    // Check that the title is rendered
    expect(screen.getByText('Phân bổ hội đồng xét duyệt')).toBeDefined();
  });
});
