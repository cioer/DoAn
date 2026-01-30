/**
 * Personal Dashboard for GIANG_VIEN (Teacher/Researcher)
 *
 * Features:
 * - Personal proposal statistics
 * - Quick actions (create proposal, view drafts)
 * - Recent proposals with status
 * - Upcoming deadlines
 * - Submission timeline
 *
 * Design: Modern Soft UI matching login page style
 * - Blue-900 primary color
 * - Slate color palette for text
 * - Rounded-lg corners
 * - Font-serif for headings
 * - Shadow-lg for depth
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Eye,
  Edit,
  Sparkles,
  Target,
} from 'lucide-react';
import { proposalsApi, Proposal } from '../../../lib/api/proposals';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

/**
 * Proposal Status for color coding
 */
type ProposalStatus =
  | 'DRAFT'
  | 'FACULTY_COUNCIL_OUTLINE_REVIEW'
  | 'SCHOOL_REVIEW'
  | 'COUNCIL_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'
  | 'WITHDRAWN';

interface DashboardStats {
  total: number;
  draft: number;
  underReview: number;
  approved: number;
  rejected: number;
  changesRequested: number;
}

interface RecentProposal {
  id: string;
  code: string;
  title: string;
  state: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string;
}

interface UpcomingDeadline {
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  deadline: string;
  daysRemaining: number;
  type: 'submission' | 'revision' | 'presentation';
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
  };
  return labels[state] || state;
};

const getDeadlineColor = (days: number): string => {
  if (days <= 2) return 'text-red-600 bg-red-50';
  if (days <= 7) return 'text-amber-600 bg-amber-50';
  return 'text-emerald-600 bg-emerald-50';
};

