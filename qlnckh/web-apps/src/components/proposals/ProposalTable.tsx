import { useNavigate } from 'react-router-dom';
import { ProjectState } from '../../lib/constants/states';
import { StateBadge } from './StateBadge';
import { Button } from '../ui';
import { Eye, Edit2 } from 'lucide-react';

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

interface ProposalTableProps {
  proposals: ProposalSummary[];
  isLoading?: boolean;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
      <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-center p-4 bg-white rounded-xl border border-gray-100">
          <div className="h-4 bg-gray-100 rounded w-24 mr-8"></div>
          <div className="h-4 bg-gray-100 rounded flex-1 mr-8"></div>
          <div className="h-6 bg-gray-100 rounded-full w-24"></div>
        </div>
      ))}
    </div>
  );
}

export function ProposalTable({ proposals, isLoading }: ProposalTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (proposals.length === 0) {
    return <EmptyState message="Không có đề tài nào" />;
  }

  return (
    <div className="card overflow-hidden !rounded-2xl !border-gray-100">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mã số
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tên đề tài
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Người tạo
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Đơn vị
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {proposals.map((proposal) => (
              <tr
                key={proposal.id}
                className="group hover:bg-primary-50/30 transition-colors duration-150 cursor-pointer"
                onClick={() => navigate(`/proposals/${proposal.id}`)}
              >
                <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">
                  <span className="font-mono text-primary-600 bg-primary-50 px-2 py-1 rounded-md text-xs">
                    {proposal.code}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-gray-700 max-w-xs font-medium">
                  <div className="line-clamp-2 md:line-clamp-1">
                    {proposal.title}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <StateBadge state={proposal.state as ProjectState} />
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-white text-[10px] flex items-center justify-center font-bold">
                      {proposal.owner?.displayName?.charAt(0) || 'U'}
                    </div>
                    {proposal.owner?.displayName || '-'}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                  {proposal.faculty?.name || '-'}
                </td>
                <td
                  className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      title="Xem chi tiết"
                    >
                      <Eye size={16} className="text-gray-500" />
                    </Button>

                    {proposal.state === ProjectState.DRAFT && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                        title="Chỉnh sửa"
                        className="hover:bg-primary-50 hover:text-primary-600"
                      >
                        <Edit2 size={16} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
