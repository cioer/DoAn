import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { WorkflowAction, Proposal } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Result interface for bulk assign operation
 * Properly typed - NO as unknown casting (Epic 7 retro pattern)
 */
interface BulkAssignResult {
  success: number;
  failed: number;
  total: number;
  errors: BulkAssignErrorItem[];
}

/**
 * Error item for bulk assign result
 */
interface BulkAssignErrorItem {
  proposalId: string;
  proposalCode: string;
  reason: string;
}

/**
 * Context for bulk operations
 */
interface BulkOperationContext {
  userId: string;
  userRole: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Bulk Operations Service
 * Story 8.1: Bulk Assign (Gán holder_user hàng loạt)
 *
 * Handles bulk operations on multiple proposals:
 * - Bulk assign holder_user to multiple proposals
 *
 * Critical: Follows Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 * - File operations OUTSIDE transactions
 */
@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get user display name from database
   * Used for audit logs and workflow entries
   *
   * @param userId - User ID to fetch
   * @returns Display name or fallback to user role
   */
  private async getUserDisplayName(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      return user?.displayName || userId;
    } catch {
      return userId;
    }
  }

  /**
   * Bulk Assign holder_user to multiple proposals
   * Story 8.1: AC3 - Execute bulk assign
   *
   * @param proposalIds - List of proposal IDs to assign
   * @param targetUserId - User ID to assign as holder_user
   * @param context - Operation context
   * @returns BulkAssignResult with success/failed counts and errors
   */
  async bulkAssign(
    proposalIds: string[],
    targetUserId: string,
    context: BulkOperationContext,
  ): Promise<BulkAssignResult> {
    // Validate: Check array length
    if (proposalIds.length === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EMPTY_PROPOSAL_LIST',
          message: 'Phải chọn ít nhất một đề tài',
        },
      });
    }

    if (proposalIds.length > 100) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EXCEEDS_LIMIT',
          message: 'Chỉ có thể gán tối đa 100 đề tài cùng lúc',
        },
      });
    }

    // Validate: Target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true, email: true },
    });

    if (!targetUser) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Người dùng không tồn tại',
        },
      });
    }

    // Initialize result object - Proper typing, NO as unknown
    const result: BulkAssignResult = {
      success: 0,
      failed: 0,
      total: proposalIds.length,
      errors: [],
    };

    // Get all proposals with their current state
    const proposals = await this.prisma.proposal.findMany({
      where: { id: { in: proposalIds } },
      select: {
        id: true,
        code: true,
        state: true,
        holderUser: true,
      },
    });

    // Check for not found proposals
    const foundIds = new Set(proposals.map((p) => p.id));
    for (const id of proposalIds) {
      if (!foundIds.has(id)) {
        result.failed++;
        result.errors.push({
          proposalId: id,
          proposalCode: 'Unknown',
          reason: 'Không tìm thấy đề tài',
        });
      }
    }

    // Get actor display name for workflow logs
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Process each proposal - Partial success OK, no full rollback
    for (const proposal of proposals) {
      try {
        // Update holder_user
        await this.prisma.proposal.update({
          where: { id: proposal.id },
          data: { holderUser: targetUserId },
        });

        // Log workflow action - Proper enum usage (Epic 7 retro)
        // NO double cast: action: WorkflowAction.BULK_ASSIGN (direct)
        await this.prisma.workflowLog.create({
          data: {
            proposalId: proposal.id,
            action: WorkflowAction.BULK_ASSIGN,
            fromState: proposal.state,
            toState: proposal.state,
            actorId: context.userId,
            actorName: actorDisplayName,
            comment: `Gán cho ${targetUser.displayName}`,
            timestamp: new Date(),
          },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Lỗi không xác định';
        result.errors.push({
          proposalId: proposal.id,
          proposalCode: proposal.code,
          reason: errorMessage,
        });
        this.logger.error(
          `Failed to assign holder_user for proposal ${proposal.code}: ${errorMessage}`,
        );
      }
    }

    // Log audit event for bulk operation
    await this.auditService.logEvent({
      action: AuditAction.BULK_ASSIGN,
      actorUserId: context.userId,
      entityType: 'Proposal',
      entityId: proposalIds.join(','),
      metadata: {
        proposalIds,
        targetUserId,
        targetUserDisplayName: targetUser.displayName,
        successCount: result.success,
        failedCount: result.failed,
        errors: result.errors,
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(
      `Bulk assign completed: ${result.success}/${result.total} successful, ${result.failed} failed`,
    );

    return result;
  }

  /**
   * Validate user has permission to perform bulk operations
   * Only PHONG_KHCN and ADMIN can perform bulk operations
   *
   * @param userRole - User's role
   * @throws BadRequestException if user lacks permission
   */
  validateBulkPermission(userRole: string): void {
    const allowedRoles = ['PHONG_KHCN', 'ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      });
    }
  }
}
