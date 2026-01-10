import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cancel Proposal DTO
 * Story 9.1: Cancel Action (DRAFT state only)
 *
 * Used when owner wants to cancel a proposal in DRAFT state.
 */
export class CancelProposalDto {
  @IsUUID('4', {
    message: 'Idempotency key phải là UUID v4',
  })
  idempotencyKey: string;

  @IsOptional()
  @IsString({
    message: 'Lý do phải là chuỗi ký tự',
  })
  @MaxLength(500, {
    message: 'Lý do không được quá 500 ký tự',
  })
  reason?: string;
}

/**
 * Cancel Proposal Response DTO
 */
export interface CancelProposalResponseDto {
  success: true;
  data: {
    proposalId: string;
    previousState: string;
    currentState: string;
    action: 'CANCEL';
    cancelledAt: Date;
    workflowLogId: string;
  };
}
