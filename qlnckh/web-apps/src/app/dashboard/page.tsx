import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  Star,
  UserCheck,
  Activity,
  TrendingUp,
  Calendar,
  RefreshCw,
  Mail,
  PieChart,
} from 'lucide-react';
import { apiClient } from '../../lib/auth/auth';
import { useAuthStore } from '../../stores/authStore';
import { getStateLabel } from '../../lib/constants/states';
import { Button } from '../../components/ui/Button';
import {
  StatusDistributionPieChart,
  MonthlyTrendBarChart,
} from '../../components/charts/DashboardCharts';

/**
 * Dashboard Types - PHONG_KHCN/ADMIN
 */
interface DashboardKpi {
  totalWaiting: number;
  overdueCount: number;
  t2WarningCount: number;
  completedThisMonth: number;
}

interface OverdueProposal {
  id: string;
  code: string;
  title: string;
  holderName: string;
  holderEmail: string;
  overdueDays: number;
  slaDeadline: string;
  slaStatus: string;
  state: string;
}

// Chart data types
interface StatusDistribution {
  state: string;
  stateName: string;
  count: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  newProposals: number;
  approved: number;
  completed: number;
}

interface DashboardData {
  kpi: DashboardKpi;
  overdueList: OverdueProposal[];
  lastUpdated: string;
  statusDistribution?: StatusDistribution[];
  monthlyTrends?: MonthlyTrend[];
}

interface DashboardResponse {
  success: true;
  data: DashboardData;
}

/**
 * Council Dashboard Types - HOI_DONG/THU_KY_HOI_DONG
 */
interface CouncilDashboardKpi {
  pendingEvaluation: number;
  evaluated: number;
  totalAssigned: number;
  pendingFinalize: number;
}

interface CouncilProposalItem {
  id: string;
  code: string;
  title: string;
  state: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  slaDeadline: string | null;
  hasSubmitted: boolean;
}

interface CouncilEvaluationItem {
  id: string;
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  state: string;
  conclusion: string | null;
  averageScore: number;
  updatedAt: string;
}

interface CouncilInfo {
  id: string;
  name: string;
  memberCount: number;
  isSecretary: boolean;
}

interface CouncilDashboardData {
  kpi: CouncilDashboardKpi;
  pendingProposals: CouncilProposalItem[];
  submittedEvaluations: CouncilEvaluationItem[];
  council: CouncilInfo | null;
  lastUpdated: string;
}

interface CouncilDashboardResponse {
  success: true;
  data: CouncilDashboardData;
}

