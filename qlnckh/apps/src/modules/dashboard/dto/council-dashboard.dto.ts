import { ApiProperty } from '@nestjs/swagger';
import { ProjectState } from '@prisma/client';

/**
 * Council Member Dashboard KPI
 */
export class CouncilDashboardKpiDto {
  @ApiProperty({ description: 'Số đề tài cần đánh giá' })
  pendingEvaluation: number;

  @ApiProperty({ description: 'Số đề tài đã đánh giá' })
  evaluated: number;

  @ApiProperty({ description: 'Tổng số đề tài được giao' })
  totalAssigned: number;

  @ApiProperty({ description: 'Số đề tài cần finalize (cho thư ký)' })
  pendingFinalize: number;
}

/**
 * Council Proposal Item
 */
export class CouncilProposalItemDto {
  @ApiProperty({ description: 'ID đề tài' })
  id: string;

  @ApiProperty({ description: 'Mã đề tài' })
  code: string;

  @ApiProperty({ description: 'Tiêu đề đề tài' })
  title: string;

  @ApiProperty({ description: 'Trạng thái đề tài', enum: ProjectState })
  state: ProjectState;

  @ApiProperty({ description: 'ID người tạo' })
  ownerId: string;

  @ApiProperty({ description: 'Tên người tạo' })
  ownerName: string;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Hạn chờ SLA' })
  slaDeadline: Date | null;

  @ApiProperty({ description: 'Đã đánh giá chưa' })
  hasSubmitted: boolean;
}

/**
 * Council Evaluation Item
 */
export class CouncilEvaluationItemDto {
  @ApiProperty({ description: 'ID đánh giá' })
  id: string;

  @ApiProperty({ description: 'ID đề tài' })
  proposalId: string;

  @ApiProperty({ description: 'Mã đề tài' })
  proposalCode: string;

  @ApiProperty({ description: 'Tiêu đề đề tài' })
  proposalTitle: string;

  @ApiProperty({ description: 'Trạng thái đánh giá' })
  state: string;

  @ApiProperty({ description: 'Kết luận' })
  conclusion: string | null;

  @ApiProperty({ description: 'Điểm trung bình' })
  averageScore: number;

  @ApiProperty({ description: 'Ngày cập nhật' })
  updatedAt: Date;
}

/**
 * Council Info
 */
export class CouncilInfoDto {
  @ApiProperty({ description: 'ID hội đồng' })
  id: string;

  @ApiProperty({ description: 'Tên hội đồng' })
  name: string;

  @ApiProperty({ description: 'Số thành viên' })
  memberCount: number;

  @ApiProperty({ description: 'Có phải thư ký không' })
  isSecretary: boolean;
}

/**
 * Council Dashboard Data
 */
export class CouncilDashboardDataDto {
  @ApiProperty({ description: 'Thông tin KPI', type: CouncilDashboardKpiDto })
  kpi: CouncilDashboardKpiDto;

  @ApiProperty({ description: 'Danh sách đề tài cần đánh giá', type: [CouncilProposalItemDto] })
  pendingProposals: CouncilProposalItemDto[];

  @ApiProperty({ description: 'Danh sách đánh giá đã gửi', type: [CouncilEvaluationItemDto] })
  submittedEvaluations: CouncilEvaluationItemDto[];

  @ApiProperty({ description: 'Thông tin hội đồng', type: CouncilInfoDto, nullable: true })
  council: CouncilInfoDto | null;

  @ApiProperty({ description: 'Thời gian cập nhật' })
  lastUpdated: Date;
}

/**
 * Council Dashboard Response
 */
export class CouncilDashboardResponseDto {
  @ApiProperty({ description: 'Trạng thái thành công' })
  success: true;

  @ApiProperty({ description: 'Dữ liệu dashboard', type: CouncilDashboardDataDto })
  data: CouncilDashboardDataDto;
}
