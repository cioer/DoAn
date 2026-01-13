import { ApiProperty } from '@nestjs/swagger';
import { ProjectState } from '@prisma/client';

/**
 * System-wide KPI for BAN_GIAM_HOC
 * Thống kê toàn hệ thống
 */
export class SystemKpiDto {
  @ApiProperty({ description: 'Tổng số đề tài' })
  totalProposals: number;

  @ApiProperty({ description: 'Đề tài nháp' })
  draft: number;

  @ApiProperty({ description: 'Đang xét duyệt khoa' })
  facultyReview: number;

  @ApiProperty({ description: 'Đang xét duyệt lựa chọn' })
  schoolSelectionReview: number;

  @ApiProperty({ description: 'Đang xét duyệt hội đồng' })
  councilReview: number;

  @ApiProperty({ description: 'Chờ nghiệm thu trường' })
  schoolAcceptanceReview: number;

  @ApiProperty({ description: 'Đã duyệt' })
  approved: number;

  @ApiProperty({ description: 'Đã từ chối' })
  rejected: number;

  @ApiProperty({ description: 'Yêu cầu hoàn thiện' })
  changesRequested: number;

  @ApiProperty({ description: 'Đang thực hiện' })
  inProgress: number;

  @ApiProperty({ description: 'Đã bàn giao' })
  handover: number;

  @ApiProperty({ description: 'Đã hoàn thành' })
  completed: number;

  @ApiProperty({ description: 'Tỷ lệ duyệt (%)' })
  approvalRate: number;

  @ApiProperty({ description: 'Số đề tài quá hạn SLA' })
  overdueCount: number;

  @ApiProperty({ description: 'Tỷ lệ đạt SLA (%)' })
  slaComplianceRate: number;
}

/**
 * Faculty Statistics
 * Thống kê theo khoa
 */
export class FacultyStatsDto {
  @ApiProperty({ description: 'ID khoa' })
  facultyId: string;

  @ApiProperty({ description: 'Mã khoa' })
  facultyCode: string;

  @ApiProperty({ description: 'Tên khoa' })
  facultyName: string;

  @ApiProperty({ description: 'Số đề tài tổng' })
  totalProposals: number;

  @ApiProperty({ description: 'Số đề tài đang xét duyệt' })
  pending: number;

  @ApiProperty({ description: 'Số đề tài đã duyệt' })
  approved: number;

  @ApiProperty({ description: 'Số đề tài đã từ chối' })
  rejected: number;

  @ApiProperty({ description: 'Số đề tài đã hoàn thành' })
  completed: number;
}

/**
 * Monthly Trend Data
 * Thống kê theo tháng
 */
export class MonthlyTrendDto {
  @ApiProperty({ description: 'Tháng (YYYY-MM)' })
  month: string;

  @ApiProperty({ description: 'Số đề tài mới' })
  newProposals: number;

  @ApiProperty({ description: 'Số đề tài đã duyệt' })
  approved: number;

  @ApiProperty({ description: 'Số đề tài đã từ chối' })
  rejected: number;

  @ApiProperty({ description: 'Số đề tài hoàn thành' })
  completed: number;
}

/**
 * User Statistics
 * Thống kê người dùng
 */
export class UserStatsDto {
  @ApiProperty({ description: 'Tổng số người dùng' })
  totalUsers: number;

  @ApiProperty({ description: 'Số giảng viên' })
  giangVien: number;

  @ApiProperty({ description: 'Số trưởng khoa' })
  quanLyKhoa: number;

  @ApiProperty({ description: 'Số thành viên hội đồng' })
  hoiDong: number;

  @ApiProperty({ description: 'Số thư ký hội đồng' })
  thuKyHoiDong: number;

  @ApiProperty({ description: 'Số phòng KHCN' })
  phongKhcn: number;

  @ApiProperty({ description: 'Số ban giám học' })
  banGiamHoc: number;

  @ApiProperty({ description: 'Số admin' })
  admin: number;
}

/**
 * Council Statistics
 * Thống kê hội đồng
 */
export class CouncilStatsDto {
  @ApiProperty({ description: 'Tổng số hội đồng' })
  totalCouncils: number;

  @ApiProperty({ description: 'Số hội đồng đang hoạt động' })
  activeCouncils: number;

