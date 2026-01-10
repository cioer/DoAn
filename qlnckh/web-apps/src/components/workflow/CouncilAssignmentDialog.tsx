/**
 * Council Assignment Dialog Component (Story 5.2)
 *
 * Displays a dialog for PKHCN to assign a council to a proposal.
 * Shows council selection dropdown, secretary selection, and optional members.
 *
 * Story 5.2: AC1 - Council Assignment Dialog
 * - Select council dropdown (list of available councils)
 * - Option to "Tạo hội đồng mới" (placeholder for future)
 * - Secretary assignment (required)
 * - Members list (optional)
 * - Uses UI components (Button, Select)
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  AlertCircle,
  X,
} from 'lucide-react';
import { generateIdempotencyKey } from '../../lib/api/workflow';
import { Button } from '../ui';
import { Select, SelectOption } from '../ui';

/**
 * Council data type
 */
export interface Council {
  id: string;
  name: string;
  type: string;
  secretaryId: string | null;
  secretaryName: string | null;
  members: CouncilMember[];
}

/**
 * Council Member data type
 */
export interface CouncilMember {
  id: string;
  councilId: string;
  userId: string;
  displayName: string;
  role: string;
}

/**
 * User info for secretary selection
 */
export interface UserInfo {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

/**
 * Component props
 */
export interface CouncilAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: {
    councilId: string;
    secretaryId: string;
    memberIds?: string[];
    idempotencyKey: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
  proposalId: string;
}

/**
 * Story 5.2: AC1 - Council Assignment Dialog Component
 * - Uses UI components (Button, Select)
 */
export function CouncilAssignmentDialog({
  isOpen,
  onClose,
  onAssign,
  isSubmitting = false,
  proposalId,
}: CouncilAssignmentDialogProps) {
  const [councils, setCouncils] = useState<Council[]>([]);
  const [selectedCouncil, setSelectedCouncil] = useState<Council | null>(null);
  const [selectedSecretary, setSelectedSecretary] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch councils when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchCouncils();
    }
  }, [isOpen]);

  /**
   * Fetch available councils for dropdown (Story 5.2: AC1)
   */
  const fetchCouncils = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call when council endpoint is ready
      // const response = await apiClient.get('/api/councils?type=OUTLINE');
      // setCouncils(response.data.councils);

      // Mock data for MVP
      setCouncils([
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
            {
              id: 'member-2',
              councilId: 'council-1',
              userId: 'user-3',
              displayName: 'Lê Thị C',
              role: 'MEMBER',
            },
          ],
        },
        {
          id: 'council-2',
          name: 'Hội đồng khoa KT #1',
          type: 'OUTLINE',
          secretaryId: 'user-4',
          secretaryName: 'Phạm Văn D',
          members: [
            {
              id: 'member-3',
              councilId: 'council-2',
              userId: 'user-5',
              displayName: 'Hoàng Văn E',
              role: 'MEMBER',
            },
          ],
        },
      ]);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message: string } } } };
      setError(apiError.response?.data?.error?.message || 'Không thể tải danh sách hội đồng');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle council selection (Story 5.2: AC1)
   * Auto-selects secretary when council is selected
   */
  const handleCouncilChange = (councilId: string) => {
    const council = councils.find((c) => c.id === councilId);
    if (council) {
      setSelectedCouncil(council);
      // Auto-select secretary from council
      if (council.secretaryId) {
        setSelectedSecretary(council.secretaryId);
      }
      // Reset member selection
      setSelectedMembers([]);
    }
  };

  /**
   * Handle member toggle for multi-select (Story 5.2: AC1)
   */
  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  /**
   * Validate form before submission (Story 5.2: AC2)
   * Council and secretary are required
   */
  const isValid = selectedCouncil && selectedSecretary;

  /**
   * Handle assign council action (Story 5.2: AC2)
   */
  const handleAssign = async () => {
    if (!isValid || !selectedCouncil) return;

    setError(null);
    const idempotencyKey = generateIdempotencyKey();

    try {
      await onAssign({
        councilId: selectedCouncil.id,
        secretaryId: selectedSecretary,
        memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
        idempotencyKey,
      });
      // Reset form after successful assignment
      setSelectedCouncil(null);
      setSelectedSecretary('');
      setSelectedMembers([]);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message: string } } } };
      setError(apiError.response?.data?.error?.message || 'Không thể phân bổ hội đồng');
    }
  };

  // Build select options for councils
  const councilOptions: SelectOption[] = councils.map((c) => ({ value: c.id, label: c.name }));

  // Build select options for secretary
  const secretaryOptions: SelectOption[] = selectedCouncil?.members.map((m) => ({
    value: m.userId,
    label: `${m.displayName} (${m.role})`,
  })) || [];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="council-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2
              id="council-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Phân bổ hội đồng xét duyệt
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Chọn hội đồng và thư ký để đánh giá đề tài này
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-600">Đang tải danh sách hội đồng...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Council Selection (Story 5.2: AC1) - using Select component */}
              <Select
                label="Chọn hội đồng"
                required
                placeholder="-- Chọn hội đồng --"
                options={councilOptions}
                value={selectedCouncil?.id || ''}
                onChange={(e) => handleCouncilChange(e.target.value)}
                disabled={isSubmitting}
              />

              {/* "Tạo hội đồng mới" button (Story 5.2: AC1) - placeholder for future */}
              <button
                type="button"
                onClick={() => setError('Tính năng tạo hội đồng mới sẽ được triển khai sau')}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4" />
                Tạo hội đồng mới
              </button>

              {/* Secretary Assignment (Story 5.2: AC1) - using Select component */}
              {selectedCouncil && (
                <>
                  <Select
                    label="Thư ký hội đồng"
                    required
                    placeholder="-- Chọn thư ký --"
                    options={secretaryOptions}
                    value={selectedSecretary}
                    onChange={(e) => setSelectedSecretary(e.target.value)}
                    disabled={isSubmitting}
                    helperText={selectedCouncil.secretaryName ? `Thư ký mặc định: ${selectedCouncil.secretaryName}` : undefined}
                  />
                </>
              )}

              {/* Members Multi-select (Story 5.2: AC1 - optional) */}
              {selectedCouncil && selectedCouncil.members.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thành viên hội đồng
                    <span className="text-xs text-gray-500 ml-1">(tùy chọn)</span>
                  </label>
                  <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {selectedCouncil.members.map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.userId)}
                          onChange={() => toggleMember(member.userId)}
                          disabled={isSubmitting}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{member.displayName}</span>
                        <span className="text-xs text-gray-500">({member.role})</span>
                      </label>
                    ))}
                  </div>
                  {selectedMembers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Đã chọn: {selectedMembers.length} thành viên
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - using Button components */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            isLoading={isSubmitting}
            disabled={!isValid}
            leftIcon={<Users className="w-4 h-4" />}
          >
            Xác nhận phân bổ
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Default export for convenience
 */
export default CouncilAssignmentDialog;
