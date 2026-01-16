import { FileText, CheckCircle } from 'lucide-react';
import {
  gradients,
  shadows,
  colors,
  components,
  iconContainers,
  cx,
} from '../../../lib/design-tokens';
import type { CouncilProposalItem } from '../types';

/**
 * PendingProposalsTable Props
 */
export interface PendingProposalsTableProps {
  proposals: CouncilProposalItem[];
  onRowClick: (proposalId: string) => void;
  onViewAll: () => void;
}

// Shared styles
const cardBase = cx('bg-white rounded-lg overflow-hidden', shadows.lg);
const tableHeaderCell = components.tableHeaderCell;
const tableCell = components.tableCell;

/**
 * PendingProposalsTable Component
 *
 * Displays a table of proposals pending evaluation for council members.
 */
export function PendingProposalsTable({
  proposals,
  onRowClick,
  onViewAll,
}: PendingProposalsTableProps) {
  // Empty state
  if (proposals.length === 0) {
    return (
      <div className={cx('bg-white rounded-2xl p-12 text-center', shadows.lg)}>
        <div
          className={cx(
            iconContainers.circle3xl,
            colors.bgSuccess,
            'mx-auto mb-4'
          )}
        >
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <p className="text-gray-700 font-medium text-lg">
          Không có đề tài nào cần đánh giá!
        </p>
      </div>
    );
  }

  return (
    <div className={cardBase}>
      {/* Header */}
      <div className={cx(gradients.headerBlue, 'px-6 py-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              Đề tài cần đánh giá ({proposals.length})
            </h2>
          </div>
          <button
            onClick={onViewAll}
            className="text-sm text-blue-100 hover:text-white transition-colors"
          >
            Xem tất cả →
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={cx('min-w-full divide-y', colors.borderLighter)}>
          <thead className={components.tableHeader}>
            <tr>
              <th className={tableHeaderCell}>Mã số</th>
              <th className={tableHeaderCell}>Tên đề tài</th>
              <th className={tableHeaderCell}>Người tạo</th>
              <th className={tableHeaderCell}>Hạn chờ</th>
              <th className={tableHeaderCell}>Trạng thái</th>
            </tr>
          </thead>
          <tbody className={cx('bg-white divide-y', colors.borderLighter)}>
            {proposals.map((proposal) => (
              <tr
                key={proposal.id}
                onClick={() => onRowClick(proposal.id)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
              >
                <td className={cx(tableCell, 'text-gray-900 font-medium')}>
                  {proposal.code}
                </td>
                <td className={cx(tableCell, 'text-gray-900 whitespace-normal')}>
                  {proposal.title}
                </td>
                <td className={cx(tableCell, colors.textSecondary)}>
                  {proposal.ownerName}
                </td>
                <td className={cx(tableCell, colors.textSecondary)}>
                  {proposal.slaDeadline
                    ? new Date(proposal.slaDeadline).toLocaleDateString('vi-VN')
                    : '-'}
                </td>
                <td className={tableCell}>
                  {proposal.hasSubmitted ? (
                    <span
                      className={cx(
                        components.badgeBase,
                        components.badgeSuccess
                      )}
                    >
                      Đã gửi
                    </span>
                  ) : (
                    <span
                      className={cx(
                        components.badgeBase,
                        components.badgeWarning
                      )}
                    >
                      Chưa đánh giá
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
