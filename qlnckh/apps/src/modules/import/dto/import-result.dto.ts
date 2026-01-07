import { ImportEntityType } from './import-entity-type.enum';

/**
 * Import Error Detail
 * Represents a single row validation error
 *
 * Epic 9 Retro: Proper interface, NO as unknown
 */
export interface ImportError {
  lineNumber: number;
  row: Record<string, unknown>;
  message: string;
  field?: string;
}

/**
 * Import Result
 * Summary of import operation with errors
 *
 * Epic 9 Retro: Proper interface, NO as unknown
 */
export interface ImportResult {
  entityType: ImportEntityType;
  total: number;
  success: number;
  failed: number;
  errors: ImportError[];
  duration: number; // milliseconds
}

/**
 * Import Result Response DTO
 * Wrapper for API response
 */
export interface ImportResultResponse {
  success: boolean;
  data: ImportResult;
}

/**
 * Template Download Response
 */
export interface TemplateInfo {
  filename: string;
  contentType: string;
  buffer: Buffer;
}
