import { ProjectState } from '@prisma/client';

/**
 * Proposal Import Row Interface
 * Represents a single row from proposal import Excel file
 *
 * Epic 9 Retro: Proper interface, NO as unknown
 */
export interface ProposalImportRow {
  ownerId: string; // User email
  title: string;
  facultyCode: string; // Faculty code or ID
  state?: ProjectState; // Default to DRAFT
  researchField?: string;
  budget?: number;
  _lineNumber?: number; // For error reporting
}

/**
 * Proposal Import Validation Result
 * Result of validating a single proposal import row
 */
export interface ProposalImportValidationResult {
  valid: boolean;
  message?: string;
  field?: string;
}
