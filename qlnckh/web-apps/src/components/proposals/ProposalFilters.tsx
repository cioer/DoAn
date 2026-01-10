import { ProjectState } from '../../lib/constants/states';

/**
 * Filter options
 */
export interface ProposalFilters {
  state: ProjectState | '';
  facultyId: string;
  search: string;
}

/**
 * ProposalFilters Props
 */
interface ProposalFilterProps {
  filters: ProposalFilters;
  onFiltersChange: (filters: ProposalFilters) => void;
  faculties?: Array<{ id: string; name: string }>;
}

/**
 * State options for dropdown
 */
const stateOptions: Array<{ value: ProjectState | ''; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: ProjectState.DRAFT, label: 'Nháp' },
  { value: ProjectState.FACULTY_REVIEW, label: 'Thẩm duyệt Khoa' },
  { value: ProjectState.SCHOOL_SELECTION_REVIEW, label: 'Chọn Hội đồng' },
  { value: ProjectState.OUTLINE_COUNCIL_REVIEW, label: 'Thẩm duyệt Hội đồng' },
  { value: ProjectState.CHANGES_REQUESTED, label: 'Cần sửa đổi' },
  { value: ProjectState.APPROVED, label: 'Đã duyệt' },
  { value: ProjectState.IN_PROGRESS, label: 'Đang thực hiện' },
  { value: ProjectState.FACULTY_ACCEPTANCE_REVIEW, label: 'Nghiệm thu Khoa' },
  { value: ProjectState.SCHOOL_ACCEPTANCE_REVIEW, label: 'Nghiệm thu Trường' },
  { value: ProjectState.HANDOVER, label: 'Bàn giao' },
  { value: ProjectState.COMPLETED, label: 'Hoàn thành' },
  { value: ProjectState.CANCELLED, label: 'Đã hủy' },
  { value: ProjectState.WITHDRAWN, label: 'Đã rút' },
  { value: ProjectState.REJECTED, label: 'Từ chối' },
  { value: ProjectState.PAUSED, label: 'Tạm dừng' },
];

/**
 * ProposalFilters Component
 *
 * Provides filter controls for the proposal list
 * - Search by code or title
 * - Filter by state
 * - Filter by faculty
 */
export function ProposalFilters({ filters, onFiltersChange, faculties = [] }: ProposalFilterProps) {
  const updateFilter = (key: keyof ProposalFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({ state: '', facultyId: '', search: '' });
  };

  const hasActiveFilters = filters.state || filters.facultyId || filters.search;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Tìm kiếm
          </label>
          <input
            id="search"
            type="text"
            placeholder="Mã số hoặc tên đề tài..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* State Filter */}
          <div>
            <label htmlFor="state-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              id="state-filter"
              value={filters.state}
              onChange={(e) => updateFilter('state', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {stateOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Filter */}
          <div>
            <label htmlFor="faculty-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Đơn vị
            </label>
            <select
              id="faculty-filter"
              value={filters.facultyId}
              onChange={(e) => updateFilter('facultyId', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả đơn vị</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
