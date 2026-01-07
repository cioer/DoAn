import { UserRole } from '@prisma/client';

/**
 * User Import Row Interface
 * Represents a single row from user import Excel file
 *
 * Epic 9 Retro: Proper interface, NO as unknown
 */
export interface UserImportRow {
  email: string;
  displayName: string;
  role: UserRole;
  facultyId: string | null;
  _lineNumber?: number; // For error reporting
}

/**
 * User Import Validation Result
 * Result of validating a single user import row
 */
export interface UserImportValidationResult {
  valid: boolean;
  message?: string;
  field?: string;
}
