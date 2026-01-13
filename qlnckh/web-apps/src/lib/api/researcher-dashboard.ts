/**
 * Researcher (GIANG_VIEN) Dashboard API
 */

import { apiClient } from '../auth/auth';

/**
 * Researcher Statistics
 */
export interface ResearcherStats {
  total: number;
  draft: number;
  underReview: number;
  approved: number;
  rejected: number;
  changesRequested: number;
}

/**
 * Researcher Recent Proposal
 */
export interface ResearcherProposal {
  id: string;
  code: string;
  title: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string | null;
}

/**
 * Researcher Upcoming Deadline
 */
export interface UpcomingDeadline {
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  deadline: string | null;
  daysRemaining: number;
}

/**
 * Researcher Dashboard Data
 */
export interface ResearcherDashboardData {
  stats: ResearcherStats;
  recentProposals: ResearcherProposal[];
  upcomingDeadlines: UpcomingDeadline[];
}

/**
 * Researcher Dashboard Response
 */
export interface ResearcherDashboardResponse {
  success: true;
  data: ResearcherDashboardData;
}

/**
 * Get researcher dashboard data
 */
export async function getResearcherDashboard(): Promise<ResearcherDashboardData> {
  const response = await apiClient.get<ResearcherDashboardResponse>('/dashboard/researcher');
  return response.data.data;
}

export const researcherDashboardApi = {
  getResearcherDashboard,
};
