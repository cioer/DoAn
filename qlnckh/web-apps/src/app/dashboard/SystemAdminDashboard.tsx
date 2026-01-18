import {
  Shield,
  Users,
  FileText,
  Building2,
  Scale,
  Activity,
  Database,
  Clock,
  RefreshCw,
  ChevronRight,
  UserCheck,
  UserCog,
  GraduationCap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  gradients,
  shadows,
  colors,
  spacing,
  layout,
  iconContainers,
  cx,
} from '../../lib/design-tokens';

/**
 * SystemAdminDashboard Props
 */
export interface SystemAdminDashboardProps {
  data: {
    userStats: {
      totalUsers: number;
      byRole: {
        giangVien: number;
        quanLyKhoa: number;
        hoiDong: number;
        thuKyHoiDong: number;
        phongKhcn: number;
        banGiamHoc: number;
        admin: number;
      };
    };
    quickStats: {
      totalProposals: number;
      totalFaculties: number;
      totalCouncils: number;
      totalUsers: number;
    };
    statusOverview: Array<{ state: string; count: number }>;
    recentAuditLogs: Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      actorName: string;
      actorEmail: string;
      createdAt: string;
    }>;
    health: {
      overall: string;
      database: string;
      uptime: number;
    };
    lastUpdated: string;
  };
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

// Role display names
const ROLE_LABELS: Record<string, string> = {
  giangVien: 'Giảng viên',
  quanLyKhoa: 'Quản lý Khoa',
  hoiDong: 'Hội đồng',
  thuKyHoiDong: 'Thư ký HĐ',
  phongKhcn: 'Phòng KHCN',
  banGiamHoc: 'Ban Giám hiệu',
  admin: 'Admin',
};

// Role icons
const ROLE_ICONS: Record<string, React.ReactNode> = {
  giangVien: <GraduationCap className="w-4 h-4" />,
  quanLyKhoa: <Building2 className="w-4 h-4" />,
  hoiDong: <Scale className="w-4 h-4" />,
  thuKyHoiDong: <UserCheck className="w-4 h-4" />,
  phongKhcn: <UserCog className="w-4 h-4" />,
  banGiamHoc: <Shield className="w-4 h-4" />,
  admin: <Shield className="w-4 h-4" />,
};

// Stat card component
function StatCard({
  title,
  value,
  icon,
  color,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'purple';
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div
      className={cx(
        'bg-white rounded-xl p-5 border cursor-pointer hover:shadow-md transition-shadow',
        colorClasses[color]
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cx('p-2 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Health status badge
function HealthBadge({ status }: { status: string }) {
  const isHealthy = status === 'healthy';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}
    >
      <span
        className={cx(
          'w-2 h-2 rounded-full',
          isHealthy ? 'bg-green-500' : 'bg-red-500'
        )}
      />
      {isHealthy ? 'Healthy' : 'Unhealthy'}
    </span>
  );
}

// Format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * SystemAdminDashboard Component
 *
 * Dashboard for ADMIN role with system management overview.
 */
export function SystemAdminDashboard({
  data,
  onNavigate,
  onRefresh,
}: SystemAdminDashboardProps) {
  const pageContainer = cx('min-h-screen py-8', gradients.surface);

  return (
    <div className={pageContainer}>
      <div className={cx(layout.maxWidth, spacing.pagePx)}>
        {/* Header */}
        <div className={spacing.sectionGap}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cx(
                  iconContainers.lg,
                  'bg-slate-900',
                  shadows.lg
                )}
              >
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={cx(colors.textPrimary, 'text-2xl font-bold font-serif')}>
                  Dashboard Quản trị
                </h1>
                <p className={cx(colors.textMuted, 'text-sm')}>
                  Tổng quan hệ thống quản lý NCKH
                </p>
              </div>
            </div>
            <Button
              onClick={onRefresh}
              variant="secondary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* System Health */}
        <div className={cx('bg-white rounded-xl p-5 border', spacing.sectionGap)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-slate-600" />
              <span className="font-medium">Trạng thái hệ thống</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Database className="w-4 h-4" />
                <span>Database:</span>
                <HealthBadge status={data.health.database} />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Uptime: {formatUptime(data.health.uptime)}</span>
              </div>
              <HealthBadge status={data.health.overall} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={cx(layout.grid4, spacing.sectionGap)}>
          <StatCard
            title="Người dùng"
            value={data.quickStats.totalUsers}
            icon={<Users className="w-5 h-5" />}
            color="blue"
            onClick={() => onNavigate('/admin/users')}
          />
          <StatCard
            title="Đề tài"
            value={data.quickStats.totalProposals}
            icon={<FileText className="w-5 h-5" />}
            color="green"
            onClick={() => onNavigate('/proposals')}
          />
          <StatCard
            title="Khoa"
            value={data.quickStats.totalFaculties}
            icon={<Building2 className="w-5 h-5" />}
            color="amber"
            onClick={() => onNavigate('/faculties')}
          />
          <StatCard
            title="Hội đồng"
            value={data.quickStats.totalCouncils}
            icon={<Scale className="w-5 h-5" />}
            color="purple"
            onClick={() => onNavigate('/councils')}
          />
        </div>

        {/* Main Content Grid */}
        <div className={cx('grid grid-cols-1 lg:grid-cols-2 gap-6', spacing.sectionGap)}>
          {/* User Statistics */}
          <div className={cx('bg-white rounded-xl p-6', shadows.md)}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Thống kê người dùng
              </h2>
              <button
                onClick={() => onNavigate('/admin/users')}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {Object.entries(data.userStats.byRole).map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{ROLE_ICONS[role]}</span>
                    <span className="text-sm">{ROLE_LABELS[role]}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t-2">
                <span className="font-medium">Tổng cộng</span>
                <span className="font-bold text-lg text-blue-600">
                  {data.userStats.totalUsers}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className={cx('bg-white rounded-xl p-6', shadows.md)}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Nhật ký gần đây
              </h2>
              <button
                onClick={() => onNavigate('/audit')}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentAuditLogs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Chưa có nhật ký nào
                </p>
              ) : (
                data.recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">
                      {log.actorName} - {log.entityType}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={cx('bg-white rounded-xl p-6', shadows.md, spacing.sectionGap)}>
          <h2 className="font-bold text-lg mb-4">Truy cập nhanh</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="secondary"
              className="justify-start"
              leftIcon={<Users className="w-4 h-4" />}
              onClick={() => onNavigate('/admin/users')}
            >
              Quản lý người dùng
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              leftIcon={<Activity className="w-4 h-4" />}
              onClick={() => onNavigate('/audit')}
            >
              Nhật ký hệ thống
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              leftIcon={<FileText className="w-4 h-4" />}
              onClick={() => onNavigate('/form-templates')}
            >
              Biểu mẫu
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              leftIcon={<Database className="w-4 h-4" />}
              onClick={() => onNavigate('/import')}
            >
              Import dữ liệu
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        {data.lastUpdated && (
          <p className={cx('text-center text-sm', colors.textDisabled)}>
            Cập nhật lần cuối:{' '}
            {new Date(data.lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
}
