/**
 * BAN_GIAM_HOC (Hiệu trưởng) Dashboard API
 */

import { apiClient } from '../auth/auth';

/**
 * System-wide KPI for BAN_GIAM_HOC
 * Thống kê toàn hệ thống
 */
export interface SystemKpi {
  totalProposals: number;
  draft: number;
  facultyReview: number;
  schoolSelectionReview: number;
  councilReview: number;
  schoolAcceptanceReview: number;
  approved: number;
  rejected: number;
  changesRequested: number;
  inProgress: number;
  handover: number;
  completed: number;
  approvalRate: number;
  overdueCount: number;
  slaComplianceRate: number;
}

/**
 * Faculty Statistics
 * Thống kê theo khoa
 */
export interface FacultyStats {
  facultyId: string;
  facultyCode: string;
  facultyName: string;
  totalProposals: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
}

/**
 * Monthly Trend Data
 * Thống kê theo tháng
 */
export interface MonthlyTrend {
  month: string;
  newProposals: number;
  approved: number;
  rejected: number;
  completed: number;
}

/**
 * User Statistics
 * Thống kê người dùng
 */
export interface UserStats {
  totalUsers: number;
  giangVien: number;
  quanLyKhoa: number;
  hoiDong: number;
  thuKyHoiDong: number;
  phongKhcn: number;
  banGiamHoc: number;
  admin: number;
}

/**
 * Council Statistics
 * Thống kê hội đồng
 */
export interface CouncilStats {
  totalCouncils: number;
  activeCouncils: number;
  pendingProposals: number;
  totalMembers: number;
}

/**
 * BAN_GIAM_HOC Dashboard KPI
 * Hiệu trưởng dashboard KPI metrics (quick action view)
 */
export interface BghDashboardKpi {
  pendingAcceptance: number;
  approved: number;
  returned: number;
  totalPending: number;
}

/**
 * BAN_GIAM_HOC Proposal Item
 */
export interface BghProposalItem {
  id: string;
  code: string;
  title: string;
  state: string;
  ownerName: string;
  ownerEmail: string;
  facultyName: string;
  slaDeadline: string | null;
  daysRemaining: number;
  isOverdue: boolean;
  submittedDate: string | null;
  facultyDecision: string | null;
  createdAt: string;
}

/**
 * BAN_GIAM_HOC Dashboard Data (Enhanced with System-wide Statistics)
 */
export interface BghDashboardData {
  kpi: BghDashboardKpi;
  systemKpi: SystemKpi;
  facultyStats: FacultyStats[];
  monthlyTrends: MonthlyTrend[];
  userStats: UserStats;
  councilStats: CouncilStats;
  pendingProposals: BghProposalItem[];
  recentlyApproved: BghProposalItem[];
  returnedProposals: BghProposalItem[];
  lastUpdated: string;
}

/**
 * BAN_GIAM_HOC Dashboard API Response
 */
export interface BghDashboardResponse {
  success: true;
  data: BghDashboardData;
}

/**
 * Get BAN_GIAM_HOC dashboard data
 */
export async function getBghDashboard(): Promise<BghDashboardData> {
  const response = await apiClient.get<BghDashboardResponse>('/dashboard/bgh');
  return response.data.data;
}

export const bghDashboardApi = {
  getBghDashboard,
};
