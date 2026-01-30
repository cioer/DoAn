import { ProjectState } from '../../lib/constants/states';

/**
 * State Badge Props
 */
interface StateBadgeProps {
  state: ProjectState;
}

/**
 * State badge colors mapping
 * Maps each project state to its corresponding Tailwind CSS classes
 */
const stateStyles: Record<ProjectState, string> = {
  [ProjectState.DRAFT]: 'bg-gray-100 text-gray-800',
  [ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW]: 'bg-blue-100 text-blue-800',
  [ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW]: 'bg-purple-100 text-purple-800',
  [ProjectState.CHANGES_REQUESTED]: 'bg-orange-100 text-orange-800',
  [ProjectState.APPROVED]: 'bg-green-100 text-green-800',
  [ProjectState.IN_PROGRESS]: 'bg-teal-100 text-teal-800',
  [ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW]: 'bg-cyan-100 text-cyan-800',
  [ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW]: 'bg-sky-100 text-sky-800',
  [ProjectState.HANDOVER]: 'bg-amber-100 text-amber-800',
  [ProjectState.COMPLETED]: 'bg-green-100 text-green-800',
  [ProjectState.CANCELLED]: 'bg-gray-100 text-gray-800',
  [ProjectState.WITHDRAWN]: 'bg-gray-100 text-gray-800',
  [ProjectState.REJECTED]: 'bg-red-100 text-red-800',
  [ProjectState.PAUSED]: 'bg-yellow-100 text-yellow-800',
};

/**
 * State display names in Vietnamese
 */
const stateNames: Record<ProjectState, string> = {
  [ProjectState.DRAFT]: 'Nháp',
  [ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW]: 'Hội đồng Khoa - Đề cương',
  [ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW]: 'Hội đồng Trường - Đề cương',
  [ProjectState.CHANGES_REQUESTED]: 'Yêu cầu sửa',
  [ProjectState.APPROVED]: 'Đã duyệt',
  [ProjectState.IN_PROGRESS]: 'Đang thực hiện',
  [ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW]: 'Hội đồng Khoa - Nghiệm thu',
  [ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW]: 'Hội đồng Trường - Nghiệm thu',
  [ProjectState.HANDOVER]: 'Bàn giao',
  [ProjectState.COMPLETED]: 'Đã hoàn thành',
  [ProjectState.CANCELLED]: 'Đã hủy',
  [ProjectState.WITHDRAWN]: 'Đã rút',
  [ProjectState.REJECTED]: 'Từ chối',
  [ProjectState.PAUSED]: 'Tạm dừng',
};

/**
 * StateBadge Component
 *
 * Displays a colored badge for proposal states
 * Used in proposal lists and detail views
 */
export function StateBadge({ state }: StateBadgeProps) {
  const style = stateStyles[state] || 'bg-gray-100 text-gray-800';
  const displayName = stateNames[state] || state;

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}
      title={state}
    >
      {displayName}
    </span>
  );
}
