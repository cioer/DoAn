import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState, WorkflowAction, Proposal } from '@prisma/client';
import {
  isValidTransition,
  InvalidTransitionError,
  isTerminalState,
} from '../helpers/state-machine.helper';
import {
  canRolePerformAction,
} from '../helpers/workflow.constants';

/**
 * Validation context for workflow operations
 * Contains proposal and user information for validation
 */
export interface ValidationContext {
  proposal: Proposal;
  user: {
    id: string;
    role: string;
    facultyId?: string | null;
    displayName?: string;
  };
  targetState?: ProjectState;
  action?: WorkflowAction; // Optional - action is also passed as parameter
}

/**
 * Workflow Validator Service
 *
 * Centralizes all validation logic for workflow transitions.
 * This service extracts validation concerns from WorkflowService
 * following Single Responsibility Principle.
 *
 * Validations performed:
 * - Proposal existence
 * - State transition validity
 * - User permissions (RBAC: role + state + action)
 * - Proposal ownership
 * - Terminal state checks
 * - Revision section validation (for returns)
 *
 * @Injectable - Registered in WorkflowModule
 */
@Injectable()
export class WorkflowValidatorService {
  private readonly logger = new Logger(WorkflowValidatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate complete transition request
   * Combines all validation checks for a workflow transition
   *
   * @param proposalId - Proposal to validate
   * @param targetState - Target state for transition
   * @param action - Workflow action being performed
   * @param context - User context
   * @throws BadRequestException | NotFoundException | ForbiddenException
   */
  async validateTransition(
    proposalId: string,
    targetState: ProjectState,
    action: WorkflowAction,
    context: ValidationContext,
  ): Promise<void> {
    // Fetch proposal with relations
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    // Validate proposal exists
    this.validateProposalExists(proposal, proposalId);

    // Validate state transition is allowed
    this.validateStateTransition(proposal!, targetState, action);

    // Validate user permission (RBAC: role + state + action)
    this.validateUserPermission(context.user.role, proposal!, action);

    // Validate ownership (for certain actions)
    this.validateProposalOwnership(proposal!, context.user, action);

    // Validate terminal state (if applicable)
    this.validateTerminalState(proposal!, action);
  }

  /**
   * Validate proposal exists
   * @throws NotFoundException if proposal not found
   */
  validateProposalExists(proposal: Proposal | null, proposalId: string): void {
    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }
  }

  /**
   * Validate state transition is valid according to state machine
   * @throws InvalidTransitionError if transition is not allowed
   */
  validateStateTransition(
    proposal: Proposal,
    targetState: ProjectState,
    action: WorkflowAction,
  ): void {
    if (!isValidTransition(proposal.state, targetState, action)) {
      throw new InvalidTransitionError(
        proposal.state,
        targetState,
        action,
      );
    }
  }

  /**
   * Validate user permission (RBAC: role + state + action)
   * This is the CORE RBAC check - never bypass this!
   *
   * From project-context.md:
   * "NEVER check only role. Authorization is: role + state + action"
   *
   * @throws ForbiddenException if user lacks permission
   */
  validateUserPermission(
    userRole: string,
    proposal: Proposal,
    action: WorkflowAction,
  ): void {
    if (!canRolePerformAction(action, userRole)) {
      throw new ForbiddenException(
        `Vai trò '${userRole}' không có quyền thực hiện hành động ${action}`,
      );
    }

    // Additional state-based checks can be added here
    // For example: Only GIANG_VIEN can submit DRAFT proposals
    // Only KHOA can approve FACULTY_REVIEW proposals, etc.
  }

  /**
   * Validate proposal ownership for certain actions
   * Some actions can only be performed by the proposal owner
   *
   * Actions requiring ownership:
   * - SUBMIT (only owner can submit)
   * - WITHDRAW (only owner can withdraw)
   * - RESUBMIT (only owner can resubmit)
   *
   * @throws BadRequestException if user is not owner
   */
  validateProposalOwnership(
    proposal: Proposal,
    user: { id: string; role: string },
    action: WorkflowAction,
  ): void {
    const ownershipRequiredActions: WorkflowAction[] = [
      WorkflowAction.SUBMIT,
      WorkflowAction.WITHDRAW,
      WorkflowAction.RESUBMIT,
      WorkflowAction.CANCEL,
      WorkflowAction.SUBMIT_ACCEPTANCE,
    ];

    if (ownershipRequiredActions.includes(action)) {
      if (proposal.ownerId !== user.id) {
        throw new BadRequestException(
          action === WorkflowAction.SUBMIT
            ? 'Chỉ chủ nhiệm đề tài mới có thể nộp hồ sơ'
            : action === WorkflowAction.WITHDRAW
            ? 'Chỉ chủ nhiệm đề tài mới có thể rút hồ sơ'
            : action === WorkflowAction.CANCEL
            ? 'Chỉ chủ nhiệm đề tài mới có thể hủy đề tài'
            : action === WorkflowAction.SUBMIT_ACCEPTANCE
            ? 'Chỉ chủ nhiệm đề tài mới có thể nộp nghiệm thu'
            : 'Chỉ chủ nhiệm đề tài mới có thể nộp lại hồ sơ',
        );
      }
    }
  }

