import { apiClient } from '../auth/auth';

/**
 * Dashboard KPI metrics
 */
export interface DashboardKpi {
  totalWaiting: number;
  overdueCount: number;
  t2WarningCount: number;
  completedThisMonth: number;
}

/**
 * Overdue proposal item
 */
export interface OverdueProposal {
  id: string;
  code: string;
  title: string;
  holderName: string;
  holderEmail: string;
  overdueDays: number;
  slaDeadline: Date | null;
  slaStatus: 'overdue' | 'warning';
  state: string;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  kpi: DashboardKpi;
  overdueList: OverdueProposal[];
  lastUpdated: Date;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Get dashboard data
 * GET /api/dashboard
 */
export async function getDashboard(): Promise<DashboardData> {
  const response = await apiClient.get<ApiResponse<DashboardData>>('/dashboard');
  return response.data.data;
}

/**
 * Bulk remind all overdue proposals
 * POST /api/dashboard/remind-overdue
 */
export async function remindAllOverdue(): Promise<{
  success: number;
  failed: number;
  total: number;
  recipients: Array<{
    userId: string;
    userName: string;
    emailSent: boolean;
    error?: string;
  }>;
}> {
  const response = await apiClient.post<{ success: boolean; data: unknown }>(
    '/dashboard/remind-overdue',
    {}
  );
  return response.data.data as ReturnType<typeof remindAllOverdue>;
}
