import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { FormType } from '@prisma/client';

/**
 * DTO để tạo mới ProposalDocument
 */
export class CreateProposalDocumentDto {
  @IsString()
  proposalId: string;

  @IsEnum(FormType)
  formType: FormType;

  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;
}
