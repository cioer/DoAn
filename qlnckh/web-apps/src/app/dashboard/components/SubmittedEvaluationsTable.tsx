import { CheckCircle, Star } from 'lucide-react';
import {
  gradients,
  shadows,
  colors,
  components,
  cx,
} from '../../../lib/design-tokens';
import type { CouncilEvaluationItem } from '../types';

/**
 * SubmittedEvaluationsTable Props
 */
export interface SubmittedEvaluationsTableProps {
  evaluations: CouncilEvaluationItem[];
  onRowClick: (proposalId: string) => void;
}

// Shared styles
const cardBase = cx('bg-white rounded-2xl overflow-hidden', shadows.lg);
const tableHeaderCell = components.tableHeaderCell;
const tableCell = components.tableCell;

/**
 * SubmittedEvaluationsTable Component
 *
 * Displays a table of submitted evaluations for council members.
 */
export function SubmittedEvaluationsTable({
  evaluations,
  onRowClick,
}: SubmittedEvaluationsTableProps) {
  if (evaluations.length === 0) {
    return null;
  }

  return (
    <div className={cardBase}>
      {/* Header */}
      <div className={cx(gradients.headerEmerald, 'px-6 py-4')}>
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-white" />
          <h2 className="text-lg font-semibold text-white">
            Đánh giá đã gửi ({evaluations.length})
          </h2>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={cx('min-w-full divide-y', colors.borderLighter)}>
          <thead className={components.tableHeader}>
            <tr>
              <th className={tableHeaderCell}>Đề tài</th>
              <th className={tableHeaderCell}>Kết luận</th>
              <th className={tableHeaderCell}>Điểm TB</th>
              <th className={tableHeaderCell}>Ngày đánh giá</th>
            </tr>
          </thead>
          <tbody className={cx('bg-white divide-y', colors.borderLighter)}>
            {evaluations.map((evaluation) => (
              <tr
                key={evaluation.id}
                onClick={() => onRowClick(evaluation.proposalId)}
                className="hover:bg-emerald-50/50 cursor-pointer transition-colors"
              >
                <td className={cx(tableCell, 'whitespace-normal')}>
                  <div className={cx(colors.textPrimary, 'font-medium')}>
                    {evaluation.proposalCode}
                  </div>
                  <div className={cx(colors.textSecondary, 'text-xs')}>
                    {evaluation.proposalTitle}
                  </div>
                </td>
                <td className={tableCell}>
                  <span
                    className={cx(
                      components.badgeBase,
                      evaluation.conclusion === 'DAT'
                        ? components.badgeSuccess
                        : components.badgeError
                    )}
                  >
                    {evaluation.conclusion === 'DAT' ? 'Đạt' : 'Không đạt'}
                  </span>
                </td>
                <td className={cx(tableCell, colors.textPrimary)}>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    {evaluation.averageScore}/5
                  </div>
                </td>
                <td className={cx(tableCell, colors.textSecondary)}>
                  {new Date(evaluation.updatedAt).toLocaleDateString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
