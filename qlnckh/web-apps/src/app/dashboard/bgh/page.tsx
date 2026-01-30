/**
 * BAN_GIAM_HOC (Hiệu trưởng) Dashboard
 *
 * Executive dashboard for Ban Giám Học - highest decision-making authority
 * Shows proposals awaiting school acceptance (nghiệm thu cấp trường)
 *
 * Design Direction: Modern Soft UI matching login page style
 * - Blue-900 primary color
 * - Slate color palette for text
 * - Rounded-lg corners
 * - Font-serif for headings
 * - Shadow-lg for depth
 */

'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
  Package,
  RotateCcw,
  Users,
  Building,
  TrendingUp,
  BarChart3,
  Activity,
  Calendar,
} from 'lucide-react';
import { bghDashboardApi, type BghDashboardData } from '../../../lib/api/bgh-dashboard';
import { workflowApi, generateIdempotencyKey } from '../../../lib/api/workflow';
import { useAuthStore } from '../../../stores/authStore';
import type { LucideIcon } from 'lucide-react';
import {
  ProposalStateDonutChart,
  FacultyPerformanceBarChart,
} from '../../../components/charts/DashboardCharts';

// Helper Components
interface SystemStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: 'emerald' | 'amber' | 'green' | 'red' | 'blue' | 'teal';
}