/**
 * Stat Card Component - Modern Soft UI matching login page style
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'emerald' | 'orange';
  onClick?: () => void;
}) {
  const gradientColors = {
    blue: 'bg-gradient-to-br from-blue-900 to-blue-800',
    green: 'bg-gradient-to-br from-slate-700 to-slate-800',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
    red: 'bg-gradient-to-br from-red-500 to-red-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    emerald: 'bg-gradient-to-br from-slate-700 to-slate-800',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  };

  const bgColors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-slate-50 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-slate-50 text-slate-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="group relative overflow-hidden rounded-lg bg-white p-5 shadow-md transition-all duration-300 hover:shadow-lg border-2 border-transparent hover:border-blue-200 cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColors[color]} shadow-sm`}>
            <Icon className={`h-6 w-6`} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className={`${gradientColors[color]} rounded-lg p-6 shadow-lg relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
      <div className="relative">
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
        <p className="text-4xl font-bold text-white">{value}</p>
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
  onEdit,
}: {
  proposal: RecentProposal;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const canEdit = proposal.state === 'DRAFT' || proposal.state === 'CHANGES_REQUESTED';

  return (
    <div className="group border-b border-slate-100 last:border-0 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-300">
      <div className="flex items-center gap-4 p-4">
        {/* Status indicator */}
        <div className={`h-2.5 w-2.5 rounded-full ${
          proposal.state === 'APPROVED' ? 'bg-emerald-500 shadow-sm shadow-emerald-200' :
          proposal.state === 'DRAFT' ? 'bg-slate-400' :
          proposal.state === 'REJECTED' ? 'bg-red-500 shadow-sm shadow-red-200' :
          proposal.state === 'CHANGES_REQUESTED' ? 'bg-amber-500 shadow-sm shadow-amber-200' :
          'bg-blue-500 shadow-sm shadow-blue-200'
        }`} />

        {/* Proposal info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 font-medium">{proposal.code}</span>
            <Badge className={getStatusColor(proposal.state)}>
              {getStatusLabel(proposal.state)}
            </Badge>
          </div>
          <h4 className="mt-1 truncate font-medium text-slate-900">{proposal.title}</h4>
          <p className="mt-1 text-xs text-slate-500">
            Cập nhật: {new Date(proposal.updatedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onView(proposal.id)}
            leftIcon={<Eye className="h-3 w-3" />}
          >
            Xem
          </Button>
          {canEdit && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => onEdit(proposal.id)}
              leftIcon={<Edit className="h-3 w-3" />}
            >
              Sửa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Deadline Card Component
 */
function DeadlineCard({ deadline }: { deadline: UpcomingDeadline }) {
  const urgencyColor = getDeadlineColor(deadline.daysRemaining);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={`rounded-lg p-2 ${urgencyColor}`}>
        <Calendar className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{deadline.proposalTitle}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{deadline.proposalCode}</span>
          <span>•</span>
          <span>{new Date(deadline.deadline).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>
      <div className={`rounded-lg px-2 py-1 text-xs font-bold ${urgencyColor}`}>
        {deadline.daysRemaining > 0 ? `${deadline.daysRemaining} ngày` : 'Hôm nay'}
      </div>
    </div>
  );
}

/**
 * Main Dashboard Page Component
 */
export default function ResearcherDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    draft: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    changesRequested: 0,
  });
  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load user's proposals
      const proposals = await proposalsApi.getProposals({});

      // Calculate stats
      const proposalList = proposals.data || [];
      setStats({
        total: proposalList.length,
        draft: proposalList.filter((p: Proposal) => p.state === 'DRAFT').length,
        underReview: proposalList.filter((p: Proposal) =>
          ['FACULTY_COUNCIL_OUTLINE_REVIEW', 'SCHOOL_REVIEW', 'COUNCIL_REVIEW'].includes(p.state)
        ).length,
        approved: proposalList.filter((p: Proposal) => p.state === 'APPROVED').length,
        rejected: proposalList.filter((p: Proposal) => p.state === 'REJECTED').length,
        changesRequested: proposalList.filter((p: Proposal) => p.state === 'CHANGES_REQUESTED').length,
      });

      // Set recent proposals (latest 5)
      setRecentProposals(
        proposalList.slice(0, 5).map((p: Proposal) => ({
          id: p.id,
          code: p.code,
          title: p.title,
          state: p.state as ProposalStatus,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          slaDeadline: p.slaDeadline,
        }))
      );

      // Simulate deadlines (would come from API)
      setDeadlines([
        {
          proposalId: '1',
          proposalCode: 'NCKH-2024-001',
          proposalTitle: 'Nghiên cứu AI trong giáo dục',
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          daysRemaining: 2,
          type: 'submission',
        },
        {
          proposalId: '2',
          proposalCode: 'NCKH-2024-002',
          proposalTitle: 'Ứng dụng Blockchain trong tài chính',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          daysRemaining: 5,
          type: 'revision',
        },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };

  const handleEditProposal = (id: string) => {
    navigate(`/proposals/${id}/edit`);
  };

  const handleCreateProposal = () => {
    navigate('/proposals/new');
  };

  const handleViewAllProposals = () => {
    navigate('/proposals');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
          <p className="text-slate-800 font-medium">Đang tải dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Welcome - Modern Soft UI Style */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 font-serif">
                  Xin chào, {user?.displayName || 'Giảng viên'}!
                </h1>
              </div>
              <p className="text-slate-500 ml-15">
                Đây là tổng quan về các đề tài nghiên cứu của bạn
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateProposal}
              leftIcon={<Plus className="h-5 w-5" />}
              className="bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-slate-700 shadow-lg"
            >
              Tạo đề tài mới
            </Button>
          </div>
        </div>

        {/* Stats Grid - Gradient Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={FileText}
            label="Tổng số đề tài"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Đang duyệt"
            value={stats.underReview}
            color="amber"
          />
          <StatCard
            icon={CheckCircle2}
            label="Đã duyệt"
            value={stats.approved}
            color="emerald"
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Edit}
            label="Bản nháp"
            value={stats.draft}
            color="purple"
            onClick={() => navigate('/proposals?state=DRAFT')}
          />
          <StatCard
            icon={AlertCircle}
            label="Cần sửa"
            value={stats.changesRequested}
            color="orange"
            onClick={() => navigate('/proposals?state=CHANGES_REQUESTED')}
          />
          <StatCard
            icon={TrendingUp}
            label="Đã từ chối"
            value={stats.rejected}
            color="red"
            onClick={() => navigate('/proposals?state=REJECTED')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Proposals */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">Đề tài gần đây</h2>
                </div>
                <p className="text-blue-100 text-sm mt-1">
                  Hiển thị {recentProposals.length} đề tài mới nhất
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {recentProposals.length > 0 ? (
                  recentProposals.map((proposal) => (
                    <ProposalRow
                      key={proposal.id}
                      proposal={proposal}
                      onView={handleViewProposal}
                      onEdit={handleEditProposal}
                    />
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-10 w-10 text-blue-500" />
                    </div>
                    <p className="text-slate-700 font-medium">Bạn chưa có đề tài nào</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      onClick={handleCreateProposal}
                    >
                      Tạo đề tài đầu tiên
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">Deadline sắp tới</h2>
                </div>
                <p className="text-red-100 text-sm mt-1">
                  {deadlines.length} đề tài cần chú ý
                </p>
              </div>
              <div className="p-4 space-y-3">
                {deadlines.length > 0 ? (
                  deadlines.map((deadline) => (
                    <DeadlineCard key={deadline.proposalId} deadline={deadline} />
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-slate-500">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    Không có deadline gấp
                  </div>
                )}
              </div>
            </div>

            {/* Tips Card - Modern Soft UI Style */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Mẹo nâng cao tỷ lệ duyệt</h4>
                  <p className="text-indigo-100 text-sm">
                    Đảm bảo đề tài có đủ thông tin, rõ ràng và có tính khoa học cao để
                    được duyệt nhanh hơn.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/proposals?state=DRAFT')}
                className="justify-start"
              >
                <Edit className="h-4 w-4 mr-2" />
                Bản nháp ({stats.draft})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/proposals?state=CHANGES_REQUESTED')}
                className="justify-start"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Cần sửa ({stats.changesRequested})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewAllProposals}
                className="justify-start col-span-2"
              >
                <FileText className="h-4 w-4 mr-2" />
                Tất cả đề tài
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
