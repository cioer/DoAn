import { IsEnum, IsString, MinLength, MaxLength, IsUUID } from 'class-validator';
import { RejectReasonCode } from '../enums/reject-reason-code.enum';

/**
 * Reject Proposal DTO
 * Story 9.2: Reject Action
 *
 * Used when authorized users (decision makers) want to reject a proposal.
 */
export class RejectProposalDto {
  @IsEnum(RejectReasonCode, {
    message: 'Lý do từ chối không hợp lệ',
  })
  reasonCode: RejectReasonCode;

  @IsString({
    message: 'Giải thích phải là chuỗi ký tự',
  })
  @MinLength(10, {
    message: 'Giải thích phải có ít nhất 10 ký tự',
  })
  @MaxLength(500, {
    message: 'Giải thích không được quá 500 ký tự',
  })
  comment: string;

  @IsUUID('4', {
    message: 'Idempotency key phải là UUID v4',
  })
  idempotencyKey: string;
}

/**
 * Reject Proposal Response DTO
 */
export interface RejectProposalResponseDto {
  success: true;
  data: {
    proposalId: string;
    previousState: string;
    currentState: string;
    action: 'REJECT';
    rejectedAt: Date;
    rejectedBy: string;
    reasonCode: string;
    workflowLogId: string;
  };
}
