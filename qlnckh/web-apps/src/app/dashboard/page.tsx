import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/auth/auth';
import { useAuthStore } from '../../stores/authStore';
import { AdminDashboard } from './AdminDashboard';
import { CouncilDashboard } from './CouncilDashboard';
import { SystemAdminDashboard } from './SystemAdminDashboard';
import type {
  DashboardData,
  DashboardResponse,
  CouncilDashboardData,
  CouncilDashboardResponse,
} from './types';

/**
 * Loading Spinner Component
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-900 rounded-full animate-spin" />
        <p className="mt-2 text-sm text-slate-600">Đang tải...</p>
      </div>
    </div>
  );
}

/**
 * Error Display Component
 */
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center text-red-600">{message}</div>
    </div>
  );
}

/**
 * Dashboard Page Component
 *
 * Story 11.2: Dashboard with KPI Metrics
 * Multi-member: Council member dashboard
 *
 * Routes to appropriate dashboard based on user role:
 * - PHONG_KHCN/ADMIN: Admin dashboard with KPIs and overdue list
 * - HOI_DONG/THU_KY_HOI_DONG: Council dashboard with evaluations
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Redirect BAN_GIAM_HOC to their specific dashboard
  // Note: Depend only on user?.role, not entire user object, to prevent
  // unnecessary re-renders when user object reference changes but role stays same
  useEffect(() => {
    if (user?.role === 'BAN_GIAM_HOC' || user?.role === 'BGH') {
      navigate('/dashboard/bgh', { replace: true });
    }
  }, [user?.role, navigate]);

  const [adminData, setAdminData] = useState<DashboardData | null>(null);
  const [councilData, setCouncilData] = useState<CouncilDashboardData | null>(
    null
  );
  const [systemAdminData, setSystemAdminData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isSystemAdmin = user?.role === 'ADMIN';
  const isCouncilMember =
    user?.role === 'HOI_DONG' || user?.role === 'THU_KY_HOI_DONG';
  const canViewAdminDashboard = user?.role === 'PHONG_KHCN';

  // Load dashboard data based on role
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (isSystemAdmin) {
        // Load system admin dashboard
        const response = await apiClient.get<{ success: boolean; data: any }>('/dashboard/admin');
        setSystemAdminData(response.data.data);
      } else if (isCouncilMember) {
        // Load council dashboard
        const response =
          await apiClient.get<CouncilDashboardResponse>('/dashboard/council');
        setCouncilData(response.data.data);
      } else if (canViewAdminDashboard) {
        // Load PHONG_KHCN dashboard
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

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay message={error} />;
  }

  // System Admin Dashboard (ADMIN only)
  if (systemAdminData) {
    return (
      <SystemAdminDashboard
        data={systemAdminData}
        onNavigate={navigate}
        onRefresh={loadDashboard}
      />
    );
  }

  // Council Member Dashboard
  if (councilData) {
    return (
      <CouncilDashboard
        data={councilData}
        onNavigate={navigate}
        onRefresh={loadDashboard}
      />
    );
  }

  // PHONG_KHCN Dashboard
  if (adminData) {
    return (
      <AdminDashboard
        data={adminData}
        onNavigate={navigate}
        onRemindOverdue={handleRemindOverdue}
        onRefresh={loadDashboard}
      />
    );
  }

  // Fallback
  return <ErrorDisplay message="Không tìm thấy dashboard phù hợp" />;
}
