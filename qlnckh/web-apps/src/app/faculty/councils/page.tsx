/**
 * Faculty Councils Management Page
 *
 * Features:
 * - List faculty councils (FACULTY_OUTLINE, FACULTY_ACCEPTANCE)
 * - Create new faculty council with validation
 * - Delete council (if not assigned to proposals)
 * - View council members and voting eligibility
 *
 * Access Control:
 * - QUAN_LY_KHOA role only
 * - Requires FACULTY_DASHBOARD_VIEW permission
 *
 * Validation Rules:
 * - Minimum 3 voting members (excluding secretary)
 * - Voting member count MUST be odd
 * - All members must belong to same faculty
 * - Secretary must be in members list
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Trash2,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  X,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import {
  facultyCouncilsApi,
  FacultyCouncil,
  FacultyEligibleMember,
} from '../../../lib/api/faculty-councils';

/**
 * Council type labels
 */
const COUNCIL_TYPE_LABELS: Record<string, string> = {
  FACULTY_OUTLINE: 'Hội đồng xét duyệt đề cương',
  FACULTY_ACCEPTANCE: 'Hội đồng nghiệm thu',
};

/**
 * Council type badge colors
 */
const COUNCIL_TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'secondary'> = {
  FACULTY_OUTLINE: 'primary',
  FACULTY_ACCEPTANCE: 'success',
};

/**
 * Validation helper - check if voting count is valid
 */
function validateVotingMembers(
  memberIds: string[],
  secretaryId: string
): { valid: boolean; votingCount: number; message?: string } {
  // Voting members = all members except secretary
  const votingCount = memberIds.filter((id) => id !== secretaryId).length;

  if (votingCount < 3) {
    return {
      valid: false,
      votingCount,
      message: `Cần ít nhất 3 thành viên bỏ phiếu (hiện có ${votingCount})`,
    };
  }

  if (votingCount % 2 === 0) {
    return {
      valid: false,
      votingCount,
      message: `Số thành viên bỏ phiếu phải là số lẻ để tránh hòa (hiện có ${votingCount})`,
    };
  }

  return { valid: true, votingCount };
}

/**
 * Create Faculty Council Dialog
 */
