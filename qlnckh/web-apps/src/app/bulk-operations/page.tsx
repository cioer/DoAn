import { useState, useEffect, useMemo } from 'react';
import { Users, CheckSquare, Send, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { proposalsApi, Proposal } from '../../lib/api/proposals';
import { bulkOperationsApi } from '../../lib/api/bulk-operations';
import { usersApi } from '../../lib/api/users';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../../components/ui/Dialog';
import { Select, SelectOption } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Alert } from '../../components/ui/Alert';
import type { UserListItem } from '../../shared/types/users';

/**
 * Bulk Operations Page (Tác vụ bulk trên đề tài)
 *
 * Story 8.1: Bulk Assign Holder User
 * Story 8.2: Bulk Remind with Preview
 *
 * Features:
 * - Select multiple proposals
 * - Bulk assign holder_user with preview
 * - Bulk send reminders with preview
 *
 * For PHONG_KHCN role
 */

const stateOptions: SelectOption[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'FACULTY_REVIEW', label: 'Đang xét (Khoa)' },
  { value: 'SCHOOL_SELECTION_REVIEW', label: 'Đang xét (Trường)' },
  { value: 'OUTLINE_COUNCIL_REVIEW', label: 'Đang xét (Hội đồng)' },
  { value: 'CHANGES_REQUESTED', label: 'Yêu cầu sửa' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
];

const roleOptions: SelectOption[] = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'GIANG_VIEN', label: 'Giảng viên' },
  { value: 'QUAN_LY_KHOA', label: 'Quản lý Khoa' },
  { value: 'THU_KY_KHOA', label: 'Thư ký Khoa' },
  { value: 'THU_KY_HOI_DONG', label: 'Thư ký Hội đồng' },
  { value: 'PHONG_KHCN', label: 'Phòng KHCN' },
];

type OperationType = 'assign' | 'remind' | null;

interface PreviewProposal {
  id: string;
  code: string;
  title: string;
  state: string;
  currentHolder?: string;
  canAssign: boolean;
  reason?: string;
}

interface BulkPreviewResult {
  total: number;
  valid: number;
  invalid: number;
  proposals: PreviewProposal[];
  targetUser?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

interface BulkResult {
  success: number;
  failed: number;
  results: Array<{
    proposalId: string;
    proposalCode: string;
    success: boolean;
    error?: string;
  }>;
}

export default function BulkOperationsPage() {
  const { user } = useAuthStore();

  // State
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterState, setFilterState] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRemindDialog, setShowRemindDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // Assign operation
  const [targetUserId, setTargetUserId] = useState('');
  const [previewData, setPreviewData] = useState<BulkPreviewResult | null>(null);
  const [operationResult, setOperationResult] = useState<BulkResult | null>(null);
  const [currentOperation, setCurrentOperation] = useState<OperationType>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Users for dropdown
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Load proposals
  useEffect(() => {
    loadProposals();
    // Load users in background - don't block page load
    loadUsers().catch(() => {});
  }, []);

