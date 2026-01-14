import { Proposal, ProjectState } from '@prisma/client';

/**
 * Faculty Dashboard KPI DTO
 * KPI metrics for faculty-level dashboard
 */
export class FacultyDashboardKpiDto {
  totalProposals: number;
  pendingReview: number;
  approved: number;
  returned: number;
  inProgress: number;
  completed: number;
  pendingAcceptance: number; // Proposals in FACULTY_ACCEPTANCE_REVIEW state
  acceptedByFaculty: number; // Proposals moved to SCHOOL_ACCEPTANCE_REVIEW state
}

/**
 * Faculty Dashboard Data DTO
 * Complete dashboard data for faculty-level view
 */
export class FacultyDashboardDataDto {
  kpi: FacultyDashboardKpiDto;
  recentProposals: Proposal[];
  facultyName: string; // Faculty name for display
  facultyId: string; // Faculty ID for reference
}

/**
 * State mappings for faculty dashboard KPI
 * Maps dashboard KPI categories to project states
 */
export const FACULTY_DASHBOARD_STATE_MAPPING = {
  pendingReview: [ProjectState.FACULTY_REVIEW],
  approved: [
    ProjectState.SCHOOL_SELECTION_REVIEW,
    ProjectState.OUTLINE_COUNCIL_REVIEW,
    ProjectState.FACULTY_ACCEPTANCE_REVIEW,
    ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
  ],
  returned: [ProjectState.CHANGES_REQUESTED],
  inProgress: [ProjectState.DRAFT],
  completed: [ProjectState.HANDOVER, ProjectState.APPROVED, ProjectState.COMPLETED],
};
