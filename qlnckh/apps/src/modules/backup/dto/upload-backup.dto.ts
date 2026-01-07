import { IsString, IsOptional } from 'class-validator';

/**
 * Upload Backup DTO
 * Story 10.6: DB Restore
 */
export class UploadBackupDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Restore Job DTO
 */
export interface RestoreJob {
  id: string;
  backupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: string;
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  logs: string[];
}

/**
 * Verification Report DTO
 * Story 10.6: AC9, AC10 - State Integrity Verification
 */
export interface VerificationReport {
  totalProposals: number;
  matchedCount: number;
  mismatchedCount: number;
  mismatches: StateMismatch[];
  verifiedAt: Date;
}

/**
 * State Mismatch DTO
 */
export interface StateMismatch {
  proposalId: string;
  proposalCode: string;
  currentState: string;
  computedState: string;
  lastLog: {
    action: string;
    toState: string;
    timestamp: Date;
  };
}

/**
 * Correction Summary DTO
 */
export interface CorrectionSummary {
  total: number;
  corrected: number;
  failed: number;
  errors: string[];
}
