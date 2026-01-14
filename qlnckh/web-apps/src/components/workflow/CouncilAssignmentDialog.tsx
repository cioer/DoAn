/**
 * Council Assignment Dialog Component (Story 5.2) - Modern Soft UI
 *
 * Displays a dialog for PKHCN to assign a council to a proposal.
 * Shows council selection dropdown, secretary selection, and optional members.
 *
 * Story 5.2: AC1 - Council Assignment Dialog
 * - Select council dropdown (list of available councils)
 * - Option to "Tạo hội đồng mới" (placeholder for future)
 * - Secretary assignment (required)
 * - Members list (optional)
 * - Uses UI components (Button, Select, Dialog, Alert)
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
} from 'lucide-react';
import { generateIdempotencyKey } from '../../lib/api/workflow';
import { Button, Dialog, DialogFooter, Alert, Select, SelectOption } from '../ui';
import { councilsApi } from '../../lib/api/councils';

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
      // Fetch councils from API (only OUTLINE type for council assignment)
      const response = await councilsApi.getCouncils('OUTLINE');
      setCouncils(response.councils);
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Phân bổ hội đồng xét duyệt"
      description="Chọn hội đồng và thư ký để đánh giá đề tài này"
      size="lg"
      showCloseButton={!isSubmitting}
      footer={
        <DialogFooter>
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
        </DialogFooter>
      }
    >
      {/* Error message */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-gray-600 font-medium">Đang tải danh sách hội đồng...</span>
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
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium mt-2"
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
                className="mt-4"
              />
            </>
          )}

          {/* Members Multi-select (Story 5.2: AC1 - optional) */}
          {selectedCouncil && selectedCouncil.members.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Thành viên hội đồng
                <span className="text-xs text-gray-500 ml-1">(tùy chọn)</span>
              </label>
              <div className="space-y-2 border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto shadow-inner">
                {selectedCouncil.members.map((member) => (
                  <label
                    key={member.userId}
                    className="flex items-center gap-2 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.userId)}
                      onChange={() => toggleMember(member.userId)}
                      disabled={isSubmitting}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                    />
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{member.displayName}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">({member.role})</span>
                  </label>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Đã chọn: <span className="font-semibold text-gray-700">{selectedMembers.length}</span> thành viên
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

/**
 * Default export for convenience
 */
export default CouncilAssignmentDialog;
