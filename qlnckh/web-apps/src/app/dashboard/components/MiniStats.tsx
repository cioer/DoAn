import {
  gradients,
  shadows,
  colors,
  transitions,
  cx,
} from '../../../lib/design-tokens';
import type { CouncilEvaluationItem, CouncilDashboardKpi } from '../types';

/**
 * MiniStats Props
 */
export interface MiniStatsProps {
  kpi: CouncilDashboardKpi;
  evaluations: CouncilEvaluationItem[];
}

// Shared styles
const statCardBase = cx(
  'rounded-lg p-4 relative overflow-hidden group',
  shadows.lg
);

const decorativeCircle =
  'absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500';

/**
 * MiniStats Component
 *
 * Displays mini statistics cards for Council dashboard.
 * Shows progress, pass rate, and average score.
 */
export function MiniStats({ kpi, evaluations }: MiniStatsProps) {
  // Calculate progress percentage
  const progressPercent =
    kpi.totalAssigned > 0
      ? Math.round((kpi.evaluated / kpi.totalAssigned) * 100)
      : 0;

  // Calculate pass rate
  const passCount = evaluations.filter((e) => e.conclusion === 'DAT').length;
  const passRate =
    evaluations.length > 0
      ? Math.round((passCount / evaluations.length) * 100)
      : 0;

  // Calculate average score
  const avgScore =
    evaluations.length > 0
      ? (
          evaluations.reduce((sum, e) => sum + e.averageScore, 0) /
          evaluations.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Progress Card */}
      <div className={cx(statCardBase, gradients.cardBlue)}>
        <div className={decorativeCircle} />
        <div className="relative">
          <p className="text-blue-100 text-sm font-medium">Tiến độ đánh giá</p>
          <p className={cx(colors.textWhite, 'text-2xl font-bold')}>
            {progressPercent}%
          </p>
        </div>
      </div>

      {/* Pass Rate Card */}
      <div className={cx(statCardBase, gradients.cardSlate)}>
        <div className={decorativeCircle} />
        <div className="relative">
          <p className="text-slate-200 text-sm font-medium">Tỷ lệ Đạt</p>
          <p className={cx(colors.textWhite, 'text-2xl font-bold')}>
            {passRate}%
          </p>
        </div>
      </div>

      {/* Average Score Card */}
      <div className={cx(statCardBase, gradients.cardAmberDark)}>
        <div className={decorativeCircle} />
        <div className="relative">
          <p className="text-amber-100 text-sm font-medium">Điểm trung bình</p>
          <p className={cx(colors.textWhite, 'text-2xl font-bold')}>
            {avgScore}
          </p>
        </div>
      </div>
    </div>
  );
}
