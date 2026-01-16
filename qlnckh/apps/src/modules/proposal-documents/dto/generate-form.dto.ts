import { IsString, IsEnum, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { FormType } from '@prisma/client';

/**
 * DTO để generate form document
 */
export class GenerateFormDto {
  @IsString()
  proposalId: string;

  @IsEnum(FormType)
  formType: FormType;

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  regenerate?: boolean; // Force regenerate even if exists
}

/**
 * Document info trong response
 */
export class FormDocumentDto {
  id: string;
  proposalId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  sha256Hash: string;
  generatedBy: string;
  generatedAt: string;
}

/**
 * Response khi generate form thành công
 * Matches frontend FormGenerationResult interface
 */
export class GenerateFormResultDto {
  document: FormDocumentDto;
  pdfPath?: string;
  docxUrl: string;
  pdfUrl?: string;
}

/**
 * DTO để generate nhiều forms cùng lúc
 */
export class GenerateMultipleFormsDto {
  @IsString()
  proposalId: string;

  @IsEnum(FormType, { each: true })
  formTypes: FormType[];

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}