function SystemStatCard({ label, value, icon: Icon, color }: SystemStatCardProps) {
  const colorClasses = {
    emerald: 'bg-gradient-to-br from-slate-700 to-slate-800 text-white',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
    green: 'bg-gradient-to-br from-slate-700 to-slate-800 text-white',
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
    blue: 'bg-gradient-to-br from-blue-900 to-blue-800 text-white',
    teal: 'bg-gradient-to-br from-blue-900 to-slate-800 text-white',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 shadow-md`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs opacity-80">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface UserStatRowProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'purple' | 'teal' | 'red';
}

function UserStatRow({ label, value, color }: UserStatRowProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    teal: 'bg-teal-50 text-teal-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${colorClasses[color]}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export default function BghDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<BghDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'returned'>('pending');

  // Processing states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bghDashboardApi.getBghDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error('Failed to load BGH dashboard:', err);
      setError(err?.response?.data?.error?.message || 'Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (proposalId: string, proposalCode: string) => {
    setProcessingId(proposalId);
    setActionResult(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.acceptSchoolReview(proposalId, idempotencyKey);
      setActionResult({
        type: 'success',
        message: `Đã nghiệm thu đề tài ${proposalCode}`,
      });
      await loadDashboard();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error?.message || 'Không thể nghiệm thu đề tài';
      setActionResult({ type: 'error', message: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReturn = async (proposalId: string, proposalCode: string) => {
    const reason = prompt('Nhập lý do yêu cầu hoàn thiện:');
    if (!reason || reason.trim().length === 0) {
      return;
    }

    setProcessingId(proposalId);
    setActionResult(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.returnSchoolReview(proposalId, idempotencyKey, reason.trim());
      setActionResult({
        type: 'success',
        message: `Đã yêu cầu hoàn thiện đề tài ${proposalCode}`,
      });
      await loadDashboard();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error?.message || 'Không thể yêu cầu hoàn thiện';
      setActionResult({ type: 'error', message: errorMsg });
    } finally {
      setProcessingId(null);
    }
  };

  const getProposals = () => {
    if (!dashboardData) return [];
    switch (activeTab) {
      case 'pending':
        return dashboardData.pendingProposals;
      case 'approved':
        return dashboardData.recentlyApproved;
      case 'returned':
        return dashboardData.returnedProposals;
      default:
        return [];
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-900 border-t-transparent mb-4"></div>
          <p className="text-slate-800 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full border border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-slate-600 text-center mb-6">{error}</p>
          <button
            onClick={loadDashboard}
            className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-medium"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const kpi = dashboardData?.kpi;
  const proposals = getProposals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header with Modern Soft UI Styling */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-serif">
                  Dashboard Hiệu Trưởng
                </h1>
                <p className="text-blue-200 text-sm mt-1">Ban Giám Học - Nghiệm thu cấp Trường</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-sm">Xin chào,</p>
              <p className="font-semibold text-lg">{user?.displayName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Result Notification */}
        {actionResult && (
          <div
            className={`mb-6 p-4 rounded-lg border-l-4 shadow-md flex items-center gap-3 ${
              actionResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                : 'bg-red-50 border-red-500 text-red-800'
            }`}
          >
            {actionResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{actionResult.message}</span>
            <button
              onClick={() => setActionResult(null)}
              className="ml-auto opacity-60 hover:opacity-100"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Quick Action KPI Cards */}
        {kpi && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Pending Acceptance */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Scale className="w-6 h-6" />
                </div>
                <p className="text-amber-100 text-sm font-medium mb-1">Chờ nghiệm thu</p>
                <p className="text-4xl font-bold">{kpi.pendingAcceptance}</p>
              </div>
            </div>

            {/* Approved */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 text-white shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-slate-200 text-sm font-medium mb-1">Đã nghiệm thu</p>
                <p className="text-4xl font-bold">{kpi.approved}</p>
              </div>
            </div>

            {/* Returned */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <p className="text-orange-100 text-sm font-medium mb-1">Yêu cầu hoàn thiện</p>
                <p className="text-4xl font-bold">{kpi.returned}</p>
              </div>
            </div>

            {/* Total Pending */}
            <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-amber-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -translate-y-16 translate-x-16" />
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg flex items-center justify-center mb-4 shadow">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <p className="text-slate-500 text-sm font-medium mb-1">Tổng cần xử lý</p>
                <p className="text-4xl font-bold text-slate-900">{kpi.totalPending}</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SYSTEM-WIDE STATISTICS ==================== */}
        {dashboardData?.systemKpi && (
          <>
            {/* Section Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-serif">
                Thống kê toàn hệ thống
              </h2>
            </div>

            {/* System Overview KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <SystemStatCard label="Tổng đề tài" value={dashboardData.systemKpi.totalProposals} icon={FileText} color="emerald" />
              <SystemStatCard label="Đang duyệt" value={dashboardData.systemKpi.facultyReview + dashboardData.systemKpi.councilReview + dashboardData.systemKpi.schoolSelectionReview} icon={Clock} color="amber" />
              <SystemStatCard label="Đã duyệt" value={dashboardData.systemKpi.approved} icon={CheckCircle2} color="green" />
              <SystemStatCard label="Đã từ chối" value={dashboardData.systemKpi.rejected} icon={AlertTriangle} color="red" />
              <SystemStatCard label="Đã hoàn thành" value={dashboardData.systemKpi.completed} icon={Activity} color="blue" />
              <SystemStatCard label="Tỷ lệ duyệt" value={`${dashboardData.systemKpi.approvalRate}%`} icon={TrendingUp} color="teal" />
            </div>

            {/* Charts Row - State Distribution & Faculty Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Proposal State Distribution Donut Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <ProposalStateDonutChart
                  data={[
                    { state: 'DRAFT', stateName: 'Nháp', count: dashboardData.systemKpi.draft },
                    { state: 'FACULTY_COUNCIL_OUTLINE_REVIEW', stateName: 'Xét duyệt Khoa', count: dashboardData.systemKpi.facultyReview },
                    { state: 'COUNCIL_REVIEW', stateName: 'Xét duyệt Hội đồng', count: dashboardData.systemKpi.councilReview },
                    { state: 'SCHOOL_REVIEW', stateName: 'Xét duyệt Trường', count: dashboardData.systemKpi.schoolSelectionReview },
                    { state: 'APPROVED', stateName: 'Đã duyệt', count: dashboardData.systemKpi.approved },
                    { state: 'REJECTED', stateName: 'Từ chối', count: dashboardData.systemKpi.rejected },
                    { state: 'CHANGES_REQUESTED', stateName: 'Yêu cầu sửa', count: dashboardData.systemKpi.changesRequested },
                    { state: 'IN_PROGRESS', stateName: 'Đang thực hiện', count: dashboardData.systemKpi.inProgress },
                    { state: 'ACCEPTANCE_REVIEW', stateName: 'Nghiệm thu', count: dashboardData.systemKpi.schoolAcceptanceReview },
                    { state: 'COMPLETED', stateName: 'Hoàn thành', count: dashboardData.systemKpi.completed },
                    { state: 'HANDOVER', stateName: 'Bàn giao', count: dashboardData.systemKpi.handover },
                  ]}
                  title="Phân bổ trạng thái đề tài"
                  size="medium"
                />
              </div>

              {/* Faculty Performance Bar Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <FacultyPerformanceBarChart
                  data={dashboardData.facultyStats}
                  title="Hiệu suất theo Khoa"
                  maxFaculties={8}
                />
              </div>
            </div>

            {/* Detailed Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Faculty Statistics */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">Theo Khoa</h3>
                  </div>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto">
                  {dashboardData.facultyStats.map((faculty) => (
                    <div key={faculty.facultyId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{faculty.facultyName}</p>
                        <p className="text-xs text-slate-500">{faculty.facultyCode}</p>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className="text-slate-600">{faculty.totalProposals}</span>
                        <span className="text-emerald-600">{faculty.approved}</span>
                        <span className="text-red-500">{faculty.rejected}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Statistics */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">Người dùng</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-slate-900">{dashboardData.userStats.totalUsers}</p>
                    <p className="text-sm text-slate-500">Tổng số người dùng</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <UserStatRow label="Giảng viên" value={dashboardData.userStats.giangVien} color="blue" />
                    <UserStatRow label="Trưởng khoa" value={dashboardData.userStats.quanLyKhoa} color="green" />
                    <UserStatRow label="Hội đồng" value={dashboardData.userStats.hoiDong} color="amber" />
                    <UserStatRow label="Thư ký" value={dashboardData.userStats.thuKyHoiDong} color="purple" />
                    <UserStatRow label="Phong KHCN" value={dashboardData.userStats.phongKhcn} color="teal" />
                    <UserStatRow label="BGH" value={dashboardData.userStats.banGiamHoc} color="red" />
                  </div>
                </div>
              </div>

              {/* Council Statistics */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">Hội đồng</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-teal-50 rounded-lg">
                      <p className="text-2xl font-bold text-teal-700">{dashboardData.councilStats.totalCouncils}</p>
                      <p className="text-xs text-teal-600">Tổng hội đồng</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">{dashboardData.councilStats.activeCouncils}</p>
                      <p className="text-xs text-emerald-600">Đang hoạt động</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-700">{dashboardData.councilStats.pendingProposals}</p>
                      <p className="text-xs text-amber-600">Đang chờ duyệt</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">{dashboardData.councilStats.totalMembers}</p>
                      <p className="text-xs text-blue-600">Thành viên</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">Xu hướng 6 tháng gần nhất</h3>
                </div>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3">Tháng</th>
                      <th className="pb-3 text-center">Mới</th>
                      <th className="pb-3 text-center">Duyệt</th>
                      <th className="pb-3 text-center">Từ chối</th>
                      <th className="pb-3 text-center">Hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.monthlyTrends.map((trend) => {
                      const monthName = new Date(trend.month + '-01').toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' });
                      return (
                        <tr key={trend.month} className="hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-900">{monthName}</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {trend.newProposals}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">
                              {trend.approved}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                              {trend.rejected}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                              {trend.completed}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SLA Compliance */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-6 text-white shadow-lg mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Tuân thủ SLA</h3>
                  <p className="text-slate-300 text-sm">Tỷ lệ đề tài đáp ứng đúng hạn</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-emerald-400">{dashboardData.systemKpi.slaComplianceRate}%</p>
                  {dashboardData.systemKpi.overdueCount > 0 && (
                    <p className="text-red-400 text-sm mt-1">{dashboardData.systemKpi.overdueCount} đề tài quá hạn</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 font-medium text-sm transition flex items-center justify-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-amber-50 text-amber-900 border-b-2 border-amber-500'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Chờ nghiệm thu ({dashboardData?.kpi.pendingAcceptance || 0})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 py-4 px-6 font-medium text-sm transition flex items-center justify-center gap-2 ${
                activeTab === 'approved'
                  ? 'bg-emerald-50 text-emerald-900 border-b-2 border-emerald-500'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Đã duyệt ({dashboardData?.kpi.approved || 0})
            </button>
            <button
              onClick={() => setActiveTab('returned')}
              className={`flex-1 py-4 px-6 font-medium text-sm transition flex items-center justify-center gap-2 ${
                activeTab === 'returned'
                  ? 'bg-orange-50 text-orange-900 border-b-2 border-orange-500'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Hoàn thiện ({dashboardData?.kpi.returned || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-500 text-lg">Không có đề tài nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="pb-4">Mã đề tài</th>
                      <th className="pb-4">Tiêu đề</th>
                      <th className="pb-4">Chủ nhiệm</th>
                      <th className="pb-4">Khoa</th>
                      <th className="pb-4">Kết quả khoa</th>
                      <th className="pb-4">Hạn chờ</th>
                      <th className="pb-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proposals.map((proposal, index) => (
                      <tr
                        key={proposal.id}
                        className="group hover:bg-amber-50/30 transition-colors"
                        style={{ animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` }}
                      >
                        <td className="py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            {proposal.code}
                          </span>
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => navigate(`/proposals/${proposal.id}`)}
                            className="text-slate-900 font-medium hover:text-emerald-600 transition flex items-center gap-1 group-hover:gap-2"
                          >
                            {proposal.title}
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                          </button>
                        </td>
                        <td className="py-4">
                          <div className="text-sm">
                            <p className="text-slate-900">{proposal.ownerName}</p>
                            <p className="text-slate-500 text-xs">{proposal.ownerEmail}</p>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-slate-600">{proposal.facultyName}</td>
                        <td className="py-4">
                          {proposal.facultyDecision === 'DAT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Đạt
                            </span>
                          ) : proposal.facultyDecision === 'KHONG_DAT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                              Không đạt
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span
                              className={`text-sm font-medium ${
                                proposal.isOverdue
                                  ? 'text-red-600'
                                  : proposal.daysRemaining <= 3
                                  ? 'text-amber-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {proposal.daysRemaining < 0
                                ? `Quá hạn ${Math.abs(proposal.daysRemaining)} ngày`
                                : proposal.daysRemaining === 0
                                ? 'Hôm nay'
                                : `Còn ${proposal.daysRemaining} ngày`}
                            </span>
                          </div>
                          {proposal.slaDeadline && (
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDate(proposal.slaDeadline)}
                            </p>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {activeTab === 'pending' && proposal.state === 'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReturn(proposal.id, proposal.code)}
                                disabled={processingId === proposal.id}
                                className="px-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Hoàn thiện
                              </button>
                              <button
                                onClick={() => handleAccept(proposal.id, proposal.code)}
                                disabled={processingId === proposal.id}
                                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg hover:from-emerald-600 hover:to-green-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {processingId === proposal.id ? (
                                  <>Đang xử lý...</>
                                ) : (
                                  <>
                                    <Package className="w-4 h-4" />
                                    Nghiệm thu
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {activeTab === 'approved' && (
                            <button
                              onClick={() => navigate(`/proposals/${proposal.id}`)}
                              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                            >
                              Xem chi tiết
                            </button>
                          )}
                          {activeTab === 'returned' && (
                            <button
                              onClick={() => navigate(`/proposals/${proposal.id}`)}
                              className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                            >
                              Xem chi tiết
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        {dashboardData?.lastUpdated && (
          <p className="text-center text-slate-400 text-sm mt-6">
            Cập nhật lần cuối: {formatDate(dashboardData.lastUpdated)}
          </p>
        )}
      </main>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
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
