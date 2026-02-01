/**
 * Change Council Dialog Component
 *
 * Allows PHONG_KHCN to change the council assigned to a proposal
 * Use cases:
 * - Council member is unavailable
 * - Proposal needs to be reviewed by a different council
 * - Council composition needs to be updated
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { councilsApi, Council, EligibleMember } from '../../lib/api/councils';
import { Button } from '../ui/Button';

interface ChangeCouncilDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proposalId: string;
  proposalCode: string;
  currentCouncilId?: string;
  currentCouncilName?: string;
}

/**
 * Change Council Dialog Component
 */
export function ChangeCouncilDialog({
  isOpen,
  onClose,
  onSuccess,
  proposalId,
  proposalCode,
  currentCouncilId,
  currentCouncilName,
}: ChangeCouncilDialogProps) {
  const [councils, setCouncils] = useState<Council[]>([]);
  const [eligibleMembers, setEligibleMembers] = useState<EligibleMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [selectedCouncilId, setSelectedCouncilId] = useState<string>('');
  const [selectedSecretaryId, setSelectedSecretaryId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [reason, setReason] = useState<string>('');

  // Load councils and members when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Update secretary and members when council is selected
  useEffect(() => {
    const selectedCouncil = councils.find((c) => c.id === selectedCouncilId);
    if (selectedCouncil) {
      setSelectedSecretaryId(selectedCouncil.secretaryId || '');
      setSelectedMemberIds(selectedCouncil.members.map((m) => m.userId));
    } else {
      setSelectedSecretaryId('');
      setSelectedMemberIds([]);
    }
  }, [selectedCouncilId, councils]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCouncilId('');
      setSelectedSecretaryId('');
      setSelectedMemberIds([]);
      setReason('');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [councilsData, membersData] = await Promise.all([
        councilsApi.getCouncils(),
        councilsApi.getEligibleMembers(),
      ]);
      setCouncils(councilsData.councils || []);
      setEligibleMembers(membersData.members || []);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Không thể tải dữ liệu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCouncilId) {
      setError('Vui lòng chọn hội đồng mới');
      return;
    }

    if (selectedCouncilId === currentCouncilId) {
      setError('Hội đồng mới phải khác với hội đồng hiện tại');
      return;
    }

    setIsSaving(true);

    try {
      // Generate idempotency key
      const idempotencyKey = crypto.randomUUID();

      await councilsApi.changeCouncil(proposalId, {
        councilId: selectedCouncilId,
        secretaryId: selectedSecretaryId,
        memberIds: selectedMemberIds,
        reason: reason || 'Thay đổi hội đồng',
        idempotencyKey,
      });

      setSuccessMessage('Đã thay đổi hội đồng thành công');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Không thể thay đổi hội đồng';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  // Get selected council details
  const selectedCouncil = councils.find((c) => c.id === selectedCouncilId);

  if (!isOpen) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-council-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2
                id="change-council-dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                Thay đổi hội đồng xét duyệt
              </h2>
              <p className="text-sm text-gray-500">
                Đề tài: {proposalCode}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-orange-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Success message */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Current council info */}
            {currentCouncilName && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-600 mb-1">Hội đồng hiện tại:</p>
                <p className="font-medium text-gray-900">{currentCouncilName}</p>
              </div>
            )}

            {/* New council selection */}
            <div>
              <label htmlFor="council-select" className="block text-sm font-medium text-gray-700 mb-1">
                Chọn hội đồng mới <span className="text-red-500">*</span>
              </label>
              <select
                id="council-select"
                value={selectedCouncilId}
                onChange={(e) => setSelectedCouncilId(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Chọn hội đồng --</option>
                {councils
                  .filter((c) => c.id !== currentCouncilId)
                  .map((council) => (
                    <option key={council.id} value={council.id}>
                      {council.name} ({council.members.length} thành viên)
                    </option>
                  ))}
              </select>
            </div>

            {/* Selected council details */}
            {selectedCouncil && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Thông tin hội đồng mới
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Thư ký:</span>{' '}
                    <span className="font-medium">
                      {selectedCouncil.secretaryName || 'Chưa chỉ định'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Số thành viên:</span>{' '}
                    <span className="font-medium">{selectedCouncil.members.length}</span>
                  </div>
                  {selectedCouncil.members.length > 0 && (
                    <div>
                      <span className="text-gray-600">Thành viên:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCouncil.members.map((member) => (
                          <span
                            key={member.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-gray-700 border border-gray-300"
                          >
                            {member.displayName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom secretary selection (optional) */}
            <div>
              <label htmlFor="secretary-select" className="block text-sm font-medium text-gray-700 mb-1">
                Thư ký (có thể thay đổi)
              </label>
              <select
                id="secretary-select"
                value={selectedSecretaryId}
                onChange={(e) => setSelectedSecretaryId(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Chọn thư ký --</option>
                {eligibleMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Reason input */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Lý do thay đổi
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSaving}
                rows={3}
                placeholder="Nhập lý do thay đổi hội đồng..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isSaving || isLoading}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving || isLoading || !selectedCouncilId || selectedCouncilId === currentCouncilId}
            >
              {isSaving ? 'Đang lưu...' : 'Thay đổi hội đồng'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use Portal to render dialog at document.body level
  return createPortal(dialogContent, document.body);
}

export default ChangeCouncilDialog;
