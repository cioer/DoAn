import { IsString, IsObject, IsOptional } from 'class-validator';

/**
 * DTO for form rendering request
 */
export class RenderFormDto {
  /**
   * Name of the template file (e.g., "1b.docx")
   */
  @IsString()
  templateName: string;

  /**
   * Variables to replace in the template
   */
  @IsObject()
  context: Record<string, any>;

  /**
   * ID of user generating the document
   */
  @IsString()
  userId: string;

  /**
   * Optional proposal ID for tracking
   */
  @IsString()
  @IsOptional()
  proposalId?: string;
}

/**
 * Result of form rendering from FormEngine service
 */
export interface RenderFormResult {
  docx_path: string;
  pdf_path: string | null;
  docx_url: string;
  pdf_url: string | null;
  template: string;
  timestamp: string;
  userId: string;
  proposalId: string | null;
  sha256_docx: string;
  sha256_pdf: string | null;
}

/**
 * Template info from FormEngine service
 */
export interface TemplateInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
}

/**
 * Health status from FormEngine service
 */
export interface FormEngineHealth {
  status: string;
  version: string;
  templates_available: number;
  libreoffice_available: boolean;
  timestamp: string;
}

/**
 * API response wrapper from FormEngine
 */
export interface FormEngineApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
