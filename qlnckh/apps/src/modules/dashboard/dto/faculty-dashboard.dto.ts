import { ProjectState } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Status Distribution Item for Faculty Dashboard
 */
export class FacultyStatusDistributionDto {
  @ApiProperty({ description: 'Trạng thái' })
  state: string;

  @ApiProperty({ description: 'Tên trạng thái hiển thị' })
  stateName: string;

  @ApiProperty({ description: 'Số lượng đề tài' })
  count: number;

  @ApiProperty({ description: 'Tỷ lệ phần trăm' })
  percentage: number;
}

/**
 * Monthly Trend Data for Faculty Dashboard
 */
export class FacultyMonthlyTrendDto {
  @ApiProperty({ description: 'Tháng (YYYY-MM)' })
  month: string;

  @ApiProperty({ description: 'Số đề tài mới nộp' })
  newProposals: number;

  @ApiProperty({ description: 'Số đề tài đã duyệt' })
  approved: number;

  @ApiProperty({ description: 'Số đề tài hoàn thành' })
  completed: number;
}

/**
 * Faculty Dashboard KPI DTO
 * KPI metrics for faculty-level dashboard
 */
export class FacultyDashboardKpiDto {
  @ApiProperty({ description: 'Tổng số đề tài' })
  totalProposals: number;

  @ApiProperty({ description: 'Đang chờ duyệt' })
  pendingReview: number;

  @ApiProperty({ description: 'Đã duyệt' })
  approved: number;

  @ApiProperty({ description: 'Yêu cầu sửa' })
  returned: number;

  @ApiProperty({ description: 'Đang thực hiện' })
  inProgress: number;

  @ApiProperty({ description: 'Đã hoàn thành' })
  completed: number;

  @ApiProperty({ description: 'Chờ nghiệm thu' })
  pendingAcceptance: number; // Proposals in FACULTY_ACCEPTANCE_REVIEW state

  @ApiProperty({ description: 'Đã nghiệm thu bởi khoa' })
  acceptedByFaculty: number; // Proposals moved to SCHOOL_ACCEPTANCE_REVIEW state
}

/**
 * Faculty Dashboard Data DTO
 * Complete dashboard data for faculty-level view
 */
export class FacultyDashboardDataDto {
  @ApiProperty({ description: 'KPI metrics', type: FacultyDashboardKpiDto })
  kpi: FacultyDashboardKpiDto;

  @ApiProperty({ description: 'Đề tài gần đây' })
  recentProposals: any[];

  @ApiProperty({ description: 'Tên khoa' })
  facultyName: string; // Faculty name for display

  @ApiProperty({ description: 'ID khoa' })
  facultyId: string; // Faculty ID for reference

  @ApiProperty({ description: 'Phân bố theo trạng thái', type: [FacultyStatusDistributionDto] })
  statusDistribution: FacultyStatusDistributionDto[];

  @ApiProperty({ description: 'Xu hướng theo tháng', type: [FacultyMonthlyTrendDto] })
  monthlyTrends: FacultyMonthlyTrendDto[];
}

/**
 * State mappings for faculty dashboard KPI
 * Maps dashboard KPI categories to project states
 */
export const FACULTY_DASHBOARD_STATE_MAPPING = {
  pendingReview: [ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW],
  approved: [
    ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
  ],
  returned: [ProjectState.CHANGES_REQUESTED],
  inProgress: [ProjectState.DRAFT],
  completed: [ProjectState.HANDOVER, ProjectState.APPROVED, ProjectState.COMPLETED],
};
