import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FormType, FormDocumentStatus } from '@prisma/client';

/**
 * DTO để query proposal documents
 */
export class QueryProposalDocumentsDto {
  @IsOptional()
  @IsString()
  proposalId?: string;

  @IsOptional()
  @IsEnum(FormType)
  formType?: FormType;

  @IsOptional()
  @IsEnum(FormDocumentStatus)
  status?: FormDocumentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Response paginated
 */
export class PaginatedProposalDocumentsDto {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
