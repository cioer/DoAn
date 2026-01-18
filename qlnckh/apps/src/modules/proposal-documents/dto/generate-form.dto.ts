import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, Matches } from 'class-validator';
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

/**
 * Valid form IDs for Form Engine test generation
 */
const VALID_FORM_ID_PATTERN = /^(1b|2b|3b|4b|5b|6b|7b|8b|9b|10b|11b|12b|13b|14b|15b|16b|17b|18b|pl1|pl2|pl3|phuluc)$/i;

/**
 * DTO để generate test document với sample data
 * Admin-only endpoint
 */
export class GenerateTestDto {
  @IsString()
  @Matches(VALID_FORM_ID_PATTERN, {
    message: 'formId phải là một trong: 1b-18b, pl1, pl2, pl3, phuluc',
  })
  formId: string;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
