import { IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Submit Evaluation Request DTO (Story 5.4)
 */
export class SubmitEvaluationRequestDto {
  @ApiProperty({
    description: 'Idempotency key (UUID v4) to prevent duplicate submissions',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsString()
  idempotencyKey: string;
}

/**
 * Submit Evaluation Response DTO (Story 5.4)
 */
export class SubmitEvaluationResponseDto {
  @ApiProperty()
  success: true;

  @ApiProperty()
  data: {
    evaluationId: string;
    level: string;
    state: string;
    proposalId: string;
    proposalState: string;
    submittedAt: Date;
  };
}

/**
 * Evaluation Already Finalized Error Response
 */
export class EvaluationAlreadyFinalizedResponseDto {
  @ApiProperty()
  success: false;

  @ApiProperty()
  error: {
    code: 'EVALUATION_ALREADY_FINALIZED';
    message: string;
  };
}
