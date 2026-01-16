import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Council Member DTO
 */
export class CouncilMemberDto {
  @IsString()
  ten: string;

  @IsString()
  don_vi: string;
}

/**
 * Generate Form DTO
 *
 * Extended DTO for FormEngine-based document generation.
 * Supports all 18 form templates with specific options.
 */
export class GenerateFormDto {
  /**
   * Template type (e.g., 'PROPOSAL_OUTLINE', 'EVALUATION_FORM')
   */
  @IsString()
  templateType: string;

  /**
   * Whether the evaluation/acceptance passed
   */
  @IsBoolean()
  @IsOptional()
  isPass?: boolean;

  /**
   * Whether the proposal was approved (for meeting minutes)
   */
  @IsBoolean()
  @IsOptional()
  isApproved?: boolean;

  /**
   * Evaluator name
   */
  @IsString()
  @IsOptional()
  evaluatorName?: string;

  /**
   * Number of approval votes
   */
  @IsNumber()
  @IsOptional()
  soPhieuDongY?: number;

  /**
   * Number of rejection votes
   */
  @IsNumber()
  @IsOptional()
  soPhieuPhanDoi?: number;

  /**
   * Content that was revised
   */
  @IsString()
  @IsOptional()
  noiDungChinhSua?: string;

  /**
   * Additional content
   */
  @IsString()
  @IsOptional()
  noiDungBoSung?: string;

  /**
   * Content that doesn't fit
   */
  @IsString()
  @IsOptional()
  noiDungKhongPhuHop?: string;

  /**
   * Revision request content
   */
  @IsString()
  @IsOptional()
  revisionContent?: string;

  /**
   * Project lead info
   */
  @ValidateNested()
  @Type(() => CouncilMemberDto)
  @IsOptional()
  chuNhiem?: CouncilMemberDto;

  /**
   * Council members
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouncilMemberDto)
  @IsOptional()
  hoiDong?: CouncilMemberDto[];

  /**
   * Additional form data to merge with proposal data
   */
  @IsObject()
  @IsOptional()
  additionalData?: Record<string, unknown>;

  /**
   * Generate PDF in addition to DOCX
   */
  @IsBoolean()
  @IsOptional()
  generatePdf?: boolean;
}

/**
 * Form Generation Response DTO
 */
export class FormGenerationResponseDto {
  id: string;
  proposalId: string;
  templateType: string;
  templateName: string;
  fileName: string;
  fileSize: number;
  sha256Docx: string;
  sha256Pdf?: string;
  docxUrl: string;
  pdfUrl?: string;
  generatedBy: string;
  generatedAt: Date;
}

/**
 * Available Templates Response DTO
 */
export class AvailableTemplatesResponseDto {
  templates: Array<{
    type: string;
    name: string;
    description: string;
  }>;
}

/**
 * FormEngine Health Response DTO
 */
export class FormEngineHealthResponseDto {
  available: boolean;
  version?: string;
  templatesCount?: number;
  libreofficeAvailable?: boolean;
}
