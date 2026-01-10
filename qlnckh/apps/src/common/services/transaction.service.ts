import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/auth/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Transaction result wrapper
 * Contains proposal and workflow log from atomic transaction
 */
export interface TransactionResult {
  proposal: any;
  workflowLog: any;
  [key: string]: any; // Allow additional fields
}

/**
 * Transaction context for workflow operations
 */
export interface TransactionContext {
  proposalId: string;
  userId: string;
  userDisplayName?: string;
  action: string;
  fromState: string;
  toState: string;
  holderUnit?: string | null;
  holderUser?: string | null;
  slaStartDate?: Date;
  slaDeadline?: Date;
  returnTargetState?: string;
  returnTargetHolderUnit?: string;
  comment?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Transaction Orchestrator Service
 *
 * Manages database transactions for workflow state transitions.
 * Ensures atomicity of multi-step operations:
 * - Proposal state update
 * - Workflow log creation
 * - SLA date updates
 *
 * **CRITICAL (Tech-Spec Finding F3 - Transaction Boundary Clarified):**
 * - Audit logging happens OUTSIDE transaction (fire-and-forget with retry)
 * - Only proposal + workflow log are transactional
 * - If audit log fails, transaction is NOT rolled back (intentional)
 *
 * **Transaction Pattern:**
 * ```typescript
 * const result = await transactionService.executeWorkflowTransition(
 *   context,
 *   async (tx) => {
 *     const updated = await tx.proposal.update({...});
 *     const workflowLog = await tx.workflowLog.create({...});
 *     return { proposal: updated, workflowLog };
 *   }
 * );
 *
 * // Audit happens AFTER transaction commits
 * await auditHelper.logWorkflowTransition(result);
 * ```
 *
 * @Injectable - Can be injected into any service needing transactions
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Execute workflow transition in atomic transaction
   * Ensures proposal update + workflow log creation happen together or not at all
   *
   * @param context - Transaction context with proposal/user info
   * @param transactionFn - Function to execute within transaction
   * @returns Transaction result with proposal + workflow log
   *
   * @example
   * const result = await this.transactionService.executeWorkflowTransition(
   *   {
   *     proposalId: 'prop-1',
   *     userId: 'user-1',
   *     action: 'APPROVE',
   *     fromState: 'FACULTY_REVIEW',
   *     toState: 'SCHOOL_SELECTION_REVIEW',
   *     holderUnit: 'PHONG_KHCN',
   *   },
   *   async (tx) => {
   *     const proposal = await tx.proposal.update({
   *       where: { id: context.proposalId },
   *       data: { state: context.toState }
   *     });
   *     const workflowLog = await tx.workflowLog.create({
   *       data: { proposalId: context.proposalId, ... }
   *     });
   *     return { proposal, workflowLog };
   *   }
   * );
   */
  async executeWorkflowTransition<T extends TransactionResult>(
    context: TransactionContext,
    transactionFn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    this.logger.debug(
      `Executing workflow transition: ${context.proposalId} (${context.fromState} → ${context.toState})`,
    );

    // Execute in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      return await transactionFn(tx);
    });

    this.logger.debug(
      `Transaction committed: ${context.proposalId} → ${context.toState}`,
    );

    return result;
  }

  /**
   * Execute transaction with automatic rollback on error
   * Generic transaction executor for any database operations
   *
   * @param transactionFn - Function to execute within transaction
   * @returns Result from transaction function
   *
   * @example
   * const result = await this.transactionService.execute(async (tx) => {
   *   const user = await tx.user.create({...});
   *   const profile = await tx.profile.create({...});
   *   return { user, profile };
   * });
   */
  async execute<T>(transactionFn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await transactionFn(tx);
    });
  }

  /**
   * Execute proposal update transaction
   * Helper for common proposal update + log pattern
   *
   * @param context - Transaction context
   * @returns Transaction result
   */
  async updateProposalWithLog(
    context: TransactionContext,
  ): Promise<TransactionResult> {
    return this.executeWorkflowTransition(context, async (tx) => {
      // Update proposal
      const proposal = await tx.proposal.update({
        where: { id: context.proposalId },
        data: {
          state: context.toState as any,
          holderUnit: context.holderUnit,
          holderUser: context.holderUser,
          slaStartDate: context.slaStartDate,
          slaDeadline: context.slaDeadline,
        },
      });

      // Create workflow log
      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId: context.proposalId,
          action: context.action as any,
          fromState: context.fromState as any,
          toState: context.toState as any,
          actorId: context.userId,
          actorName: context.userDisplayName || context.userId,
          returnTargetState: context.returnTargetState as any,
          returnTargetHolderUnit: context.returnTargetHolderUnit,
          comment: context.comment,
        },
      });

      return { proposal, workflowLog };
    });
  }

  /**
   * Execute proposal update with section data
   * For operations that update proposal sections
   *
   * @param proposalId - Proposal ID
   * @param sections - Section data to update
   * @param transactionFn - Additional transaction logic
   * @returns Updated proposal
   */
  async updateProposalSections<T>(
    proposalId: string,
    sections: any,
    transactionFn?: (tx: Prisma.TransactionClient, proposal: any) => Promise<T>,
  ): Promise<{ proposal: any; additional?: T }> {
    return this.execute(async (tx) => {
      // Update proposal with new section data
      const proposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          sections: sections as any, // Prisma Json type
        },
      });

      // Execute additional logic if provided
      let additional: T | undefined;
      if (transactionFn) {
        additional = await transactionFn(tx, proposal);
      }

      return { proposal, additional };
    });
  }

  /**
   * Batch update multiple proposals
   * For bulk operations (e.g., bulk approval)
   *
   * @param proposalIds - Array of proposal IDs
   * @param updateData - Data to update
   * @param createLogFn - Function to create workflow log for each
   * @returns Array of updated proposals
   */
  async batchUpdateProposals(
    proposalIds: string[],
    updateData: any,
    createLogFn: (proposalId: string) => any,
  ): Promise<{ proposals: any[]; workflowLogs: any[] }> {
    return this.execute(async (tx) => {
      // Update all proposals
      const proposals = await Promise.all(
        proposalIds.map((id) =>
          tx.proposal.update({
            where: { id },
            data: updateData,
          }),
        ),
      );

      // Create workflow logs
      const workflowLogs = await Promise.all(
        proposalIds.map((id) =>
          tx.workflowLog.create({
            data: createLogFn(id),
          }),
        ),
      );

      return { proposals, workflowLogs };
    });
  }

  /**
   * Execute with retry on serialization failure
   * Handles PostgreSQL serialization errors (code 40001)
   *
   * @param transactionFn - Function to execute
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns Transaction result
   */
  async executeWithRetry<T>(
    transactionFn: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(transactionFn);
      } catch (error: any) {
        lastError = error;

        // Check for serialization failure
        if (error.code === 'P2034' && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          this.logger.warn(
            `Serialization failure, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Create savepoint for nested transactions
   * NOT supported by Prisma - use separate transactions instead
   *
   * Note: Prisma doesn't support savepoints. Use separate transactions
   * or restructure logic to avoid nested transactions.
   */
  async executeInIsolation<T>(
    transactionFn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    this.logger.warn('Nested transactions not supported by Prisma, using separate transaction');
    return this.execute(transactionFn);
  }

  /**
   * Get transaction statistics
   * Useful for monitoring and debugging
   */
  getStats() {
    return {
      prismaClient: this.prisma.constructor.name,
      // Add more stats as needed
    };
  }

  /**
   * Health check for transaction service
   * Verifies database connection is working
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Transaction service health check failed', error);
      return false;
    }
  }

  /**
   * Transaction Best Practices (from Tech-Spec AC2):
   *
   * ✅ DO: Keep transactions short
   * ✅ DO: Only include critical operations in transaction
   * ✅ DO: Execute audit logging AFTER transaction commits
   * ✅ DO: Use proper error handling with specific error codes
   *
   * ❌ DON'T: Include external API calls in transactions
   * ❌ DON'T: Include file I/O in transactions
   * ❌ DON'T: Include audit logging in transaction (fire-and-forget)
   * ❌ DON'T: Hold transactions open for user input
   *
   * Example pattern:
   * ```typescript
   * // GOOD: Transaction only for DB operations
   * const result = await this.prisma.$transaction(async (tx) => {
   *   const proposal = await tx.proposal.update({...});
   *   const log = await tx.workflowLog.create({...});
   *   return { proposal, log };
   * });
   *
   * // Audit AFTER transaction (non-blocking)
   * this.auditService.logEvent({...}).catch(err => {
   *   this.logger.error('Audit failed (non-blocking)', err);
   * });
   *
   * // BAD: Including external call in transaction
   * await this.prisma.$transaction(async (tx) => {
   *   const proposal = await tx.proposal.update({...});
   *   await this.emailService.send({...}); // ❌ SLOWS DOWN TRANSACTION
   *   return proposal;
   * });
   * ```
   */
}
