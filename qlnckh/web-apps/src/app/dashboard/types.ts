/**
 * Dashboard Types
 *
 * Shared type definitions for dashboard components
 */

/**
 * Dashboard KPI - PHONG_KHCN/ADMIN
 */
export interface DashboardKpi {
  totalWaiting: number;
  overdueCount: number;
  t2WarningCount: number;
  completedThisMonth: number;
}

/**
 * Overdue Proposal item
 */
export interface OverdueProposal {
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

/**
 * Status Distribution for charts
 */
export interface StatusDistribution {
  state: string;
  stateName: string;
  count: number;
  percentage: number;
}

/**
 * Monthly Trend for charts
 */
export interface MonthlyTrend {
  month: string;
  newProposals: number;
  approved: number;
  completed: number;
}

/**
 * Admin Dashboard Data
 */
export interface DashboardData {
  kpi: DashboardKpi;
  overdueList: OverdueProposal[];
  lastUpdated: string;
  statusDistribution?: StatusDistribution[];
  monthlyTrends?: MonthlyTrend[];
}

/**
 * Admin Dashboard API Response
 */
export interface DashboardResponse {
  success: true;
  data: DashboardData;
}

/**
 * Council Dashboard KPI - HOI_DONG/THU_KY_HOI_DONG
 */
export interface CouncilDashboardKpi {
  pendingEvaluation: number;
  evaluated: number;
  totalAssigned: number;
  pendingFinalize: number;
}

/**
 * Council Proposal Item
 */
export interface CouncilProposalItem {
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

/**
 * Council Evaluation Item
 */
export interface CouncilEvaluationItem {
  id: string;
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  state: string;
  conclusion: string | null;
  averageScore: number;
  updatedAt: string;
}

/**
 * Council Info
 */
export interface CouncilInfo {
  id: string;
  name: string;
  memberCount: number;
  isSecretary: boolean;
}

/**
 * Council Dashboard Data
 */
export interface CouncilDashboardData {
  kpi: CouncilDashboardKpi;
  pendingProposals: CouncilProposalItem[];
  submittedEvaluations: CouncilEvaluationItem[];
  council: CouncilInfo | null;
  lastUpdated: string;
}

/**
 * Council Dashboard API Response
 */
export interface CouncilDashboardResponse {
  success: true;
  data: CouncilDashboardData;
}

/**
 * KPI Card color variants
 */
export type KpiCardColor =
  | 'blue'
  | 'yellow'
  | 'red'
  | 'green'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'teal'
  | 'slate';
