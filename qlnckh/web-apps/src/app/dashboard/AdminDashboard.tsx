import {
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  Mail,
  RefreshCw,
  PieChart,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  StatusDistributionPieChart,
  MonthlyTrendBarChart,
} from '../../components/charts/DashboardCharts';
import { KpiCard, OverdueTable } from './components';
import {
  gradients,
  shadows,
  colors,
  spacing,
  layout,
  iconContainers,
  cx,
} from '../../lib/design-tokens';
import type { DashboardData } from './types';

/**
 * AdminDashboard Props
 */
export interface AdminDashboardProps {
  data: DashboardData;
  onNavigate: (path: string) => void;
  onRemindOverdue: () => void;
  onRefresh: () => void;
}

// Shared styles
const pageContainer = cx('min-h-screen py-8', gradients.surface);
const sectionHeader = 'flex items-center gap-2 mb-4';
const chartCard = cx('bg-white rounded-2xl p-6', shadows.lg);

/**
 * AdminDashboard Component
 *
 * Dashboard view for PHONG_KHCN/ADMIN users.
 * Displays KPI metrics, charts, and overdue proposals.
 *
 * Story 11.2: Dashboard with KPI Metrics
 */
export function AdminDashboard({
  data,
  onNavigate,
  onRemindOverdue,
  onRefresh,
}: AdminDashboardProps) {
  return (
    <div className={pageContainer}>
      <div className={cx(layout.maxWidth, spacing.pagePx)}>
        {/* Header */}
        <div className={spacing.sectionGap}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cx(
                iconContainers.lg,
                'bg-blue-900',
                shadows.lg
              )}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className={cx(colors.textPrimary, 'text-2xl font-bold font-serif')}>
              Dashboard Phòng KHCN
            </h1>
          </div>
          <p className={cx(colors.textMuted, 'ml-13')}>
            Tổng quan trạng thái đề tài nghiên cứu
          </p>
        </div>

        {/* KPI Cards */}
        <div className={cx(layout.grid4, spacing.sectionGap)}>
          <KpiCard
            title="Đang chờ xử lý"
            value={data.kpi.totalWaiting}
            icon={<BarChart3 className="h-6 w-6" />}
            color="blue"
            gradient
            onClick={() => onNavigate('/proposals?status=pending')}
          />
          <KpiCard
            title="Sắp đến hạn"
            value={data.kpi.t2WarningCount}
            icon={<Clock className="h-6 w-6" />}
            color="amber"
            gradient
            onClick={() => onNavigate('/proposals?status=warning')}
          />
          <KpiCard
            title="Quá hạn SLA"
            value={data.kpi.overdueCount}
            icon={<AlertTriangle className="h-6 w-6" />}
            color="red"
            gradient
            onClick={() => onNavigate('/proposals?status=overdue')}
          />
          <KpiCard
            title="Hoàn thành tháng này"
            value={data.kpi.completedThisMonth}
            icon={<CheckCircle className="h-6 w-6" />}
            color="slate"
            gradient
            onClick={() => onNavigate('/proposals?status=completed')}
          />
        </div>

        {/* Quick Actions */}
        <div className={cx('flex gap-3', spacing.sectionGap)}>
          <Button
            onClick={onRemindOverdue}
            variant="primary"
            leftIcon={<Mail className="h-4 w-4" />}
          >
            Nhắc hồ sơ quá hạn
          </Button>
          <Button
            onClick={onRefresh}
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Làm mới
          </Button>
        </div>

        {/* Charts Section */}
        <div className={spacing.sectionGap}>
          <div className={sectionHeader}>
            <div className={cx(iconContainers.sm, 'bg-blue-900')}>
              <PieChart className="w-4 h-4 text-white" />
            </div>
            <h2 className={cx(colors.textPrimary, 'text-lg font-bold font-serif')}>
              Thống kê & Biểu đồ
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Pie Chart */}
            <div className={chartCard}>
              <StatusDistributionPieChart
                data={data.statusDistribution || []}
              />
            </div>

            {/* Monthly Trends Bar Chart */}
            <div className={chartCard}>
              <MonthlyTrendBarChart data={data.monthlyTrends || []} />
            </div>
          </div>
        </div>

        {/* Overdue Proposals Table */}
        <OverdueTable
          proposals={data.overdueList}
          onRowClick={(id) => onNavigate(`/proposals/${id}`)}
        />

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