  @ApiProperty({ description: 'Số đề tài đang chờ hội đồng xét duyệt' })
  pendingProposals: number;

  @ApiProperty({ description: 'Số thành viên hội đồng' })
  totalMembers: number;
}

/**
 * BAN_GIAM_HOC Dashboard KPI
 * Hiệu trưởng dashboard KPI metrics (quick action view)
 */
export class BghDashboardKpiDto {
  @ApiProperty({ description: 'Số đề tài chờ nghiệm thu' })
  pendingAcceptance: number;

  @ApiProperty({ description: 'Số đề tài đã duyệt (nghiệm thu)' })
  approved: number;

  @ApiProperty({ description: 'Số đề tài đã yêu cầu hoàn thiện' })
  returned: number;

  @ApiProperty({ description: 'Tổng số đề tài cần xử lý' })
  totalPending: number;
}

/**
 * BAN_GIAM_HOC Proposal Item
 * Đề tài cần Hiệu trưởng xem xét
 */
export class BghProposalItemDto {
  @ApiProperty({ description: 'ID đề tài' })
  id: string;

  @ApiProperty({ description: 'Mã đề tài' })
  code: string;

  @ApiProperty({ description: 'Tiêu đề đề tài' })
  title: string;

  @ApiProperty({ description: 'Trạng thái đề tài', enum: ProjectState })
  state: ProjectState;

  @ApiProperty({ description: 'Tên chủ nhiệm đề tài' })
  ownerName: string;

  @ApiProperty({ description: 'Email chủ nhiệm' })
  ownerEmail: string;

  @ApiProperty({ description: 'Tên khoa' })
  facultyName: string;

  @ApiProperty({ description: 'Hạn chờ SLA' })
  slaDeadline: Date | null;

  @ApiProperty({ description: 'Số ngày còn lại (số âm = quá hạn)' })
  daysRemaining: number;

  @ApiProperty({ description: 'Có quá hạn SLA không' })
  isOverdue: boolean;

  @ApiProperty({ description: 'Ngày gửi lên nghiệm thu trường' })
  submittedDate: Date | null;

  @ApiProperty({ description: 'Kết quả nghiệm thu khoa (DAT/KHONG_DAT)' })
  facultyDecision: string | null;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;
}

/**
 * BAN_GIAM_HOC Dashboard Data (Enhanced with System-wide Statistics)
 */
export class BghDashboardDataDto {
  @ApiProperty({ description: 'Thông tin KPI nhanh', type: BghDashboardKpiDto })
  kpi: BghDashboardKpiDto;

  @ApiProperty({ description: 'Thống kê toàn hệ thống', type: SystemKpiDto })
  systemKpi: SystemKpiDto;

  @ApiProperty({ description: 'Thống kê theo khoa', type: [FacultyStatsDto] })
  facultyStats: FacultyStatsDto[];

  @ApiProperty({ description: 'Xu hướng theo tháng (6 tháng gần nhất)', type: [MonthlyTrendDto] })
  monthlyTrends: MonthlyTrendDto[];

  @ApiProperty({ description: 'Thống kê người dùng', type: UserStatsDto })
  userStats: UserStatsDto;

  @ApiProperty({ description: 'Thống kê hội đồng', type: CouncilStatsDto })
  councilStats: CouncilStatsDto;

  @ApiProperty({ description: 'Danh sách đề tài chờ nghiệm thu', type: [BghProposalItemDto] })
  pendingProposals: BghProposalItemDto[];

  @ApiProperty({ description: 'Danh sách đề tài đã duyệt gần đây', type: [BghProposalItemDto] })
  recentlyApproved: BghProposalItemDto[];

  @ApiProperty({ description: 'Danh sách đề tài đã yêu cầu hoàn thiện', type: [BghProposalItemDto] })
  returnedProposals: BghProposalItemDto[];

  @ApiProperty({ description: 'Thời gian cập nhật' })
  lastUpdated: Date;
}

/**
 * BAN_GIAM_HOC Dashboard Response
 */
export class BghDashboardResponseDto {
  @ApiProperty({ description: 'Trạng thái thành công' })
  success: true;

  @ApiProperty({ description: 'Dữ liệu dashboard', type: BghDashboardDataDto })
  data: BghDashboardDataDto;
}
