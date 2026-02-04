import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectState } from '../../lib/constants/states';
import { StateBadge } from './StateBadge';
import { Button } from '../ui';
import { Eye, Edit2, User, Building2, ChevronRight } from 'lucide-react';
import type { ProposalSummary } from './ProposalTable';

interface ProposalCardProps {
  proposal: ProposalSummary;
  onNavigate?: (path: string) => void;
}

/**
 * ProposalCard Component - Mobile-friendly card view for proposals
 *
 * Displays proposal information in a card format optimized for mobile:
 * - Touch-friendly tap targets (min 44x44px)
 * - Clear visual hierarchy
 * - Action buttons with proper spacing
 */
export const ProposalCard = memo(function ProposalCard({ proposal, onNavigate }: ProposalCardProps) {
  const navigate = useNavigate();
  const handleNavigate = onNavigate || navigate;

  const handleCardClick = useCallback(() => {
    handleNavigate(`/proposals/${proposal.id}`);
  }, [handleNavigate, proposal.id]);

  const handleViewClick = useCallback(() => {
    handleNavigate(`/proposals/${proposal.id}`);
  }, [handleNavigate, proposal.id]);

  const handleEditClick = useCallback(() => {
    handleNavigate(`/proposals/${proposal.id}/edit`);
  }, [handleNavigate, proposal.id]);

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-soft p-4 active:bg-gray-50 transition-colors"
      onClick={handleCardClick}
    >
      {/* Header: Code + Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-primary-600 bg-primary-50 px-2 py-1 rounded-md text-xs font-medium">
          {proposal.code}
        </span>
        <StateBadge state={proposal.state as ProjectState} />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-3">
        {proposal.title}
      </h3>

      {/* Meta info */}
      <div className="flex flex-col gap-2 text-xs text-gray-500 mb-3">
        {proposal.owner && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0">
              {proposal.owner.displayName?.charAt(0) || 'U'}
            </div>
            <span className="truncate">{proposal.owner.displayName}</span>
          </div>
        )}
        {proposal.faculty && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{proposal.faculty.name}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-between pt-3 border-t border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewClick}
            className="min-h-[44px] min-w-[44px]"
          >
            <Eye size={18} className="text-gray-500" />
            <span className="ml-1.5 text-xs">Xem</span>
          </Button>

          {proposal.state === ProjectState.DRAFT && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="min-h-[44px] min-w-[44px] hover:bg-primary-50 hover:text-primary-600"
            >
              <Edit2 size={18} />
              <span className="ml-1.5 text-xs">Sửa</span>
            </Button>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-gray-300" />
      </div>
    </div>
  );
});

/**
 * ProposalCardList Component - List of proposal cards for mobile
 */
interface ProposalCardListProps {
  proposals: ProposalSummary[];
  onNavigate?: (path: string) => void;
}

export const ProposalCardList = memo(function ProposalCardList({ proposals, onNavigate }: ProposalCardListProps) {
  if (proposals.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
        <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
          <svg
            className="h-6 w-6"
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
        <p className="text-gray-500 font-medium text-sm">Không có đề tài nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} onNavigate={onNavigate} />
      ))}
    </div>
  );
});
