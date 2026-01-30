/**
 * Faculty Dashboard for QUAN_LY_KHOA (Faculty Manager)
 *
 * Features:
 * - Faculty-specific KPI metrics organized by priority
 * - Proposal list from faculty
 * - Quick actions for faculty management
 * - Recent proposals requiring attention
 *
 * Access Control:
 * - Only QUAN_LY_KHOA role can access
 * - Requires FACULTY_DASHBOARD_VIEW permission
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { apiClient } from '../../../lib/auth/auth';
import {
  StatusDistributionPieChart,
  MonthlyTrendBarChart,
} from '../../../components/charts/DashboardCharts';

type ProposalStatus =
  | 'DRAFT'
  | 'FACULTY_COUNCIL_OUTLINE_REVIEW'
  | 'SCHOOL_REVIEW'
  | 'COUNCIL_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'
  | 'WITHDRAWN'
  | 'FACULTY_COUNCIL_ACCEPTANCE_REVIEW'
  | 'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW';

interface FacultyDashboardKpi {
  totalProposals: number;
  pendingReview: number;
  approved: number;
  returned: number;
  inProgress: number;
  completed: number;
  pendingAcceptance: number;
  acceptedByFaculty: number;
}

interface RecentProposal {
  id: string;
  code: string;
  title: string;
  state: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  owner?: {
    displayName: string;
    email: string;
  };
  faculty?: {
    id: string;
    name: string;
    code: string;
  };
}

interface FacultyStatusDistribution {
  state: string;
  stateName: string;
  count: number;
  percentage: number;
}

interface FacultyMonthlyTrend {
  month: string;
  newProposals: number;
  approved: number;
  completed: number;
}

interface FacultyDashboardData {
  kpi: FacultyDashboardKpi;
  recentProposals: RecentProposal[];
  facultyName: string;
  facultyId: string;
  statusDistribution: FacultyStatusDistribution[];
  monthlyTrends: FacultyMonthlyTrend[];
}

const getStatusColor = (state: ProposalStatus): string => {
  const colors = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    FACULTY_REVIEW: 'bg-blue-100 text-blue-700 border-blue-200',
    SCHOOL_REVIEW: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    COUNCIL_REVIEW: 'bg-purple-100 text-purple-700 border-purple-200',
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    CHANGES_REQUESTED: 'bg-amber-100 text-amber-700 border-amber-200',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
    WITHDRAWN: 'bg-slate-100 text-slate-500 border-slate-200',
    FACULTY_ACCEPTANCE_REVIEW: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    SCHOOL_ACCEPTANCE_REVIEW: 'bg-teal-100 text-teal-700 border-teal-200',
  };
  return colors[state] || colors.DRAFT;
};

const getStatusLabel = (state: ProposalStatus): string => {
  const labels = {
    DRAFT: 'Nháp',
    FACULTY_REVIEW: 'Đang xét (Khoa)',
    SCHOOL_REVIEW: 'Đang xét (Trường)',
    COUNCIL_REVIEW: 'Đang xét (Hội đồng)',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    CHANGES_REQUESTED: 'Yêu cầu sửa',
    CANCELLED: 'Đã hủy',
    WITHDRAWN: 'Đã rút',
    FACULTY_ACCEPTANCE_REVIEW: 'Nghiệm thu Khoa',
    SCHOOL_ACCEPTANCE_REVIEW: 'Nghiệm thu Trường',
  };
  return labels[state] || state;
};

/**
 * Stat Card Component for Faculty Dashboard with Gradient Style
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  size = 'normal',
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color: 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'cyan' | 'gray';
  size?: 'normal' | 'large';
  onClick?: () => void;
}) {
  const gradientColors: Record<string, string> = {
    red: 'bg-gradient-to-br from-red-500 to-red-600',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
    blue: 'bg-gradient-to-br from-blue-900 to-blue-800',
    green: 'bg-gradient-to-br from-slate-700 to-slate-800',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    cyan: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    gray: 'bg-gradient-to-br from-slate-500 to-slate-600',
  };

  const sizeClasses = size === 'large' ? 'p-6' : 'p-5';
  const valueSize = size === 'large' ? 'text-3xl' : 'text-2xl';
  const iconSize = size === 'large' ? 'w-7 h-7' : 'w-6 h-6';

  return (
    <div
      className={`
        ${gradientColors[color]} text-white rounded-lg shadow-lg
        relative overflow-hidden group
        transition-all duration-300 hover:shadow-xl hover:scale-[1.02]
        ${onClick ? 'cursor-pointer' : ''} ${sizeClasses}
      `}
      onClick={onClick}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center shadow-md">
            <Icon className={iconSize} />
          </div>
          <div>
            <p className="text-white/90 text-sm font-medium mb-1">{label}</p>
            <p className={`font-bold ${valueSize}`}>{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Proposal Row Component
 */
