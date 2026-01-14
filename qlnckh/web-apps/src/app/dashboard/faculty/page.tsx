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

type ProposalStatus =
  | 'DRAFT'
  | 'FACULTY_REVIEW'
  | 'SCHOOL_REVIEW'
  | 'COUNCIL_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'
  | 'WITHDRAWN'
  | 'FACULTY_ACCEPTANCE_REVIEW'
  | 'SCHOOL_ACCEPTANCE_REVIEW';

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

interface FacultyDashboardData {
  kpi: FacultyDashboardKpi;
  recentProposals: RecentProposal[];
  facultyName: string;
  facultyId: string;
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
 * Stat Card Component for Faculty Dashboard
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
  const colorClasses = {
    red: 'bg-red-500 text-white',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-emerald-500 text-white',
    purple: 'bg-purple-500 text-white',
    cyan: 'bg-cyan-500 text-white',
    gray: 'bg-gray-500 text-white',
  };

  const bgClasses = {
    red: 'hover:border-red-300 hover:shadow-red-100',
    amber: 'hover:border-amber-300 hover:shadow-amber-100',
    blue: 'hover:border-blue-300 hover:shadow-blue-100',
    green: 'hover:border-emerald-300 hover:shadow-emerald-100',
    purple: 'hover:border-purple-300 hover:shadow-purple-100',
    cyan: 'hover:border-cyan-300 hover:shadow-cyan-100',
    gray: 'hover:border-gray-300 hover:shadow-gray-100',
  };

  const sizeClasses = size === 'large'
    ? 'p-6'
    : 'p-4';

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl border border-gray-200
        bg-white shadow-soft transition-all duration-300
        ${bgClasses[color]} hover:shadow-soft-lg
        ${onClick ? 'cursor-pointer' : ''}
        ${sizeClasses}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClasses[color]} shadow-sm`}>
          <Icon className={`h-5 w-5 ${size === 'large' ? 'h-6 w-6' : ''}`} />
        </div>
        <div>
          <p className={`text-gray-500 ${size === 'large' ? 'text-sm' : 'text-xs'}`}>{label}</p>
          <p className={`font-bold text-gray-900 ${size === 'large' ? 'text-2xl' : 'text-xl'}`}>{value}</p>
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
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Khoa
              </h1>
              <p className="mt-1 text-gray-600">
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
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">Cần hành động ngay</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={AlertTriangle}
              label="Cần duyệt"
              value={kpi.pendingReview}
              color="amber"
              size="large"
              onClick={() => handleViewByState('FACULTY_REVIEW')}
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
              onClick={() => handleViewByState('FACULTY_ACCEPTANCE_REVIEW')}
            />
            <StatCard
              icon={CheckCircle2}
              label="Đã nghiệm thu"
              value={kpi.acceptedByFaculty}
              color="green"
              size="large"
              onClick={() => handleViewByState('SCHOOL_ACCEPTANCE_REVIEW')}
            />
          </div>
        </div>

        {/* Overview Section: Tổng quan */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Tổng quan</h2>
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

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card variant="elevated">
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-blue-100 p-3">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tỷ lệ duyệt</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kpi.totalProposals > 0
                      ? Math.round((kpi.approved / kpi.totalProposals) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card variant="elevated">
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-amber-100 p-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Đề tài cần chú ý</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kpi.pendingReview + kpi.returned}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card variant="elevated">
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-emerald-100 p-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hoàn thành khoa</p>
                  <p className="text-2xl font-bold text-gray-900">{kpi.completed}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Recent Proposals */}
        <div>
          <Card variant="elevated">
            <CardHeader
              title="Đề tài gần đây của khoa"
              subtitle={`Hiển thị ${recentProposals.length} đề tài mới nhất`}
            />
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
