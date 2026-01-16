import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { FormDocumentStatus } from '@prisma/client';

/**
 * DTO để cập nhật ProposalDocument
 */
export class UpdateProposalDocumentDto {
  @IsOptional()
  @IsEnum(FormDocumentStatus)
  status?: FormDocumentStatus;

  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

/**
 * DTO để approve/reject document
 */
export class ApproveRejectDocumentDto {
  @IsEnum(FormDocumentStatus)
  status: FormDocumentStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
