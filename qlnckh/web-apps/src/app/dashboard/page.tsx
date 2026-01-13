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
} from 'lucide-react';
import { apiClient } from '../../lib/auth/auth';
import { useAuthStore } from '../../stores/authStore';
import { getStateLabel } from '../../lib/constants/states';

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

interface DashboardData {
  kpi: DashboardKpi;
  overdueList: OverdueProposal[];
  lastUpdated: string;
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
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Tổng quan trạng thái đề tài nghiên cứu</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              title="Đang chờ xử lý"
              value={adminData.kpi.totalWaiting}
              icon={<BarChart3 className="h-6 w-6" />}
              color="blue"
              onClick={() => navigate('/proposals?state=FACULTY_REVIEW,SCHOOL_SELECTION_REVIEW,OUTLINE_COUNCIL_REVIEW,FACULTY_ACCEPTANCE_REVIEW,SCHOOL_ACCEPTANCE_REVIEW,HANDOVER,CHANGES_REQUESTED')}
            />
            <KpiCard
              title="Sắp đến hạn"
              value={adminData.kpi.t2WarningCount}
              icon={<Users className="h-6 w-6" />}
              color="yellow"
              onClick={() => navigate('/proposals')}
            />
            <KpiCard
              title="Quá hạn SLA"
              value={adminData.kpi.overdueCount}
              icon={<AlertTriangle className="h-6 w-6" />}
              color="red"
              onClick={() => navigate('/proposals?overdue=true')}
            />
            <KpiCard
              title="Hoàn thành tháng này"
              value={adminData.kpi.completedThisMonth}
              icon={<CheckCircle className="h-6 w-6" />}
              color="green"
              onClick={() => navigate('/proposals?state=COMPLETED')}
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8 flex gap-4">
            <button
              onClick={handleRemindOverdue}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              📧 Nhắc hồ sơ quá hạn
            </button>
            <button
              onClick={() => loadDashboard()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              🔄 Làm mới
            </button>
          </div>

          {/* Overdue Proposals */}
          {adminData.overdueList.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Hồ sơ quá hạn ({adminData.overdueList.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Mã số
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tên đề tài
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Người phụ trách
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Quá hạn
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminData.overdueList.map((proposal) => (
                      <tr
                        key={proposal.id}
                        onClick={() => navigate(`/proposals/${proposal.id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {proposal.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {proposal.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {proposal.holderName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {proposal.overdueDays} ngày
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
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
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">Không có hồ sơ quá hạn!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center text-gray-600">Không tìm thấy dashboard phù hợp</div>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Hội đồng</h1>
            <p className="text-gray-600 mt-1">
              {data.council?.isSecretary
                ? `Thư ký - ${data.council.name}`
                : data.council?.name || 'Thành viên hội đồng'}
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            🔄 Làm mới
          </button>
        </div>

        {/* Council Info Card */}
        {data.council && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-full">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{data.council.name}</h3>
                <p className="text-sm text-gray-600">
                  {data.council.memberCount} thành viên • {data.council.isSecretary ? 'Thư ký' : 'Thành viên'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="Cần đánh giá"
            value={data.kpi.pendingEvaluation}
            icon={<FileText className="h-6 w-6" />}
            color="blue"
            onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
          />
          <KpiCard
            title="Đã đánh giá"
            value={data.kpi.evaluated}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <KpiCard
            title="Tổng được giao"
            value={data.kpi.totalAssigned}
            icon={<Users className="h-6 w-6" />}
            color="yellow"
          />
          {data.council?.isSecretary && (
            <KpiCard
              title="Chờ finalize"
              value={data.kpi.pendingFinalize}
              icon={<Star className="h-6 w-6" />}
              color="purple"
              onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
            />
          )}
        </div>

        {/* Pending Proposals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Đề tài cần đánh giá ({data.pendingProposals.length})
            </h2>
            {data.pendingProposals.length > 0 && (
              <button
                onClick={() => navigate('/proposals?state=OUTLINE_COUNCIL_REVIEW')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Xem tất cả →
              </button>
            )}
          </div>

          {data.pendingProposals.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Mã số
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tên đề tài
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Người tạo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Hạn chờ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.pendingProposals.map((proposal) => (
                      <tr
                        key={proposal.id}
                        onClick={() => navigate(`/proposals/${proposal.id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Đã gửi
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
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
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">Không có đề tài nào cần đánh giá!</p>
            </div>
          )}
        </div>

        {/* Submitted Evaluations */}
        {data.submittedEvaluations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Đánh giá đã gửi ({data.submittedEvaluations.length})
              </h2>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Đề tài
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Kết luận
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Điểm TB
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ngày đánh giá
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.submittedEvaluations.map((evaluation) => (
                      <tr
                        key={evaluation.id}
                        onClick={() => navigate(`/proposals/${evaluation.proposalId}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{evaluation.proposalCode}</div>
                          <div className="text-gray-600 text-xs">{evaluation.proposalTitle}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              evaluation.conclusion === 'DAT'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {evaluation.conclusion === 'DAT' ? 'Đạt' : 'Không đạt'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
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
      </div>
    </div>
  );
}

/**
 * KPI Card Component
 */
interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'red' | 'green' | 'purple';
  onClick?: () => void;
}

function KpiCard({ title, value, icon, color, onClick }: KpiCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const borderColors = {
    blue: 'hover:border-blue-400',
    yellow: 'hover:border-yellow-400',
    red: 'hover:border-red-400',
    green: 'hover:border-green-400',
    purple: 'hover:border-purple-400',
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`bg-white rounded-lg shadow p-6 border-2 border-transparent transition-all hover:shadow-lg ${borderColors[color]} cursor-pointer w-full text-left`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colors[color]}`}>{icon}</div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
