import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../lib/auth/auth';

/**
 * Dashboard Types
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
 * Dashboard Page Component
 *
 * Story 11.2: Dashboard with KPI Metrics
 *
 * Displays:
 * - KPI cards (total waiting, overdue, T-2 warning, completed)
 * - Overdue proposals list
 * - Quick actions
 *
 * Access: PHONG_KHCN and ADMIN roles only
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load dashboard data
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.get<DashboardResponse>('/dashboard');
      setData(response.data.data);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Tổng quan trạng thái đề tài nghiên cứu</p>
        </div>

        {data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                title="Tổng số đề tài"
                value={data.kpi.totalWaiting}
                icon={<BarChart3 className="h-6 w-6" />}
                color="blue"
              />
              <KpiCard
                title="Đang chờ duyệt"
                value={data.kpi.totalWaiting}
                icon={<Users className="h-6 w-6" />}
                color="yellow"
              />
              <KpiCard
                title="Quá hạn SLA"
                value={data.kpi.overdueCount}
                icon={<AlertTriangle className="h-6 w-6" />}
                color="red"
              />
              <KpiCard
                title="Hoàn thành tháng này"
                value={data.kpi.completedThisMonth}
                icon={<CheckCircle className="h-6 w-6" />}
                color="green"
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
            {data.overdueList.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Hồ sơ quá hạn ({data.overdueList.length})
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
                      {data.overdueList.map((proposal) => (
                        <tr key={proposal.id} className="hover:bg-gray-50">
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
                              {proposal.state}
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
            {data.overdueList.length === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">Không có hồ sơ quá hạn!</p>
              </div>
            )}
          </>
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
  color: 'blue' | 'yellow' | 'red' | 'green';
}

function KpiCard({ title, value, icon, color }: KpiCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