/**
 * Dashboard Page Component
 *
 * Story 11.2: Dashboard with KPI Metrics
 * Multi-member: Council member dashboard
 *
 * Displays:
 * - PHONG_KHCN/ADMIN: KPI cards, overdue proposals list
 * - HOI_DONG/THU_KY_HOI_DONG: Pending evaluations, submitted evaluations, council info
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Redirect BAN_GIAM_HOC to their specific dashboard
  useEffect(() => {
    if (user?.role === 'BAN_GIAM_HOC' || user?.role === 'BGH') {
      navigate('/dashboard/bgh', { replace: true });
    }
  }, [user, navigate]);

  const [adminData, setAdminData] = useState<DashboardData | null>(null);
  const [councilData, setCouncilData] = useState<CouncilDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isCouncilMember = user?.role === 'HOI_DONG' || user?.role === 'THU_KY_HOI_DONG';
  const canViewAdminDashboard = user?.role === 'PHONG_KHCN' || user?.role === 'ADMIN';

  // Load dashboard data based on role
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (isCouncilMember) {
        // Load council dashboard
        const response = await apiClient.get<CouncilDashboardResponse>('/dashboard/council');
        setCouncilData(response.data.data);
      } else if (canViewAdminDashboard) {
        // Load admin dashboard
        const response = await apiClient.get<DashboardResponse>('/dashboard');
        setAdminData(response.data.data);
      } else {
        setError('Không tìm thấy dashboard phù hợp');
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError('Không thể tải dữ liệu dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemindOverdue = async () => {
    if (!confirm('Gửi email nhắc cho tất cả hồ sơ quá hạn?')) {
      return;
    }

    try {
      await apiClient.post('/dashboard/remind-overdue');
      alert('Đã gửi email nhắc thành công!');
      loadDashboard();
    } catch (err: any) {
      console.error('Failed to remind:', err);
      alert('Gửi email nhắc thất bại');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin" />
          <p className="mt-2 text-sm text-slate-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  // Council Member Dashboard
  if (councilData) {
    return <CouncilDashboard data={councilData} navigate={navigate} onRefresh={loadDashboard} />;
  }

  // Admin Dashboard (PHONG_KHCN/ADMIN)
  if (adminData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-serif">
                Dashboard Phòng KHCN
              </h1>
            </div>
            <p className="text-slate-500 ml-13">Tổng quan trạng thái đề tài nghiên cứu</p>
          </div>

          {/* KPI Cards - Blue-900 Style matching login - Clickable to navigate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              title="Đang chờ xử lý"
              value={adminData.kpi.totalWaiting}
              icon={<BarChart3 className="h-6 w-6" />}
              color="blue"
              gradient
              onClick={() => navigate('/proposals?status=pending')}
            />
            <KpiCard
              title="Sắp đến hạn"
              value={adminData.kpi.t2WarningCount}
              icon={<Clock className="h-6 w-6" />}
              color="amber"
              gradient
              onClick={() => navigate('/proposals?status=warning')}
            />
            <KpiCard
              title="Quá hạn SLA"
              value={adminData.kpi.overdueCount}
              icon={<AlertTriangle className="h-6 w-6" />}
              color="red"
              gradient
              onClick={() => navigate('/proposals?status=overdue')}
            />
            <KpiCard
              title="Hoàn thành tháng này"
              value={adminData.kpi.completedThisMonth}
              icon={<CheckCircle className="h-6 w-6" />}
              color="slate"
              gradient
              onClick={() => navigate('/proposals?status=completed')}
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8 flex gap-3">
            <Button
              onClick={handleRemindOverdue}
              variant="primary"
              leftIcon={<Mail className="h-4 w-4" />}
            >
              Nhắc hồ sơ quá hạn
            </Button>
            <Button
              onClick={() => loadDashboard()}
              variant="secondary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Làm mới
            </Button>
          </div>

          {/* Charts Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-blue-900 rounded-lg flex items-center justify-center">
                <PieChart className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">
                Thống kê & Biểu đồ
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution Pie Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <StatusDistributionPieChart
                  data={adminData.statusDistribution || []}
                />
              </div>

              {/* Monthly Trends Bar Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <MonthlyTrendBarChart
                  data={adminData.monthlyTrends || []}
                />
              </div>
            </div>
          </div>

          {/* Overdue Proposals */}
          {adminData.overdueList.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">
                      Hồ sơ quá hạn ({adminData.overdueList.length})
                    </h2>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Mã số
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Tên đề tài
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Người phụ trách
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Quá hạn
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {adminData.overdueList.map((proposal) => (
                      <tr
                        key={proposal.id}
                        onClick={() => navigate(`/proposals/${proposal.id}`)}
                        className="hover:bg-red-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {proposal.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {proposal.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {proposal.holderName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                          {proposal.overdueDays} ngày
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                            {getStateLabel(proposal.state)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No overdue message */}
          {adminData.overdueList.length === 0 && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-blue-900" />
              </div>
              <p className="text-slate-700 font-medium text-lg">Không có hồ sơ quá hạn!</p>
              <p className="text-slate-500 text-sm mt-2">Tất cả đề tài đều đang được xử lý đúng hạn</p>
            </div>
          )}

          {/* Last Updated */}
          {adminData.lastUpdated && (
            <p className="text-center text-slate-400 text-sm mt-6">
              Cập nhật lần cuối: {new Date(adminData.lastUpdated).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center text-slate-600">Không tìm thấy dashboard phù hợp</div>
    </div>
  );
}

/**
 * Council Member Dashboard Component
 */
interface CouncilDashboardProps {
  data: CouncilDashboardData;
  navigate: (path: string) => void;
  onRefresh: () => void;
}

function CouncilDashboard({ data, navigate, onRefresh }: CouncilDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-serif">
                Dashboard Hội đồng
              </h1>
            </div>
            <p className="text-slate-500 ml-13">
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
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{data.council.name}</h3>
                <p className="text-blue-200 mt-1">
                  {data.council.memberCount} thành viên • {data.council.isSecretary ? 'Thư ký' : 'Thành viên'}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold">{data.council.memberCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards - Blue-900 Style - Clickable to navigate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="Cần đánh giá"
            value={data.kpi.pendingEvaluation}
            icon={<FileText className="h-6 w-6" />}
            color="blue"
            gradient
            onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
          />
          <KpiCard
            title="Đã đánh giá"
            value={data.kpi.evaluated}
            icon={<CheckCircle className="h-6 w-6" />}
            color="slate"
            gradient
            onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW&evaluated=true')}
          />
          <KpiCard
            title="Tổng được giao"
            value={data.kpi.totalAssigned}
            icon={<Users className="h-6 w-6" />}
            color="slate"
            gradient
            onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
          />
          {data.council?.isSecretary && (
            <KpiCard
              title="Chờ finalize"
              value={data.kpi.pendingFinalize}
              icon={<Star className="h-6 w-6" />}
              color="amber"
              gradient
              onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW&pendingFinalize=true')}
            />
          )}
        </div>

        {/* Mini Stats Row - Blue-900 Style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-4 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <p className="text-blue-100 text-sm font-medium">Tiến độ đánh giá</p>
              <p className="text-2xl font-bold text-white">
                {data.kpi.totalAssigned > 0
                  ? Math.round((data.kpi.evaluated / data.kpi.totalAssigned) * 100)
                  : 0}%
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <p className="text-slate-200 text-sm font-medium">Tỷ lệ Đạt</p>
              <p className="text-2xl font-bold text-white">
                {data.submittedEvaluations.length > 0
                  ? Math.round((data.submittedEvaluations.filter(e => e.conclusion === 'DAT').length / data.submittedEvaluations.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-4 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <p className="text-amber-100 text-sm font-medium">Điểm trung bình</p>
              <p className="text-2xl font-bold text-white">
                {data.submittedEvaluations.length > 0
                  ? (data.submittedEvaluations.reduce((sum, e) => sum + e.averageScore, 0) / data.submittedEvaluations.length).toFixed(1)
                  : '0.0'}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Proposals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {data.pendingProposals.length > 0 ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">
                      Đề tài cần đánh giá ({data.pendingProposals.length})
                    </h2>
                  </div>
                  <button
                    onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
                    className="text-sm text-blue-100 hover:text-white transition-colors"
                  >
                    Xem tất cả →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Mã số
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Tên đề tài
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Người tạo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Hạn chờ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {data.pendingProposals.map((proposal) => (
                      <tr
                        key={proposal.id}
                        onClick={() => navigate(`/proposals/${proposal.id}`)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {proposal.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {proposal.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {proposal.ownerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {proposal.slaDeadline
                            ? new Date(proposal.slaDeadline).toLocaleDateString('vi-VN')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {proposal.hasSubmitted ? (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Đã gửi
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Chưa đánh giá
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <p className="text-gray-700 font-medium text-lg">Không có đề tài nào cần đánh giá!</p>
            </div>
          )}
        </div>

        {/* Submitted Evaluations */}
        {data.submittedEvaluations.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">
                    Đánh giá đã gửi ({data.submittedEvaluations.length})
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Đề tài
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Kết luận
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Điểm TB
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Ngày đánh giá
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {data.submittedEvaluations.map((evaluation) => (
                      <tr
                        key={evaluation.id}
                        onClick={() => navigate(`/proposals/${evaluation.proposalId}`)}
                        className="hover:bg-emerald-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{evaluation.proposalCode}</div>
                          <div className="text-gray-600 text-xs">{evaluation.proposalTitle}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                              evaluation.conclusion === 'DAT'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {evaluation.conclusion === 'DAT' ? 'Đạt' : 'Không đạt'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            {evaluation.averageScore}/5
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(evaluation.updatedAt).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {data.lastUpdated && (
          <p className="text-center text-slate-400 text-sm mt-6">
            Cập nhật lần cuối: {new Date(data.lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * KPI Card Component - Login Page Style (Blue-900 + Slate)
 */
interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'red' | 'green' | 'purple' | 'emerald' | 'amber' | 'teal' | 'slate';
  onClick?: () => void;
  gradient?: boolean;
}

function KpiCard({ title, value, icon, color, onClick, gradient = false }: KpiCardProps) {
  const gradientColors = {
    blue: 'bg-gradient-to-br from-blue-900 to-blue-800 text-white',
    yellow: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
    green: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
    teal: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white',
    slate: 'bg-gradient-to-br from-slate-700 to-slate-800 text-white',
  };

  const bgColors = {
    blue: 'bg-blue-50 text-blue-900',
    yellow: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600',
    slate: 'bg-slate-100 text-slate-700',
  };

  const borderColors = {
    blue: 'hover:border-blue-300 hover:shadow-blue-100',
    yellow: 'hover:border-amber-300 hover:shadow-amber-100',
    red: 'hover:border-red-300 hover:shadow-red-100',
    green: 'hover:border-emerald-300 hover:shadow-emerald-100',
    purple: 'hover:border-purple-300 hover:shadow-purple-100',
    emerald: 'hover:border-emerald-300 hover:shadow-emerald-100',
    amber: 'hover:border-amber-300 hover:shadow-amber-100',
    teal: 'hover:border-teal-300 hover:shadow-teal-100',
    slate: 'hover:border-slate-300 hover:shadow-slate-100',
  };

  if (gradient) {
    if (onClick) {
      return (
        <button
          onClick={onClick}
          className={`${gradientColors[color]} rounded-lg p-6 shadow-lg relative overflow-hidden group w-full text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              {icon}
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
            <p className="text-4xl font-bold">{value}</p>
          </div>
        </button>
      );
    }
    return (
      <div
        className={`${gradientColors[color]} rounded-lg p-6 shadow-lg relative overflow-hidden group`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
        <div className="relative">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
            {icon}
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
          <p className="text-4xl font-bold">{value}</p>
        </div>
      </div>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`bg-white rounded-lg shadow-md p-5 border-2 border-transparent transition-all duration-300 hover:shadow-lg ${borderColors[color]} cursor-pointer w-full text-left group`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColors[color]} shadow-sm`}>
            {icon}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColors[color]} shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