function ProposalRow({
  proposal,
  onView,
}: {
  proposal: RecentProposal;
  onView: (id: string) => void;
}) {
  return (
    <div className="group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4 p-4">
        <div className={`h-2 w-2 rounded-full ${
          proposal.state === 'APPROVED' ? 'bg-emerald-500' :
          proposal.state === 'DRAFT' ? 'bg-gray-400' :
          proposal.state === 'REJECTED' ? 'bg-red-500' :
          proposal.state === 'CHANGES_REQUESTED' ? 'bg-amber-500' :
          'bg-blue-500'
        }`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{proposal.code}</span>
            <Badge className={getStatusColor(proposal.state)}>
              {getStatusLabel(proposal.state)}
            </Badge>
          </div>
          <h4 className="mt-1 truncate font-medium text-gray-900">{proposal.title}</h4>
          <p className="mt-1 text-xs text-gray-500">
            {proposal.owner?.displayName || 'Không rõ'} • {new Date(proposal.updatedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onView(proposal.id)}
            leftIcon={<Eye className="h-3 w-3" />}
          >
            Xem
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Faculty Dashboard Page Component
 */
export default function FacultyDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [kpi, setKpi] = useState<FacultyDashboardKpi>({
    totalProposals: 0,
    pendingReview: 0,
    approved: 0,
    returned: 0,
    inProgress: 0,
    completed: 0,
    pendingAcceptance: 0,
    acceptedByFaculty: 0,
  });
  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([]);
  const [facultyName, setFacultyName] = useState<string>('');
  const [statusDistribution, setStatusDistribution] = useState<FacultyStatusDistribution[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<FacultyMonthlyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/dashboard/faculty');
      const data: FacultyDashboardData = response.data.data;

      // Extract faculty name from the first proposal's faculty object
      if (data.recentProposals && data.recentProposals.length > 0) {
        const faculty = data.recentProposals[0]?.faculty;
        if (faculty) {
          setFacultyName(`${faculty.name} (${faculty.code})`);
        }
      }

      setKpi(data.kpi);
      setRecentProposals(data.recentProposals || []);
      setStatusDistribution(data.statusDistribution || []);
      setMonthlyTrends(data.monthlyTrends || []);
    } catch (error) {
      console.error('Failed to load faculty dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };

  const handleViewByState = (state: string) => {
    navigate(`/proposals?state=${state}`);
  };

  const handleViewUsers = () => {
    navigate('/dashboard/faculty/users');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-600">Đang tải dashboard khoa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 font-serif">
                  Dashboard Khoa
                </h1>
              </div>
              <p className="mt-1 text-slate-500 ml-13">
                Tổng quan về các đề tài {facultyName || '...'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleViewUsers}
                leftIcon={<Users className="h-4 w-4" />}
              >
                Quản lý người dùng
              </Button>
              <Button
                variant="flat"
                size="md"
                onClick={() => navigate('/proposals')}
                leftIcon={<FileText className="h-4 w-4" />}
              >
                Tất cả đề tài
              </Button>
            </div>
          </div>
        </div>

        {/* Priority Section: Cần hành động ngay - LARGE CARDS */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif' }} className="text-lg font-bold text-gray-900">Cần hành động ngay</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={AlertTriangle}
              label="Cần duyệt"
              value={kpi.pendingReview}
              color="amber"
              size="large"
              onClick={() => handleViewByState('FACULTY_COUNCIL_OUTLINE_REVIEW')}
            />
            <StatCard
              icon={AlertCircle}
              label="Yêu cầu sửa"
              value={kpi.returned}
              color="red"
              size="large"
              onClick={() => handleViewByState('CHANGES_REQUESTED')}
            />
            <StatCard
              icon={Clock}
              label="Chờ nghiệm thu"
              value={kpi.pendingAcceptance}
              color="cyan"
              size="large"
              onClick={() => handleViewByState('FACULTY_COUNCIL_ACCEPTANCE_REVIEW')}
            />
            <StatCard
              icon={CheckCircle2}
              label="Đã nghiệm thu"
              value={kpi.acceptedByFaculty}
              color="green"
              size="large"
              onClick={() => handleViewByState('SCHOOL_COUNCIL_ACCEPTANCE_REVIEW')}
            />
          </div>
        </div>

        {/* Overview Section: Tổng quan */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif' }} className="text-lg font-bold text-gray-900">Tổng quan</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              icon={FileText}
              label="Tổng số"
              value={kpi.totalProposals}
              color="blue"
              onClick={() => navigate('/proposals')}
            />
            <StatCard
              icon={CheckCircle2}
              label="Đã duyệt"
              value={kpi.approved}
              color="green"
              onClick={() => handleViewByState('APPROVED')}
            />
            <StatCard
              icon={TrendingUp}
              label="Đang thực hiện"
              value={kpi.inProgress}
              color="purple"
              onClick={() => handleViewByState('IN_PROGRESS')}
            />
            <StatCard
              icon={CheckCircle2}
              label="Hoàn thành"
              value={kpi.completed}
              color="green"
              onClick={() => handleViewByState('COMPLETED')}
            />
          </div>
        </div>

        {/* Quick Stats Summary - Gradient Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-medium">Tỷ lệ duyệt</p>
                  <p className="text-3xl font-bold text-white">
                    {kpi.totalProposals > 0
                      ? Math.round((kpi.approved / kpi.totalProposals) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-amber-100 text-sm font-medium">Đề tài cần chú ý</p>
                  <p className="text-3xl font-bold text-white">
                    {kpi.pendingReview + kpi.returned}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Hoàn thành khoa</p>
                  <p className="text-3xl font-bold text-white">{kpi.completed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif' }} className="text-lg font-bold text-gray-900">Thống kê & Biểu đồ</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Pie Chart */}
            <Card variant="elevated">
              <CardBody>
                <StatusDistributionPieChart data={statusDistribution} />
              </CardBody>
            </Card>

            {/* Monthly Trends Bar Chart */}
            <Card variant="elevated">
              <CardBody>
                <MonthlyTrendBarChart data={monthlyTrends} />
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Recent Proposals */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <h2 style={{ fontFamily: 'Georgia, serif' }} className="text-lg font-bold text-gray-900">Đề tài gần đây</h2>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/proposals')}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              Xem tất cả →
            </Button>
          </div>
          <Card variant="elevated">
            <CardBody className="p-0">
              {recentProposals.length > 0 ? (
                <div>
                  {recentProposals.map((proposal) => (
                    <ProposalRow
                      key={proposal.id}
                      proposal={proposal}
                      onView={handleViewProposal}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Khoa chưa có đề tài nào</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
