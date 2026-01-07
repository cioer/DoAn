import { IsString, IsNotEmpty } from 'class-validator';
import { DocumentTemplateType } from '@prisma/client';

/**
 * Template Response DTO
 *
 * Epic 7 Story 7.2: Template Upload & Registry
 */
export class TemplateResponseDto {
  id: string;
  name: string;
  description: string | null;
  templateType: DocumentTemplateType;
  fileName: string;
  fileSize: number;
  sha256Hash: string;
  version: number;
  placeholders: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template Detail Response DTO
 * Includes additional information about placeholder validation
 */
export class TemplateDetailResponseDto extends TemplateResponseDto {
  unknownPlaceholders: string[];
  knownPlaceholders: string[];
  placeholderWarnings: string[];
}

/**
 * Placeholder Validation Result
 */
export interface PlaceholderValidationResult {
  valid: boolean;
  known: string[];
  unknown: string[];
  warnings: string[];
}

/**
 * Activate Template DTO
 */
export class ActivateTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;
}
