import {
  UserCheck,
  FileText,
  CheckCircle,
  Users,
  Star,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  KpiCard,
  MiniStats,
  CouncilInfoCard,
  PendingProposalsTable,
  SubmittedEvaluationsTable,
} from './components';
import {
  gradients,
  colors,
  spacing,
  layout,
  iconContainers,
  shadows,
  cx,
} from '../../lib/design-tokens';
import type { CouncilDashboardData } from './types';

/**
 * CouncilDashboard Props
 */
export interface CouncilDashboardProps {
  data: CouncilDashboardData;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

// Shared styles
const pageContainer = cx('min-h-screen py-8', gradients.surface);

/**
 * CouncilDashboard Component
 *
 * Dashboard view for HOI_DONG/THU_KY_HOI_DONG users.
 * Displays council info, KPIs, pending proposals, and submitted evaluations.
 *
 * Multi-member: Council member dashboard
 */
export function CouncilDashboard({
  data,
  onNavigate,
  onRefresh,
}: CouncilDashboardProps) {
  return (
    <div className={pageContainer}>
      <div className={cx(layout.maxWidth, spacing.pagePx)}>
        {/* Header */}
        <div className={cx('flex justify-between items-start', spacing.sectionGap)}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cx(
                  iconContainers.lg,
                  'bg-blue-900',
                  shadows.lg
                )}
              >
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className={cx(colors.textPrimary, 'text-2xl font-bold font-serif')}>
                Dashboard Hội đồng
              </h1>
            </div>
            <p className={cx(colors.textMuted, 'ml-13')}>
              {data.council?.isSecretary
                ? `Thư ký - ${data.council.name}`
                : data.council?.name || 'Thành viên hội đồng'}
            </p>
          </div>
          <Button
            onClick={onRefresh}
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Làm mới
          </Button>
        </div>

        {/* Council Info Card */}
        {data.council && (
          <div className={spacing.sectionGap}>
            <CouncilInfoCard council={data.council} />
          </div>
        )}

        {/* KPI Cards */}
        <div className={cx(layout.grid4, spacing.sectionGap)}>
          <KpiCard
            title="Cần đánh giá"
            value={data.kpi.pendingEvaluation}
            icon={<FileText className="h-6 w-6" />}
            color="blue"
            gradient
            onClick={() => onNavigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
          />
          <KpiCard
            title="Đã đánh giá"
            value={data.kpi.evaluated}
            icon={<CheckCircle className="h-6 w-6" />}
            color="slate"
            gradient
            onClick={() =>
              onNavigate('/proposals?state=OUTLINE_COUNCIL_REVIEW&evaluated=true')
            }
          />
          <KpiCard
            title="Tổng được giao"
            value={data.kpi.totalAssigned}
            icon={<Users className="h-6 w-6" />}
            color="slate"
            gradient
            onClick={() => onNavigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
          />
          {data.council?.isSecretary && (
            <KpiCard
              title="Chờ finalize"
              value={data.kpi.pendingFinalize}
              icon={<Star className="h-6 w-6" />}
              color="amber"
              gradient
              onClick={() =>
                onNavigate(
                  '/proposals?state=OUTLINE_COUNCIL_REVIEW&pendingFinalize=true'
                )
              }
            />
          )}
        </div>

        {/* Mini Stats Row */}
        <div className={spacing.sectionGap}>
          <MiniStats kpi={data.kpi} evaluations={data.submittedEvaluations} />
        </div>

        {/* Pending Proposals */}
        <div className={spacing.sectionGap}>
          <PendingProposalsTable
            proposals={data.pendingProposals}
            onRowClick={(id) => onNavigate(`/proposals/${id}`)}
            onViewAll={() =>
              onNavigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')
            }
          />
        </div>

        {/* Submitted Evaluations */}
        <div className={spacing.sectionGap}>
          <SubmittedEvaluationsTable
            evaluations={data.submittedEvaluations}
            onRowClick={(id) => onNavigate(`/proposals/${id}`)}
          />
        </div>

        {/* Last Updated */}
        {data.lastUpdated && (
          <p className={cx('text-center text-sm mt-6', colors.textDisabled)}>
            Cập nhật lần cuối:{' '}
            {new Date(data.lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
}
