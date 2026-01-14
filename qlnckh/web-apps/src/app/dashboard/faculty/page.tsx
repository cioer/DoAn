/**
 * Faculty Dashboard for QUAN_LY_KHOA (Faculty Manager)
 *
 * Features:
 * - Faculty-specific KPI metrics
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
  Users,
  Eye,
  Settings,
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
  delay = 0,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'teal';
  delay?: number;
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
    cyan: 'bg-cyan-500 text-white',
    teal: 'bg-teal-500 text-white',
  };

  const bgClasses = {
    blue: 'hover:border-blue-200',
    green: 'hover:border-emerald-200',
    amber: 'hover:border-amber-200',
    red: 'hover:border-red-200',
    purple: 'hover:border-purple-200',
    cyan: 'hover:border-cyan-200',
    teal: 'hover:border-teal-200',
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ${bgClasses[color]} hover:shadow-lg ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animation: `fadeSlideIn 0.5s ease-out ${delay}ms both` }}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="rounded-xl p-3 shadow-sm">
            <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
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

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          <StatCard
            icon={FileText}
            label="Tổng số"
            value={kpi.totalProposals}
            color="blue"
            delay={100}
            onClick={() => navigate('/proposals')}
          />
          <StatCard
            icon={Clock}
            label="Chờ duyệt"
            value={kpi.pendingReview}
            color="amber"
            delay={200}
            onClick={() => handleViewByState('FACULTY_REVIEW')}
          />
          <StatCard
            icon={CheckCircle2}
            label="Đã duyệt"
            value={kpi.approved}
            color="green"
            delay={300}
            onClick={() => handleViewByState('APPROVED')}
          />
          <StatCard
            icon={AlertCircle}
            label="Cần sửa"
            value={kpi.returned}
            color="red"
            delay={400}
            onClick={() => handleViewByState('CHANGES_REQUESTED')}
          />
          <StatCard
            icon={TrendingUp}
            label="Đang thực hiện"
            value={kpi.inProgress}
            color="purple"
            delay={500}
            onClick={() => handleViewByState('DRAFT')}
          />
          <StatCard
            icon={CheckCircle2}
            label="Hoàn thành"
            value={kpi.completed}
            color="green"
            delay={600}
            onClick={() => handleViewByState('COMPLETED')}
          />
          <StatCard
            icon={Clock}
            label="Chờ nghiệm thu"
            value={kpi.pendingAcceptance}
            color="cyan"
            delay={700}
            onClick={() => handleViewByState('FACULTY_ACCEPTANCE_REVIEW')}
          />
          <StatCard
            icon={CheckCircle2}
            label="Đã nghiệm thu"
            value={kpi.acceptedByFaculty}
            color="teal"
            delay={800}
            onClick={() => handleViewByState('SCHOOL_ACCEPTANCE_REVIEW')}
          />
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
