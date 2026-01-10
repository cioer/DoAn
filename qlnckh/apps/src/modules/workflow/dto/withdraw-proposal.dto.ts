import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Withdraw Proposal DTO
 * Story 9.1: Withdraw Action (before APPROVED state)
 *
 * Used when owner wants to withdraw a proposal that's in review
 * but not yet approved.
 */
export class WithdrawProposalDto {
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
 * Withdraw Proposal Response DTO
 */
export interface WithdrawProposalResponseDto {
  success: true;
  data: {
    proposalId: string;
    previousState: string;
    currentState: string;
    action: 'WITHDRAW';
    withdrawnAt: Date;
    workflowLogId: string;
  };
}
