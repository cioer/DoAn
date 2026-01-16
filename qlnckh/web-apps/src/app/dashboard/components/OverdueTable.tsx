import { AlertTriangle, CheckCircle } from 'lucide-react';
import { getStateLabel } from '../../../lib/constants/states';
import {
  gradients,
  shadows,
  colors,
  components,
  iconContainers,
  cx,
} from '../../../lib/design-tokens';
import type { OverdueProposal } from '../types';

/**
 * OverdueTable Props
 */
export interface OverdueTableProps {
  proposals: OverdueProposal[];
  onRowClick: (proposalId: string) => void;
}

// Shared styles
const cardBase = cx('bg-white rounded-2xl overflow-hidden', shadows.lg);
const tableHeaderCell = components.tableHeaderCell;
const tableCell = components.tableCell;

/**
 * OverdueTable Component
 *
 * Displays a table of overdue proposals with state badges.
 * Shows empty state when no proposals are overdue.
 */
export function OverdueTable({ proposals, onRowClick }: OverdueTableProps) {
  // Empty state
  if (proposals.length === 0) {
    return (
      <div className={cx('bg-white rounded-lg p-12 text-center', shadows.lg)}>
        <div
          className={cx(
            iconContainers.circle3xl,
            colors.bgInfo,
            'mx-auto mb-4'
          )}
        >
          <CheckCircle className="h-10 w-10 text-blue-900" />
        </div>
        <p className="text-slate-700 font-medium text-lg">
          Không có hồ sơ quá hạn!
        </p>
        <p className={cx(colors.textMuted, 'text-sm mt-2')}>
          Tất cả đề tài đều đang được xử lý đúng hạn
        </p>
      </div>
    );
  }

  return (
    <div className={cardBase}>
      {/* Header */}
      <div className={cx(gradients.headerRed, 'px-6 py-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              Hồ sơ quá hạn ({proposals.length})
            </h2>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={cx('min-w-full divide-y', colors.borderLighter)}>
          <thead className={components.tableHeader}>
            <tr>
              <th className={tableHeaderCell}>Mã số</th>
              <th className={tableHeaderCell}>Tên đề tài</th>
              <th className={tableHeaderCell}>Người phụ trách</th>
              <th className={tableHeaderCell}>Quá hạn</th>
              <th className={tableHeaderCell}>Trạng thái</th>
            </tr>
          </thead>
          <tbody className={cx('bg-white divide-y', colors.borderLighter)}>
            {proposals.map((proposal) => (
              <tr
                key={proposal.id}
                onClick={() => onRowClick(proposal.id)}
                className="hover:bg-red-50/50 cursor-pointer transition-colors"
              >
                <td className={cx(tableCell, 'text-gray-900 font-medium')}>
                  {proposal.code}
                </td>
                <td className={cx(tableCell, 'text-gray-900 whitespace-normal')}>
                  {proposal.title}
                </td>
                <td className={cx(tableCell, colors.textSecondary)}>
                  {proposal.holderName}
                </td>
                <td className={cx(tableCell, 'text-red-600 font-semibold')}>
                  {proposal.overdueDays} ngày
                </td>
                <td className={tableCell}>
                  <span
                    className={cx(
                      components.badgeBase,
                      components.badgeError
                    )}
                  >
                    {getStateLabel(proposal.state)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
