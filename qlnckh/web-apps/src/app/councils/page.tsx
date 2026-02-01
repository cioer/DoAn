/**
 * Councils Management Page
 *
 * Features:
 * - List all councils with filtering by type
 * - Create new council
 * - Edit existing council
 * - Delete council
 * - View council members
 *
 * Access Control:
 * - PHONG_KHCN and ADMIN roles can access
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import {
  councilsApi,
  Council,
  EligibleMember,
} from '../../lib/api/councils';

/**
 * Council type labels
 */
const COUNCIL_TYPE_LABELS: Record<string, string> = {
  OUTLINE: 'Hội đồng xét duyệt đề cương',
  ACCEPTANCE: 'Hội đồng nghiệm thu',
  REVIEW: 'Hội đồng đánh giá',
};

/**
 * Council type badge colors
 */
const COUNCIL_TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'secondary'> = {
  OUTLINE: 'primary',
  ACCEPTANCE: 'success',
  REVIEW: 'warning',
};

/**
 * Create/Edit Council Dialog
 */
function CouncilDialog({
  isOpen,
  onClose,
  council,
  eligibleMembers,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  council: Council | null;
  eligibleMembers: EligibleMember[];
  onSave: (data: {
    name: string;
    type: string;
    secretaryId?: string;
    memberIds?: string[];
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('OUTLINE');
  const [secretaryId, setSecretaryId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (council) {
      setName(council.name);
      setType(council.type);
      setSecretaryId(council.secretaryId || '');
      setSelectedMemberIds(council.members.map((m) => m.userId));
    } else {
      setName('');
      setType('OUTLINE');
      setSecretaryId('');
      setSelectedMemberIds([]);
    }
    setError(null);
  }, [council, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tên hội đồng không được để trống');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        type,
        secretaryId: secretaryId || undefined,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra');
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {council ? 'Chỉnh sửa hội đồng' : 'Tạo hội đồng mới'}
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
              placeholder="Nhập tên hội đồng"
            />
          </div>

          {/* Council Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại hội đồng
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OUTLINE">Hội đồng xét duyệt đề cương</option>
              <option value="ACCEPTANCE">Hội đồng nghiệm thu</option>
              <option value="REVIEW">Hội đồng đánh giá</option>
            </select>
          </div>

          {/* Secretary */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thư ký hội đồng
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
          </div>

          {/* Members */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thành viên hội đồng
            </label>
            <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
              {eligibleMembers.length === 0 ? (
                <p className="p-3 text-sm text-gray-500 italic">
                  Không có thành viên phù hợp
                </p>
              ) : (
                eligibleMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {member.displayName}
                      </p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {member.role}
                    </Badge>
                  </label>
                ))
              )}
            </div>
            {selectedMemberIds.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                Đã chọn {selectedMemberIds.length} thành viên
              </p>
            )}
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
              disabled={isLoading}
            >
              {isLoading ? 'Đang lưu...' : council ? 'Cập nhật' : 'Tạo mới'}
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
  council: Council | null;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}) {
  if (!isOpen || !council) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
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
 * Main Councils Page Component
 */
export default function CouncilsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, getEffectiveUser } = useAuthStore();

  const [councils, setCouncils] = useState<Council[]>([]);
  const [eligibleMembers, setEligibleMembers] = useState<EligibleMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCouncil, setEditingCouncil] = useState<Council | null>(null);
  const [deletingCouncil, setDeletingCouncil] = useState<Council | null>(null);

  const effectiveUser = getEffectiveUser();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

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
        err.response?.data?.message || err.message || 'Không thể tải dữ liệu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCouncil = async (data: {
    name: string;
    type: string;
    secretaryId?: string;
    memberIds?: string[];
  }) => {
    setIsSaving(true);
    try {
      await councilsApi.createCouncil(data);
      setSuccessMessage('Đã tạo hội đồng thành công');
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCouncil = async (data: {
    name: string;
    type: string;
    secretaryId?: string;
    memberIds?: string[];
  }) => {
    if (!editingCouncil) return;
    setIsSaving(true);
    try {
      await councilsApi.updateCouncil(editingCouncil.id, data);
      setSuccessMessage('Đã cập nhật hội đồng thành công');
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
      await councilsApi.deleteCouncil(deletingCouncil.id);
      setSuccessMessage('Đã xóa hội đồng thành công');
      setDeletingCouncil(null);
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể xóa hội đồng');
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý hội đồng</h1>
          <p className="text-gray-600 mt-1">
            Quản lý các hội đồng xét duyệt và nghiệm thu đề tài
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
              <option value="OUTLINE">Xét duyệt đề cương</option>
              <option value="ACCEPTANCE">Nghiệm thu</option>
              <option value="REVIEW">Đánh giá</option>
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
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingCouncil(council)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCouncil(council)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Secretary */}
                {council.secretaryName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <span>Thư ký: {council.secretaryName}</span>
                  </div>
                )}

                {/* Members count */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{council.members.length} thành viên</span>
                </div>

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
        <CouncilDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          council={null}
          eligibleMembers={eligibleMembers}
          onSave={handleCreateCouncil}
          isLoading={isSaving}
        />

        {/* Edit Dialog */}
        <CouncilDialog
          isOpen={!!editingCouncil}
          onClose={() => setEditingCouncil(null)}
          council={editingCouncil}
          eligibleMembers={eligibleMembers}
          onSave={handleUpdateCouncil}
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