function CreateCouncilDialog({
  isOpen,
  onClose,
  eligibleMembers,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  eligibleMembers: FacultyEligibleMember[];
  onSave: (data: {
    name: string;
    type: 'FACULTY_OUTLINE' | 'FACULTY_ACCEPTANCE';
    secretaryId: string;
    memberIds: string[];
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'FACULTY_OUTLINE' | 'FACULTY_ACCEPTANCE'>('FACULTY_OUTLINE');
  const [secretaryId, setSecretaryId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('FACULTY_OUTLINE');
      setSecretaryId('');
      setSelectedMemberIds([]);
      setError(null);
    }
  }, [isOpen]);

  // Auto-add secretary to members when selected
  useEffect(() => {
    if (secretaryId && !selectedMemberIds.includes(secretaryId)) {
      setSelectedMemberIds((prev) => [...prev, secretaryId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only re-run when secretaryId changes, not when selectedMemberIds changes
  }, [secretaryId]);

  // Validation status
  const validation = useMemo(() => {
    if (!secretaryId) {
      return { valid: false, votingCount: 0, message: 'Chưa chọn thư ký' };
    }
    return validateVotingMembers(selectedMemberIds, secretaryId);
  }, [selectedMemberIds, secretaryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tên hội đồng không được để trống');
      return;
    }

    if (!secretaryId) {
      setError('Vui lòng chọn thư ký hội đồng');
      return;
    }

    if (!validation.valid) {
      setError(validation.message || 'Không đủ điều kiện tạo hội đồng');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        type,
        secretaryId,
        memberIds: selectedMemberIds,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra');
    }
  };

  const toggleMember = (userId: string) => {
    // Cannot remove secretary from members
    if (userId === secretaryId) return;

    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Close on backdrop click (not when clicking dialog content)
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Tạo hội đồng khoa mới
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Validation Status */}
          <div className={`mb-4 p-3 rounded-lg border ${
            validation.valid
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span className={`text-sm font-medium ${
                validation.valid ? 'text-green-700' : 'text-amber-700'
              }`}>
                {validation.valid
                  ? `Hợp lệ: ${validation.votingCount} thành viên bỏ phiếu`
                  : validation.message}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-600 ml-7">
              Yêu cầu: Tối thiểu 3 thành viên bỏ phiếu, số lượng là số lẻ
            </p>
          </div>

          {/* Council Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên hội đồng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Hội đồng xét duyệt đề cương Khoa CNTT - Đợt 1/2026"
            />
          </div>

          {/* Council Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại hội đồng
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'FACULTY_OUTLINE' | 'FACULTY_ACCEPTANCE')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FACULTY_OUTLINE">Hội đồng xét duyệt đề cương</option>
              <option value="FACULTY_ACCEPTANCE">Hội đồng nghiệm thu</option>
            </select>
          </div>

          {/* Secretary */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thư ký hội đồng <span className="text-red-500">*</span>
            </label>
            <select
              value={secretaryId}
              onChange={(e) => setSecretaryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn thư ký --</option>
              {eligibleMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} ({member.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Thư ký không tham gia bỏ phiếu, chỉ tổng hợp kết quả
            </p>
          </div>

          {/* Members */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thành viên hội đồng <span className="text-red-500">*</span>
              <span className="text-gray-500 font-normal ml-2">
                (Đã chọn: {selectedMemberIds.length}, Bỏ phiếu: {validation.votingCount})
              </span>
            </label>
            <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
              {eligibleMembers.length === 0 ? (
                <p className="p-3 text-sm text-gray-500 italic">
                  Không có giảng viên nào trong khoa
                </p>
              ) : (
                eligibleMembers.map((member) => {
                  const isSecretary = member.id === secretaryId;
                  const isSelected = selectedMemberIds.includes(member.id);

                  return (
                    <label
                      key={member.id}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                        isSecretary ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(member.id)}
                        disabled={isSecretary}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {member.displayName}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                      {isSecretary ? (
                        <Badge variant="primary" className="text-xs">
                          Thư ký
                        </Badge>
                      ) : isSelected ? (
                        <Badge variant="secondary" className="text-xs">
                          Bỏ phiếu
                        </Badge>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isLoading || !validation.valid}
            >
              {isLoading ? 'Đang tạo...' : 'Tạo hội đồng'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Delete Confirmation Dialog
 */
function DeleteConfirmDialog({
  isOpen,
  onClose,
  council,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  council: FacultyCouncil | null;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}) {
  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !council) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Xác nhận xóa hội đồng
            </h2>
          </div>
          <p className="text-gray-600 mb-6">
            Bạn có chắc chắn muốn xóa hội đồng{' '}
            <strong>{council.name}</strong>? Hành động này không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Faculty Councils Page Component
 */
export default function FacultyCouncilsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, getEffectiveUser } = useAuthStore();

  const [councils, setCouncils] = useState<FacultyCouncil[]>([]);
  const [eligibleMembers, setEligibleMembers] = useState<FacultyEligibleMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deletingCouncil, setDeletingCouncil] = useState<FacultyCouncil | null>(null);

  const effectiveUser = getEffectiveUser();
  const facultyId = effectiveUser?.facultyId;

  // Validate facultyId is a proper value (not empty, not "undefined" string, etc.)
  const isValidFacultyId = facultyId &&
    typeof facultyId === 'string' &&
    facultyId.length > 0 &&
    facultyId !== 'undefined' &&
    facultyId !== 'null';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }

    if (!isValidFacultyId) {
      console.warn('FacultyCouncilsPage: Invalid facultyId', { facultyId, effectiveUser });
      setError('Không tìm thấy thông tin khoa của bạn. Vui lòng đăng nhập lại hoặc liên hệ quản trị viên.');
      setIsLoading(false);
      return;
    }

    fetchData();
  }, [isAuthenticated, isValidFacultyId, navigate]);

  const fetchData = async () => {
    if (!isValidFacultyId || !facultyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [councilsData, membersData] = await Promise.all([
        facultyCouncilsApi.getFacultyCouncils(facultyId),
        facultyCouncilsApi.getFacultyEligibleMembers(facultyId),
      ]);
      setCouncils(councilsData.councils || []);
      setEligibleMembers(membersData.members || []);
    } catch (err: any) {
      console.error('FacultyCouncilsPage: fetchData error', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Không thể tải dữ liệu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCouncil = async (data: {
    name: string;
    type: 'FACULTY_OUTLINE' | 'FACULTY_ACCEPTANCE';
    secretaryId: string;
    memberIds: string[];
  }) => {
    setIsSaving(true);
    try {
      await facultyCouncilsApi.createFacultyCouncil(data);
      setSuccessMessage('Đã tạo hội đồng thành công');
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCouncil = async () => {
    if (!deletingCouncil) return;
    setIsSaving(true);
    try {
      await facultyCouncilsApi.deleteFacultyCouncil(deletingCouncil.id);
      setSuccessMessage('Đã xóa hội đồng thành công');
      await fetchData();
      setDeletingCouncil(null); // Close dialog after data refreshed
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Không thể xóa hội đồng'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Filter councils by type
  const filteredCouncils = filterType
    ? councils.filter((c) => c.type === filterType)
    : councils;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-2"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/faculty')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý hội đồng khoa</h1>
          <p className="text-gray-600 mt-1">
            Tạo và quản lý các hội đồng xét duyệt, nghiệm thu đề tài của khoa
          </p>
        </div>

        {/* Success message */}
        {successMessage && (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Info card */}
        <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Quy định tạo hội đồng:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Tối thiểu 3 thành viên bỏ phiếu (không tính thư ký)</li>
                <li>Số thành viên bỏ phiếu phải là số lẻ để tránh hòa phiếu</li>
                <li>Thư ký chỉ tổng hợp kết quả, không tham gia bỏ phiếu</li>
                <li>Tất cả thành viên phải thuộc cùng khoa</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Actions bar */}
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {filteredCouncils.length} hội đồng
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả loại</option>
              <option value="FACULTY_OUTLINE">Xét duyệt đề cương</option>
              <option value="FACULTY_ACCEPTANCE">Nghiệm thu</option>
            </select>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCreateDialogOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo hội đồng
          </Button>
        </div>

        {/* Councils grid */}
        {filteredCouncils.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 mb-4">Chưa có hội đồng nào</p>
            <Button
              variant="primary"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Tạo hội đồng đầu tiên
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCouncils.map((council) => (
              <Card
                key={council.id}
                className="p-4 hover:shadow-lg transition-all border"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {council.name}
                    </h3>
                    <Badge
                      variant={COUNCIL_TYPE_COLORS[council.type] || 'secondary'}
                      className="mt-1"
                    >
                      {COUNCIL_TYPE_LABELS[council.type] || council.type}
                    </Badge>
                  </div>
                  <button
                    onClick={() => setDeletingCouncil(council)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Secretary */}
                {council.secretaryName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <span>Thư ký: {council.secretaryName}</span>
                  </div>
                )}

                {/* Members count */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {council.members.length} thành viên ({council.votingMemberCount} bỏ phiếu)
                  </span>
                </div>

                {/* Voting validation */}
                {council.votingMemberCount < 3 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Chưa đủ thành viên bỏ phiếu</span>
                  </div>
                ) : council.votingMemberCount % 2 === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Số bỏ phiếu chẵn - có thể hòa</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hợp lệ</span>
                  </div>
                )}

                {/* Members list preview */}
                {council.members.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {council.members.slice(0, 3).map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {member.displayName}
                        </span>
                      ))}
                      {council.members.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                          +{council.members.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <CreateCouncilDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          eligibleMembers={eligibleMembers}
          onSave={handleCreateCouncil}
          isLoading={isSaving}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={!!deletingCouncil}
          onClose={() => setDeletingCouncil(null)}
          council={deletingCouncil}
          onConfirm={handleDeleteCouncil}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
}
