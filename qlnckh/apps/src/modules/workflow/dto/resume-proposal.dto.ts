import { IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';

/**
 * Resume Proposal DTO
 * Story 9.3: Resume Action (PKHCN only)
 *
 * Used when PKHCN wants to resume a paused proposal.
 */
export class ResumeProposalDto {
  @IsOptional()
  @IsString({
    message: 'Comment phải là chuỗi ký tự',
  })
  @MaxLength(500, {
    message: 'Comment không được quá 500 ký tự',
  })
  comment?: string;

  @IsUUID('4', {
    message: 'Idempotency key phải là UUID v4',
  })
  idempotencyKey: string;
}

/**
 * Resume Proposal Response DTO
 */
export interface ResumeProposalResponseDto {
  success: true;
  data: {
    proposalId: string;
    previousState: string;
    currentState: string;
    action: 'RESUME';
    resumedAt: Date;
    newSlaDeadline: Date;
    workflowLogId: string;
  };
}
