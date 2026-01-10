import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { ProjectState } from '@prisma/client';

/**
 * Dashboard KPI DTO
 * Story 8.4: Morning Check Dashboard (KPI + Overdue List)
 *
 * KPI metrics for the dashboard
 * Proper typing - NO as unknown (Epic 7 retro pattern)
 */
export interface DashboardKpiDto {
  totalWaiting: number; // Proposals in review states
  overdueCount: number; // Proposals past SLA deadline
  t2WarningCount: number; // Proposals within 2 working days
  completedThisMonth: number; // Proposals completed this month
}

/**
 * Overdue Proposal DTO
 * Information about an overdue proposal
 */
export interface OverdueProposalDto {
  id: string;
  code: string;
  title: string;
  holderName: string;
  holderEmail: string;
  overdueDays: number;
  slaDeadline: Date;
  slaStatus: 'warning' | 'overdue';
  state: string;
}

/**
 * Dashboard Data DTO
 * Complete dashboard data including KPI and overdue list
 */
export interface DashboardDataDto {
  kpi: DashboardKpiDto;
  overdueList: OverdueProposalDto[];
  lastUpdated: Date;
}

/**
 * Dashboard Response DTO
 * API response format for dashboard data
 */
export interface DashboardResponseDto {
  success: true;
  data: DashboardDataDto;
}

/**
 * Bulk Remind Overdue Result DTO
 */
export interface BulkRemindOverdueResultDto {
  success: true;
  data: {
    success: number;
    failed: number;
    total: number;
    recipients: Array<{
      userId: string;
      userName: string;
      emailSent: boolean;
      error?: string;
    }>;
  };
}

/**
 * KPI Card Filter
 * Filter to apply when clicking a KPI card
 */
export interface KpiCardFilter {
  key: string;
  filter: Record<string, unknown>;
}

/**
 * Review states (waiting for action)
 */
export const REVIEW_STATES: ProjectState[] = [
  ProjectState.FACULTY_REVIEW,
  ProjectState.SCHOOL_SELECTION_REVIEW,
  ProjectState.OUTLINE_COUNCIL_REVIEW,
  ProjectState.FACULTY_ACCEPTANCE_REVIEW,
  ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
  ProjectState.HANDOVER,
  ProjectState.CHANGES_REQUESTED,
];
