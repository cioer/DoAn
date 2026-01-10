import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { WorkflowAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { EmailService } from './email/email.service';
import {
  ProposalReminderInfo,
  RecipientGroup,
  RemindRecipientResult,
} from './dto/bulk-remind.dto';
import { SlaService } from '../calendar/sla.service';

/**
 * Bulk Remind Result
 * Proper typing - NO as unknown (Epic 7 retro pattern)
 */
interface BulkRemindResult {
  success: number;
  failed: number;
  total: number;
  recipients: RemindRecipientResult[];
  dryRun: boolean;
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
 * Notifications Service
 * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
 *
 * Handles bulk reminder email operations:
 * - Group recipients by holder_user
 * - Send reminder emails
 * - Track sent/failed status
 *
 * Critical: Follows Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private emailService: EmailService,
    private slaService: SlaService,
  ) {}

  /**
   * Get user display name from database
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
   * Calculate SLA status for a proposal
   * Proper typing - NO as any (Epic 7 retro pattern)
   *
   * @param proposal - Proposal with slaDeadline
   * @returns SLA status
   */
  private calculateSlaStatus(proposal: { slaDeadline?: Date | null }): 'ok' | 'warning' | 'overdue' {
    if (!proposal.slaDeadline) {
      return 'ok';
    }

    const now = new Date();
    const deadline = new Date(proposal.slaDeadline);
    const daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining < 0) {
      return 'overdue';
    } else if (daysRemaining <= 2) {
      return 'warning';
    }
    return 'ok';
  }

  /**
   * Group proposals by holder_user for bulk remind
   * Story 8.2: AC2 - Recipient Grouping
   *
   * @param proposalIds - List of proposal IDs
   * @returns Array of recipient groups with their proposals
   */
  async groupRecipientsByHolder(proposalIds: string[]): Promise<RecipientGroup[]> {
    // Get all proposals with their holders
    const proposals = await this.prisma.proposal.findMany({
      where: { id: { in: proposalIds } },
      select: {
        id: true,
        code: true,
        title: true,
        holderUser: true,
        slaDeadline: true,
      },
    });

    // Group by holder_user - NO as any casting (Epic 7 retro pattern)
    const grouped = new Map<string, ProposalReminderInfo[]>();

    for (const proposal of proposals) {
      if (!proposal.holderUser) {
        this.logger.warn(`Proposal ${proposal.code} has no holder_user, skipping`);
        continue;
      }

      if (!grouped.has(proposal.holderUser)) {
        grouped.set(proposal.holderUser, []);
      }

      // Calculate SLA status
      const slaStatus = this.calculateSlaStatus(proposal);

      // Calculate days remaining/overdue
      const daysRemaining = proposal.slaDeadline
        ? Math.ceil((new Date(proposal.slaDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : undefined;
      const overdueDays =
        daysRemaining !== undefined && daysRemaining < 0 ? Math.abs(daysRemaining) : undefined;

      // Create proposal info - Proper typing, NO as unknown
      const info: ProposalReminderInfo = {
        id: proposal.id,
        code: proposal.code,
        title: proposal.title,
        slaStatus,
        slaDeadline: proposal.slaDeadline ?? undefined,
        daysRemaining,
        overdueDays,
      };

      grouped.get(proposal.holderUser)!.push(info);
    }

    // Create recipient groups - Proper typing, NO as unknown
    const result: RecipientGroup[] = [];

    for (const [holderUserId, proposalInfos] of grouped.entries()) {
      const user = await this.prisma.user.findUnique({
        where: { id: holderUserId },
        select: { id: true, displayName: true, email: true },
      });

      if (!user) {
        this.logger.warn(`User ${holderUserId} not found, skipping`);
        continue;
      }

      if (!user.email) {
        this.logger.warn(`User ${user.displayName} has no email, skipping`);
        continue;
      }

      result.push({
        userId: user.id,
        userName: user.displayName,
        userEmail: user.email,
        proposals: proposalInfos,
      });
    }

    return result;
  }

  /**
   * Validate dry-run for bulk remind
   * Story 8.2: AC3 - Dry-Run Validation
   *
   * @param proposalIds - List of proposal IDs
   * @returns Validation result
   */
  async validateDryRun(proposalIds: string[]): Promise<{
    valid: boolean;
    recipientCount: number;
    proposalCount: number;
    invalidEmails: string[];
  }> {
    const recipientGroups = await this.groupRecipientsByHolder(proposalIds);

    const invalidEmails: string[] = [];
    let validCount = 0;

    for (const group of recipientGroups) {
      if (group.userEmail) {
        validCount++;
      } else {
        invalidEmails.push(group.userName);
      }
    }

    // Check if email service is available
    const emailEnabled = this.emailService.isEmailEnabled();

    return {
      valid: emailEnabled && validCount > 0,
      recipientCount: validCount,
      proposalCount: recipientGroups.reduce((sum, g) => sum + g.proposals.length, 0),
      invalidEmails,
    };
  }

  /**
   * Bulk Remind - Send reminder emails to grouped recipients
   * Story 8.2: AC4 - Email Execution
   *
   * @param proposalIds - List of proposal IDs
   * @param dryRun - If true, only validate without sending
   * @param context - Operation context
   * @returns BulkRemindResult with success/failed counts
   */
  async bulkRemind(
    proposalIds: string[],
    dryRun: boolean,
    context: BulkOperationContext,
  ): Promise<BulkRemindResult> {
    // Validate array length
    if (proposalIds.length === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EMPTY_PROPOSAL_LIST',
          message: 'Phải chọn ít nhất một hồ sơ',
        },
      });
    }

    if (proposalIds.length > 100) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EXCEEDS_LIMIT',
          message: 'Chỉ có thể gửi tối đa 100 hồ sơ cùng lúc',
        },
      });
    }

    // Group recipients by holder_user
    const recipientGroups = await this.groupRecipientsByHolder(proposalIds);

    if (recipientGroups.length === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_RECIPIENTS',
          message: 'Không tìm thấy người nhận (không có holder_user hoặc email)',
        },
      });
    }

    // Initialize result - Proper typing, NO as unknown
    const result: BulkRemindResult = {
      success: 0,
      failed: 0,
      total: recipientGroups.length,
      recipients: [],
      dryRun,
    };

    // AC3: Dry-run validation
    if (dryRun) {
      for (const group of recipientGroups) {
        result.recipients.push({
          userId: group.userId,
          userName: group.userName,
          emailSent: false, // Not sent in dry-run
        });
      }

      this.logger.log(`Dry-run completed for ${recipientGroups.length} recipients`);

      // Log audit for dry-run
      await this.auditService.logEvent({
        action: AuditAction.BULK_REMIND_DRY_RUN,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalIds.join(','),
        metadata: {
          proposalIds,
          recipientCount: recipientGroups.length,
          dryRun: true,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return result;
    }

    // AC4: Send emails sequentially
    for (const group of recipientGroups) {
      try {
        // Prepare proposal data for email
        const proposalData = group.proposals.map((p) => ({
          code: p.code,
          title: p.title,
          slaStatus: p.slaStatus,
          slaDeadline: p.slaDeadline
            ? new Date(p.slaDeadline).toLocaleDateString('vi-VN')
            : undefined,
          daysRemaining: p.daysRemaining,
          overdueDays: p.overdueDays,
        }));

        // Send email
        const sendResult = await this.emailService.sendReminder(
          group.userEmail,
          group.userName,
          proposalData,
        );

        if (sendResult.success) {
          result.success++;

          // Log workflow action for each proposal - Proper enum usage (Epic 7 retro)
          // Note: Reminder doesn't change state, so we need to get the current state
          const proposalIds = group.proposals.map((p) => p.id);
          const proposalsWithState = await this.prisma.proposal.findMany({
            where: { id: { in: proposalIds } },
            select: { id: true, state: true },
          });

          const stateMap = new Map(proposalsWithState.map((p) => [p.id, p.state]));

          for (const proposal of group.proposals) {
            const currentState = stateMap.get(proposal.id);
            if (currentState) {
              await this.prisma.workflowLog.create({
                data: {
                  proposalId: proposal.id,
                  action: WorkflowAction.REMIND_SENT,
                  fromState: currentState, // Use current state (reminder doesn't change state)
                  toState: currentState, // Use current state (reminder doesn't change state)
                  actorId: context.userId,
                  actorName: await this.getUserDisplayName(context.userId),
                  comment: `Email nhắc đã gửi tới ${group.userEmail}`,
                  timestamp: new Date(),
                },
              });
            }
          }

          result.recipients.push({
            userId: group.userId,
            userName: group.userName,
            emailSent: true,
          });
        } else {
          result.failed++;
          result.recipients.push({
            userId: group.userId,
            userName: group.userName,
            emailSent: false,
            error: sendResult.error,
          });
        }
      } catch (error) {
        result.failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Lỗi không xác định';
        result.recipients.push({
          userId: group.userId,
          userName: group.userName,
          emailSent: false,
          error: errorMessage,
        });
        this.logger.error(`Failed to send reminder to ${group.userEmail}: ${errorMessage}`);
      }
    }

    // Log audit event for bulk remind
    await this.auditService.logEvent({
      action: AuditAction.BULK_REMIND,
      actorUserId: context.userId,
      entityType: 'Proposal',
      entityId: proposalIds.join(','),
      metadata: {
        proposalIds,
        recipientCount: recipientGroups.length,
        successCount: result.success,
        failedCount: result.failed,
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(
      `Bulk remind completed: ${result.success}/${result.total} successful, ${result.failed} failed`,
    );

    return result;
  }

  /**
   * Validate user has permission to perform bulk operations
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
