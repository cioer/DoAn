import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { proposalsApi, type ProposalListParams } from '../../lib/api/proposals';
import { exportsApi } from '../../lib/api/exports';
import { useAuthStore } from '../../stores/authStore';
import { Permission } from '../../shared/types/permissions';
import { ProposalTable, type ProposalSummary } from '../../components/proposals/ProposalTable';
import { ProposalFilters, type ProposalFilters as FilterType } from '../../components/proposals/ProposalFilters';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogBody, DialogFooter } from '../../components/ui/Dialog';
import { Select, SelectOption } from '../../components/ui/Select';

/**
 * Proposal List Page
 *
 * Story 11.3: Proposal Listing Page
 * Story 8.3: Export Excel per Filter
 *
 * Displays:
 * - Search and filters
 * - Paginated list of proposals
 * - Create proposal button (for permitted users)
 * - Export to Excel button
 */

const stateOptions: SelectOption[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'FACULTY_COUNCIL_OUTLINE_REVIEW', label: 'Đang xét (Khoa)' },
  { value: 'SCHOOL_COUNCIL_OUTLINE_REVIEW', label: 'Đang xét (Trường)' },
  { value: 'SCHOOL_COUNCIL_OUTLINE_REVIEW', label: 'Đang xét (Hội đồng)' },
  { value: 'CHANGES_REQUESTED', label: 'Yêu cầu sửa' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'FACULTY_COUNCIL_ACCEPTANCE_REVIEW', label: 'Nghiệm thu (Khoa)' },
  { value: 'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW', label: 'Nghiệm thu (Trường)' },
  { value: 'HANDOVER', label: 'Bàn giao' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'PAUSED', label: 'Tạm dừng' },
];

export default function ProposalsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission, user } = useAuthStore();

  // State
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportState, setExportState] = useState('');

  // Check if user can create proposals
  const canCreate = hasPermission(Permission.PROPOSAL_CREATE);

  // Filters - initialize from URL params on first render
  const [filters, setFilters] = useState<FilterType>(() => {
    const stateParam = searchParams.get('state');
    const facultyIdParam = searchParams.get('facultyId');
    const overdueParam = searchParams.get('overdue');
    return {
      state: stateParam || '',
      facultyId: facultyIdParam || '',
      search: '',
      overdue: overdueParam === 'true',
    };
  });

  // Update filters when URL params change (e.g., when navigating from dashboard)
  useEffect(() => {
    const stateParam = searchParams.get('state');
    const facultyIdParam = searchParams.get('facultyId');
    const overdueParam = searchParams.get('overdue');
    if (stateParam || facultyIdParam || overdueParam) {
      setFilters({
        state: stateParam || '',
        facultyId: facultyIdParam || '',
        search: '',
        overdue: overdueParam === 'true',
      });
    }
  }, [searchParams]);

  // Load proposals
  useEffect(() => {
    loadProposals();
  }, [page, filters]);

  const loadProposals = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params: ProposalListParams = {
        page,
        limit: pageSize,
      };

      if (filters.state) params.state = filters.state;
      if (filters.facultyId) params.facultyId = filters.facultyId;
      if (filters.search) params.ownerId = filters.search; // Backend uses ownerId for search
      if (filters.overdue) params.overdue = true;

      const response = await proposalsApi.getProposals(params);

      setProposals(response.data);
      setTotalCount(response.meta.total);
    } catch (err: any) {
      console.error('Failed to load proposals:', err);
      setError('Không thể tải danh sách đề tài');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Handle export
  const handleExportClick = () => {
    setExportState(filters.state);
    setShowExportDialog(true);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const exportFilters: { state?: string } = {};
      if (exportState) exportFilters.state = exportState;

      await exportsApi.downloadExport(
        { filters: exportFilters },
        `danh-sach-de-tai-${new Date().toISOString().split('T')[0]}.xlsx`
      );
      setShowExportDialog(false);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError('Không thể xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Đề tài nghiên cứu</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Danh sách các đề tài nghiên cứu khoa học</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Export button */}
            <Button
              variant="secondary"
              onClick={handleExportClick}
              leftIcon={<Download className="h-4 w-4 sm:h-5 sm:w-5" />}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Xuất Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>

            {canCreate && (
              <Button
                variant="primary"
                onClick={() => navigate('/proposals/new')}
                leftIcon={<Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Tạo đề tài mới</span>
                <span className="sm:hidden">Tạo mới</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <ProposalFilters
            filters={filters}
            onFiltersChange={(newFilters) => setFilters(newFilters)}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Proposals table */}
        <div className="bg-white rounded-lg shadow">
          <ProposalTable proposals={proposals} isLoading={isLoading} />

          {/* Pagination */}
          {!isLoading && proposals.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                <span className="hidden sm:inline">Hiển thị </span>
                {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)}
                <span className="hidden sm:inline"> trong số</span>
                <span className="sm:hidden">/</span> {totalCount}
                <span className="hidden sm:inline"> đề tài</span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] min-w-[44px]"
                >
                  Trước
                </button>

                <span className="text-sm text-gray-700 px-2">
                  {page} / {totalPages}
                </span>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] min-w-[44px]"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        title="Xuất danh sách đề tài ra Excel"
        size="md"
      >
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Chọn trạng thái để lọc trước khi xuất. Nếu không chọn, tất cả đề tài sẽ được xuất.
            </p>

            <Select
              label="Trạng thái"
              options={stateOptions}
              value={exportState}
              onChange={(e) => setExportState(e.target.value)}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                File Excel sẽ chứa thông tin chi tiết về các đề tài theo trạng thái đã chọn.
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setShowExportDialog(false)}
            disabled={isExporting}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            isLoading={isExporting}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Xuất Excel
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
