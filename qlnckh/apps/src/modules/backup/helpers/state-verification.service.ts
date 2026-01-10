import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState } from '@prisma/client';
import {
  VerificationReport,
  StateMismatch,
  CorrectionSummary,
} from '../dto/upload-backup.dto';

/**
 * State Verification Service
 * Story 10.6: AC9, AC10 - State Integrity Verification
 *
 * Verifies and corrects proposal states based on workflow logs.
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Direct ProjectState enum usage
 * - Proper interfaces for all data
 */
@Injectable()
export class StateVerificationService {
  private readonly logger = new Logger(StateVerificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Verify state integrity for all proposals
   * Story 10.6: AC9 - State Integrity Verification
   *
   * @returns Verification report with mismatches
   */
  async verifyStateIntegrity(): Promise<VerificationReport> {
    this.logger.log('Starting state integrity verification...');

    // Get all proposals
    const proposals = await this.prisma.proposal.findMany({
      select: {
        id: true,
        code: true,
        state: true,
      },
    });

    const mismatches: StateMismatch[] = [];
    let matchedCount = 0;

    // Check each proposal
    for (const proposal of proposals) {
      const computedState = await this.computeExpectedState(proposal.id);

      if (computedState !== proposal.state) {
        // Get last workflow log for context
        const lastLog = await this.prisma.workflowLog.findFirst({
          where: { proposalId: proposal.id },
          orderBy: { timestamp: 'desc' },
        });

        mismatches.push({
          proposalId: proposal.id,
          proposalCode: proposal.code,
          currentState: proposal.state,
          computedState,
          lastLog: {
            action: lastLog?.action || 'CREATE',
            toState: lastLog?.toState || ProjectState.DRAFT,
            timestamp: lastLog?.timestamp || new Date(),
          },
        });
      } else {
        matchedCount++;
      }
    }

    this.logger.log(
      `Verification complete: ${matchedCount} matched, ${mismatches.length} mismatched`,
    );

    return {
      totalProposals: proposals.length,
      matchedCount,
      mismatchedCount: mismatches.length,
      mismatches,
      verifiedAt: new Date(),
    };
  }

  /**
   * Auto-correct mismatched states
   * Story 10.6: AC11 - Auto-Correct States
   *
   * @param mismatches - List of state mismatches
   * @returns Correction summary
   */
  async autoCorrectStates(
    mismatches: StateMismatch[],
  ): Promise<CorrectionSummary> {
    this.logger.log(`Starting auto-correction for ${mismatches.length} proposals...`);

    let correctedCount = 0;
    const errors: string[] = [];

    for (const mismatch of mismatches) {
      try {
        // Update proposal state
        await this.prisma.proposal.update({
          where: { id: mismatch.proposalId },
          data: { state: mismatch.computedState as ProjectState },
        });

        this.logger.debug(
          `Corrected state for ${mismatch.proposalCode}: ${mismatch.currentState} -> ${mismatch.computedState}`,
        );

        correctedCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Lỗi không xác định';
        errors.push(`Failed to correct ${mismatch.proposalCode}: ${errorMessage}`);
        this.logger.error(
          `Failed to correct state for ${mismatch.proposalCode}: ${errorMessage}`,
        );
      }
    }

    this.logger.log(
      `Auto-correction complete: ${correctedCount}/${mismatches.length} corrected`,
    );

    return {
      total: mismatches.length,
      corrected: correctedCount,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Compute expected state from workflow logs
   * Story 10.6: AC9 - State Computation
   *
   * @param proposalId - Proposal ID
   * @returns Expected state based on workflow logs
   */
  async computeExpectedState(proposalId: string): Promise<string> {
    // Get all workflow logs for this proposal, ordered by timestamp
    const logs = await this.prisma.workflowLog.findMany({
      where: { proposalId },
      orderBy: { timestamp: 'asc' },
    });

    // Start with DRAFT as initial state
    let currentState: ProjectState = ProjectState.DRAFT;

    // Apply each transition in sequence
    for (const log of logs) {
      // Use toState from workflow log
      if (log.toState) {
        currentState = log.toState;
      }
    }

    return currentState;
  }
}
