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
 * Aesthetic Direction:
 * - Clean, minimal design with purposeful color accents
 * - Card-based layout with subtle shadows
 * - Warm color palette (orange/amber accents) for creativity
 * - Data visualization with progress indicators
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
  MoreVertical,
  Eye,
  Edit,
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
  | 'FACULTY_REVIEW'
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
 * Stat Card Component with hover effect and click navigation
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
  delay = 0,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  trend?: { value: number; isPositive: boolean };
  delay?: number;
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
  };

  const bgClasses = {
    blue: 'hover:border-blue-200 cursor-pointer',
    green: 'hover:border-emerald-200 cursor-pointer',
    amber: 'hover:border-amber-200 cursor-pointer',
    red: 'hover:border-red-200 cursor-pointer',
    purple: 'hover:border-purple-200 cursor-pointer',
  };

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ${bgClasses[color]} hover:shadow-lg hover:-translate-y-1`}
      style={{ animation: `fadeSlideIn 0.5s ease-out ${delay}ms both` }}
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="rounded-xl p-3 shadow-sm">
            <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                trend.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              <TrendingUp className={`h-3 w-3 ${trend.isPositive ? '' : 'rotate-180'}`} />
              {trend.value}%
            </div>
          )}
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
 * Quick Action Button Component
 */
function QuickActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'primary',
}: {
  icon: typeof Plus;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const variants = {
    primary: 'bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800',
    secondary: 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50',
  };

  const iconVariants = {
    primary: 'text-white',
    secondary: 'text-blue-600',
  };

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300 ${variants[variant]} shadow-sm hover:shadow-md`}
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-2.5 ${variant === 'primary' ? 'bg-white/20' : 'bg-blue-100'}`}>
          <Icon className={`h-5 w-5 ${iconVariants[variant]}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{label}</h3>
          <p className={`mt-1 text-sm ${variant === 'primary' ? 'text-blue-100' : 'text-gray-500'}`}>
            {description}
          </p>
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
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
  const [showActions, setShowActions] = useState(false);

  const canEdit = proposal.state === 'DRAFT' || proposal.state === 'CHANGES_REQUESTED';

  return (
    <div className="group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4 p-4">
        {/* Status indicator */}
        <div className={`h-2 w-2 rounded-full ${
          proposal.state === 'APPROVED' ? 'bg-emerald-500' :
          proposal.state === 'DRAFT' ? 'bg-gray-400' :
          proposal.state === 'REJECTED' ? 'bg-red-500' :
          'bg-blue-500'
        }`} />

        {/* Proposal info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{proposal.code}</span>
            <Badge className={getStatusColor(proposal.state)}>
              {getStatusLabel(proposal.state)}
            </Badge>
          </div>
          <h4 className="mt-1 truncate font-medium text-gray-900">{proposal.title}</h4>
          <p className="mt-1 text-xs text-gray-500">
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
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className={`rounded-full p-2 ${urgencyColor}`}>
        <Calendar className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{deadline.proposalTitle}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
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
          ['FACULTY_REVIEW', 'SCHOOL_REVIEW', 'COUNCIL_REVIEW'].includes(p.state)
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-600">Đang tải dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Welcome */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Xin chào, {user?.displayName || 'Giảng viên'}!
              </h1>
              <p className="mt-1 text-gray-600">
                Đây là tổng quan về các đề tài nghiên cứu của bạn
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateProposal}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              Tạo đề tài mới
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={FileText}
            label="Tổng số đề tài"
            value={stats.total}
            color="blue"
            delay={100}
            onClick={() => navigate('/proposals')}
          />
          <StatCard
            icon={Clock}
            label="Đang duyệt"
            value={stats.underReview}
            color="amber"
            delay={200}
            onClick={() => navigate('/proposals?state=FACULTY_REVIEW,SCHOOL_SELECTION_REVIEW,OUTLINE_COUNCIL_REVIEW,SCHOOL_ACCEPTANCE_REVIEW')}
          />
          <StatCard
            icon={CheckCircle2}
            label="Đã duyệt"
            value={stats.approved}
            color="green"
            delay={300}
            onClick={() => navigate('/proposals?state=APPROVED,IN_PROGRESS,COMPLETED,HANDOVER')}
          />
          <StatCard
            icon={Edit}
            label="Bản nháp"
            value={stats.draft}
            color="purple"
            delay={400}
            onClick={() => navigate('/proposals?state=DRAFT')}
          />
          <StatCard
            icon={AlertCircle}
            label="Cần sửa"
            value={stats.changesRequested}
            color="amber"
            delay={500}
            onClick={() => navigate('/proposals?state=CHANGES_REQUESTED')}
          />
          <StatCard
            icon={TrendingUp}
            label="Đã từ chối"
            value={stats.rejected}
            color="red"
            delay={600}
            onClick={() => navigate('/proposals?state=REJECTED')}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hành động nhanh</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionButton
              icon={Plus}
              label="Tạo đề tài mới"
              description="Đăng ký đề tài NCKH"
              onClick={handleCreateProposal}
            />
            <QuickActionButton
              icon={FileText}
              label="Xem bản nháp"
              description={`${stats.draft} đề tài nháp`}
              onClick={() => navigate('/proposals?state=DRAFT')}
              variant="secondary"
            />
            <QuickActionButton
              icon={Clock}
              label="Cần xử lý"
              description={`${stats.changesRequested} đề tài cần sửa`}
              onClick={() => navigate('/proposals?state=CHANGES_REQUESTED')}
              variant="secondary"
            />
            <QuickActionButton
              icon={Eye}
              label="Tất cả đề tài"
              description="Xem danh sách đầy đủ"
              onClick={handleViewAllProposals}
              variant="secondary"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Proposals */}
          <div className="lg:col-span-2">
            <Card variant="elevated">
              <CardHeader
                title="Đề tài gần đây"
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
                        onEdit={handleEditProposal}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Bạn chưa có đề tài nào</p>
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
              </CardBody>
            </Card>
          </div>

          {/* Upcoming Deadlines */}
          <div>
            <Card variant="elevated">
              <CardHeader
                title="Deadline sắp tới"
                subtitle="Đề tài cần chú ý"
              />
              <CardBody className="space-y-3">
                {deadlines.length > 0 ? (
                  deadlines.map((deadline) => (
                    <DeadlineCard key={deadline.proposalId} deadline={deadline} />
                  ))
                ) : (
                  <div className="py-6 text-center text-sm text-gray-500">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    Không có deadline gấp
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Tips Card */}
            <Card variant="flat" className="mt-4">
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">Mẹo nâng cao tỷ lệ duyệt</h4>
                    <p className="mt-1 text-xs text-gray-600">
                      Đảm bảo đề tài có đủ thông tin, rõ ràng và có tính khoa học cao để
                      được duyệt nhanh hơn.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