  // Load users for assign dropdown (non-blocking)
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await usersApi.getUsers({ limit: 100 });
      setUsers(result.users);
    } catch (err) {
      console.error('Failed to load users:', err);
      // Don't block the page if users fail to load
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadProposals = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params: { state?: string; page: number; limit: number } = {
        page: 1,
        limit: 100,
      };
      if (filterState) params.state = filterState;

      const response = await proposalsApi.getProposals(params);
      setProposals(response.data);
    } catch (err: any) {
      console.error('Failed to load proposals:', err);
      setError('Không thể tải danh sách đề tài');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter proposals based on search and role
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesSearch = !searchQuery ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ownerId.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by role if selected (check if owner has that role)
      // This is a simplified check - in real app we'd fetch owner details
      const matchesRole = !filterRole || true; // Placeholder for role filtering

      return matchesSearch && matchesRole;
    });
  }, [proposals, searchQuery, filterRole]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredProposals.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle select individual
  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Check if all visible are selected
  const allSelected = filteredProposals.length > 0 &&
    filteredProposals.every((p) => selectedIds.has(p.id));

  // Check if some (but not all) are selected
  const someSelected = selectedIds.size > 0 && !allSelected;

  // User options for assign dropdown
  const userOptions: SelectOption[] = useMemo(() => {
    return users.map((u) => ({
      value: u.id,
      label: `${u.displayName} (${u.email}) - ${u.role}`,
    }));
  }, [users]);

  // Open assign dialog
  const openAssignDialog = () => {
    if (selectedIds.size === 0) return;
    setTargetUserId('');
    setCurrentOperation('assign');
    setShowAssignDialog(true);
  };

  // Open remind dialog
  const openRemindDialog = () => {
    if (selectedIds.size === 0) return;
    setCurrentOperation('remind');
    setShowRemindDialog(true);
  };

  // Preview bulk assign
  const handlePreviewAssign = async () => {
    if (!targetUserId) return;

    setIsProcessing(true);
    setPreviewData(null);

    try {
      const selectedArray = Array.from(selectedIds);
      const result = await bulkOperationsApi.bulkAssignPreview({
        proposalIds: selectedArray,
        userId: targetUserId,
      });
      setPreviewData(result);
      setShowAssignDialog(false);
      setShowPreviewDialog(true);
    } catch (err: any) {
      console.error('Preview failed:', err);
      setError(err.response?.data?.error?.message || 'Không thể xem trước thao tác');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview bulk remind
  const handlePreviewRemind = async () => {
    setIsProcessing(true);
    setPreviewData(null);

    try {
      const selectedArray = Array.from(selectedIds);
      // Use remind preview endpoint
      const result = await bulkOperationsApi.bulkRemindPreview({
        proposalIds: selectedArray,
      });
      // Map remind preview result to our format
      setPreviewData({
        total: result.results.length,
        valid: result.success,
        invalid: result.failed,
        proposals: result.results.map((r) => ({
          id: r.proposalId,
          code: r.proposalCode,
          title: r.proposalCode,
          state: '',
          canAssign: r.emailSent,
          reason: r.error,
        })),
      });
      setShowRemindDialog(false);
      setShowPreviewDialog(true);
    } catch (err: any) {
      console.error('Preview failed:', err);
      setError(err.response?.data?.error?.message || 'Không thể xem trước thao tác');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute bulk operation
  const handleExecute = async () => {
    setIsProcessing(true);
    setOperationResult(null);

    try {
      const selectedArray = Array.from(selectedIds);

      if (currentOperation === 'assign') {
        const idempotencyKey = `bulk-assign-${Date.now()}`;
        const result = await bulkOperationsApi.bulkAssign({
          proposalIds: selectedArray,
          userId: targetUserId,
          idempotencyKey,
        });
        setOperationResult(result);
      } else if (currentOperation === 'remind') {
        const idempotencyKey = `bulk-remind-${Date.now()}`;
        const result = await bulkOperationsApi.bulkRemind({
          proposalIds: selectedArray,
          idempotencyKey,
        });
        setOperationResult({
          success: result.success,
          failed: result.failed,
          results: result.results.map((r) => ({
            proposalId: r.proposalId,
            proposalCode: r.proposalCode,
            success: r.emailSent,
            error: r.error,
          })),
        });
      }

      setShowPreviewDialog(false);
      setShowResultDialog(true);
      setSelectedIds(new Set());
      await loadProposals();
    } catch (err: any) {
      console.error('Operation failed:', err);
      setError(err.response?.data?.error?.message || 'Thao tác không thành công');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format state for display
  const formatState = (state: string) => {
    const stateMap: Record<string, string> = {
      DRAFT: 'Nháp',
      FACULTY_REVIEW: 'Thẩm duyệt Khoa',
      SCHOOL_SELECTION_REVIEW: 'Thẩm duyệt Phòng',
      OUTLINE_COUNCIL_REVIEW: 'Thẩm duyệt Hội đồng',
      CHANGES_REQUESTED: 'Yêu cầu sửa',
      APPROVED: 'Đã duyệt',
      IN_PROGRESS: 'Đang thực hiện',
      PAUSED: 'Tạm dừng',
      COMPLETED: 'Đã hoàn thành',
      CANCELLED: 'Đã hủy',
      REJECTED: 'Đã từ chối',
      WITHDRAWN: 'Đã rút',
    };
    return stateMap[state] || state;
  };

  const selectedCount = selectedIds.size;
  const selectedProposals = proposals.filter((p) => selectedIds.has(p.id));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7" />
            Tác vụ hàng loạt
          </h1>
          <p className="text-gray-600 mt-1">Phân công người xử lý và gửi nhắc nhở cho nhiều đề tài</p>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Selection Summary Bar */}
        {selectedCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-medium">
                Đã chọn {selectedCount} đề tài
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={openAssignDialog}
                leftIcon={<Users className="h-4 w-4" />}
              >
                Phân công người xử lý
              </Button>
              <Button
                variant="warning"
                onClick={openRemindDialog}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Gửi nhắc nhở
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-full sm:w-auto flex-1 min-w-[200px]">
              <Input
                placeholder="Tìm kiếm theo mã, tên đề tài..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto flex-1 min-w-[200px]">
              <Select
                label="Trạng thái"
                options={stateOptions}
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto flex-1 min-w-[200px]">
              <Select
                label="Vai trò chủ nhiệm"
                options={roleOptions}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Proposals table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              Đang tải danh sách đề tài...
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">Không tìm thấy đề tài</p>
              <p className="text-sm mt-1">Thử thay đổi bộ lọc tìm kiếm</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-12">
                      <Checkbox
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã đề tài
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người xử lý hiện tại
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className={selectedIds.has(proposal.id) ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}
                    >
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedIds.has(proposal.id)}
                          onChange={(e) => handleSelect(proposal.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {proposal.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {proposal.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          proposal.state === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                          proposal.state === 'APPROVED' || proposal.state === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                          proposal.state === 'CHANGES_REQUESTED' ? 'bg-orange-100 text-orange-800' :
                          proposal.state === 'REJECTED' || proposal.state === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {formatState(proposal.state)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {proposal.holderUser || proposal.ownerId || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assign Dialog */}
        <Dialog
          isOpen={showAssignDialog}
          onClose={() => setShowAssignDialog(false)}
          title={`Phân công người xử lý cho ${selectedCount} đề tài`}
          size="md"
        >
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn người xử lý <span className="text-red-500">*</span>
                </label>
                {isLoadingUsers ? (
                  <div className="text-sm text-gray-500">Đang tải danh sách người dùng...</div>
                ) : (
                  <Select
                    placeholder="Chọn người dùng"
                    options={userOptions}
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                  />
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>{selectedCount}</strong> đề tài sẽ được phân công cho người dùng được chọn.
                </p>
              </div>

              {selectedProposals.slice(0, 3).map((p) => (
                <div key={p.id} className="text-sm text-gray-600 flex justify-between">
                  <span>{p.code}</span>
                  <span className="text-gray-400">{formatState(p.state)}</span>
                </div>
              ))}
              {selectedCount > 3 && (
                <p className="text-sm text-gray-500">...và {selectedCount - 3} đề tài khác</p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowAssignDialog(false)}
              disabled={isProcessing}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handlePreviewAssign}
              isLoading={isProcessing}
              disabled={!targetUserId}
              leftIcon={<Eye className="h-4 w-4" />}
            >
              Xem trước
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Remind Dialog */}
        <Dialog
          isOpen={showRemindDialog}
          onClose={() => setShowRemindDialog(false)}
          title={`Gửi nhắc nhở cho ${selectedCount} đề tài`}
          size="md"
        >
          <DialogBody>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Email nhắc nhở sẽ được gửi đến người xử lý của các đề tài đã chọn.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Số lượng: <strong>{selectedCount}</strong> đề tài
                </p>
              </div>

              {selectedProposals.slice(0, 3).map((p) => (
                <div key={p.id} className="text-sm text-gray-600 flex justify-between">
                  <span>{p.code}</span>
                  <span className="text-gray-400">{p.holderUser || p.ownerId}</span>
                </div>
              ))}
              {selectedCount > 3 && (
                <p className="text-sm text-gray-500">...và {selectedCount - 3} đề tài khác</p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowRemindDialog(false)}
              disabled={isProcessing}
            >
              Hủy
            </Button>
            <Button
              variant="warning"
              onClick={handlePreviewRemind}
              isLoading={isProcessing}
              leftIcon={<Eye className="h-4 w-4" />}
            >
              Xem trước
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog
          isOpen={showPreviewDialog}
          onClose={() => setShowPreviewDialog(false)}
          title={currentOperation === 'assign' ? 'Xem trước phân công' : 'Xem trước nhắc nhở'}
          size="lg"
        >
          <DialogBody>
            {!previewData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{previewData.valid}</p>
                    <p className="text-sm text-green-700">Thực hiện được</p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{previewData.invalid}</p>
                    <p className="text-sm text-red-700">Không thể thực hiện</p>
                  </div>
                </div>

                {/* Target user for assign */}
                {currentOperation === 'assign' && previewData.targetUser && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800">Người được phân công:</p>
                    <p className="text-lg font-bold text-blue-900">
                      {previewData.targetUser.displayName} ({previewData.targetUser.role})
                    </p>
                    <p className="text-sm text-blue-700">{previewData.targetUser.email}</p>
                  </div>
                )}

                {/* Proposal list */}
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã đề tài</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.proposals.map((p) => (
                        <tr key={p.id} className={p.canAssign ? '' : 'bg-red-50'}>
                          <td className="px-4 py-2 text-sm">{p.code}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{p.currentHolder || '-'}</td>
                          <td className="px-4 py-2 text-sm">
                            {p.canAssign ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                OK
                              </span>
                            ) : (
                              <span className="flex items-center text-red-600" title={p.reason}>
                                <XCircle className="w-4 h-4 mr-1" />
                                {p.reason || 'Không thể thực hiện'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowPreviewDialog(false)}
              disabled={isProcessing}
            >
              Hủy
            </Button>
            <Button
              variant={currentOperation === 'assign' ? 'primary' : 'warning'}
              onClick={handleExecute}
              isLoading={isProcessing}
              disabled={!previewData || previewData.valid === 0}
            >
              Thực hiện ({previewData?.valid || 0} đề tài)
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Result Dialog */}
        <Dialog
          isOpen={showResultDialog}
          onClose={() => {
            setShowResultDialog(false);
            setOperationResult(null);
          }}
          title="Kết quả thao tác"
          size="md"
        >
          <DialogBody>
            {!operationResult ? null : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{operationResult.success}</p>
                    <p className="text-sm text-green-700">Thành công</p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-lg p-4 text-center">
                    <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{operationResult.failed}</p>
                    <p className="text-sm text-red-700">Thất bại</p>
                  </div>
                </div>

                {/* Failed items */}
                {operationResult.failed > 0 && (
                  <div className="border border-red-200 rounded-lg p-4">
                    <p className="font-medium text-red-800 mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Các đề tài thất bại:
                    </p>
                    <ul className="space-y-1">
                      {operationResult.results
                        .filter((r) => !r.success)
                        .map((r) => (
                          <li key={r.proposalId} className="text-sm text-red-700">
                            {r.proposalCode}: {r.error || 'Lỗi không xác định'}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {operationResult.failed === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">Tất cả thao tác thành công!</p>
                  </div>
                )}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="primary"
              onClick={() => {
                setShowResultDialog(false);
                setOperationResult(null);
              }}
            >
              Đóng
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}