  /**
   * Validate proposal is not in terminal state
   * Terminal states cannot be transitioned out of
   *
   * Terminal states: COMPLETED, REJECTED, WITHDRAWN, CANCELLED
   *
   * @throws BadRequestException if proposal is in terminal state
   */
  validateTerminalState(proposal: Proposal, action: WorkflowAction): void {
    // Certain actions should not be performed on terminal states
    const blockedActions: WorkflowAction[] = [
      WorkflowAction.APPROVE,
      WorkflowAction.RETURN,
      WorkflowAction.SUBMIT,
      WorkflowAction.ACCEPT,
    ];

    if (blockedActions.includes(action) && isTerminalState(proposal.state)) {
      throw new BadRequestException(
        `Không thể thực hiện hành động ${action} khi đề tài ở trạng thái cuối (${proposal.state})`,
      );
    }
  }

  /**
   * Validate revision sections for return actions
   * When returning a proposal, sections requiring revision must be specified
   *
   * @param sections - Array of section IDs requiring revision
   * @throws BadRequestException if sections are empty or invalid
   */
  validateRevisionSections(sections: string[]): void {
    if (!sections || sections.length === 0) {
      throw new BadRequestException(
        'Phải chỉ định các mục cần sửa đổi khi yêu cầu sửa lại',
      );
    }

    // Validate section IDs are not empty strings
    const invalidSections = sections.filter((s) => !s || s.trim() === '');
    if (invalidSections.length > 0) {
      throw new BadRequestException(
        'ID mục không được để trống',
      );
    }
  }

  /**
   * Validate return reason is provided
   * Return actions require a reason to be specified
   *
   * @param reason - Return reason
   * @throws BadRequestException if reason is empty
   */
  validateReturnReason(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException(
        'Phải cung cấp lý do khi yêu cầu sửa lại',
      );
    }

    if (reason.trim().length < 10) {
      throw new BadRequestException(
        'Lý do phải có ít nhất 10 ký tự',
      );
    }
  }

  /**
   * Validate proposal state before transition
   * Specific state checks for certain actions
   *
   * @param proposal - Proposal to validate
   * @param expectedState - Expected current state
   * @param action - Action being performed
   * @throws BadRequestException if state is incorrect
   */
  validateProposalState(
    proposal: Proposal,
    expectedState: ProjectState,
    action: WorkflowAction,
  ): void {
    if (proposal.state !== expectedState) {
      throw new BadRequestException(
        `Chỉ có thể thực hiện ${action} khi đề tài ở trạng thái ${expectedState}. Hiện tại: ${proposal.state}`,
      );
    }
  }

  /**
   * Validate exception action permissions
   * Exception actions (cancel, reject, pause, resume) have special rules
   *
   * @param proposal - Proposal to validate
   * @param action - Exception action
   * @param userRole - User role
   * @throws ForbiddenException if user lacks permission
   */
  validateExceptionAction(
    proposal: Proposal,
    action: WorkflowAction,
    userRole: string,
  ): void {
    // PAUSE action: Only PHONG_KHCN can pause
    if (action === WorkflowAction.PAUSE && userRole !== 'PHONG_KHCN') {
      throw new ForbiddenException(
        'Chỉ Phòng KHCN mới có thể tạm dừng đề tài',
      );
    }

    // RESUME action: Only PHONG_KHCN can resume
    if (action === WorkflowAction.RESUME && userRole !== 'PHONG_KHCN') {
      throw new ForbiddenException(
        'Chỉ Phòng KHCN mới có thể tiếp tục đề tài đã tạm dừng',
      );
    }

    // CANCEL action: Only owner can cancel
    if (action === WorkflowAction.CANCEL) {
      // Ownership check is done in validateProposalOwnership
      // Additional check: can only cancel DRAFT or PAUSED
      if (
        proposal.state !== ProjectState.DRAFT &&
        proposal.state !== ProjectState.PAUSED
      ) {
        throw new BadRequestException(
          'Chỉ có thể hủy đề tài ở trạng thái NHÁP hoặc ĐÃ TẠM DỪNG',
        );
      }
    }
  }

  /**
   * Validate approval action
   * Approvals have state-specific requirements
   *
   * @param proposal - Proposal to validate
   * @param action - Approval action
   * @param userRole - User role
   * @throws BadRequestException | ForbiddenException if validation fails
   */
  validateApprovalAction(
    proposal: Proposal,
    action: WorkflowAction,
    userRole: string,
  ): void {
    // Faculty approval
    if (action === WorkflowAction.APPROVE && userRole === 'KHOA') {
      if (proposal.state !== ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW) {
        throw new BadRequestException(
          'Chỉ có thể duyệt khi đề tài đang được Khoa xem xét',
        );
      }
    }

    // School approval
    if (action === WorkflowAction.APPROVE && userRole === 'PHONG_KHCN') {
      if (proposal.state !== ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW) {
        throw new BadRequestException(
          'Chỉ có thể duyệt khi đề tài đang được xét duyệt bởi Hội đồng Trường',
        );
      }
    }
  }
}
