import { useNavigate } from 'react-router-dom';
import { ProjectState } from '../../lib/constants/states';
import { StateBadge } from './StateBadge';

/**
 * Proposal summary for list view
 */
export interface ProposalSummary {
  id: string;
  code: string;
  title: string;
  state: ProjectState;
  owner?: {
    id: string;
    displayName: string;
  } | null;
  faculty?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

/**
 * ProposalTable Props
 */
interface ProposalTableProps {
  proposals: ProposalSummary[];
  isLoading?: boolean;
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * ProposalTable Component
 *
 * Displays a table of proposals with:
 * - Code, Title, State badge, Holder, Faculty
 * - View and Edit actions (Edit only for DRAFT proposals)
 */
export function ProposalTable({ proposals, isLoading }: ProposalTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (proposals.length === 0) {
    return <EmptyState message="Không có đề tài nào" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mã số
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tên đề tài
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trạng thái
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Người tạo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Đơn vị
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {proposals.map((proposal) => (
            <tr
              key={proposal.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/proposals/${proposal.id}`)}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {proposal.code}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                {proposal.title}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StateBadge state={proposal.state as ProjectState} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {proposal.owner?.displayName || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {proposal.faculty?.name || '-'}
              </td>
              <td
                className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => navigate(`/proposals/${proposal.id}`)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Xem
                </button>
                {proposal.state === ProjectState.DRAFT && (
                  <button
                    onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Sửa
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
