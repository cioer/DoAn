import { IsString, IsOptional, IsDateString, MinLength, MaxLength, IsUUID } from 'class-validator';

/**
 * Pause Proposal DTO
 * Story 9.3: Pause Action (PKHCN only)
 *
 * Used when PKHCN wants to temporarily pause a proposal.
 */
export class PauseProposalDto {
  @IsString({
    message: 'Lý do phải là chuỗi ký tự',
  })
  @MinLength(10, {
    message: 'Lý do phải có ít nhất 10 ký tự',
  })
  @MaxLength(500, {
    message: 'Lý do không được quá 500 ký tự',
  })
  reason: string;

  @IsOptional()
  @IsDateString({}, {
    message: 'Ngày dự kiến tiếp tục phải là định dạng ngày hợp lệ (ISO 8601)',
  })
  expectedResumeAt?: string;

  @IsUUID('4', {
    message: 'Idempotency key phải là UUID v4',
  })
  idempotencyKey: string;
}

/**
 * Pause Proposal Response DTO
 */
export interface PauseProposalResponseDto {
  success: true;
  data: {
    proposalId: string;
    previousState: string;
    currentState: string;
    action: 'PAUSE';
    pausedAt: Date;
    prePauseState: string;
    workflowLogId: string;
  };
}
