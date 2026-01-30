import { Injectable, Logger } from '@nestjs/common';
import { ProjectState, Proposal, Prisma } from '@prisma/client';
import { SPECIAL_UNIT_CODES } from '../helpers/workflow.constants';

/**
 * Holder Assignment for Workflow
 *
 * Defines who holds (owns) a proposal at each state.
 * This service encapsulates all holder assignment logic extracted from WorkflowService.
 *
 * Refactored from Epic 3 holder rules.
 */
@Injectable()
export class HolderAssignmentService {
  private readonly logger = new Logger(HolderAssignmentService.name);

  /**
   * Get holder assignment for a proposal state
   *
   * Based on Epic 3 holder rules:
   * - DRAFT: null, null (not assigned yet)
   * - FACULTY_COUNCIL_OUTLINE_REVIEW: faculty_id, null (faculty reviews)
   * - SCHOOL_COUNCIL_OUTLINE_REVIEW: "PHONG_KHCN", null (PKHCN assigns council)
   * - SCHOOL_COUNCIL_OUTLINE_REVIEW: council_id, council_secretary_id
   * - CHANGES_REQUESTED: owner_faculty_id, owner_id (back to PI)
   * - APPROVED: owner_faculty_id, owner_id (PI to implement)
   * - IN_PROGRESS: owner_faculty_id, owner_id (PI working)
   * - PAUSED: "PHONG_KHCN", null (PKHCN paused it)
   * - CANCELLED/REJECTED/WITHDRAWN: actor_unit, actor_id (decision maker)
   *
   * @param state - Target state
   * @param proposal - Proposal data (for owner, faculty info)
   * @param actorId - User making the transition (for exception states)
   * @param actorFacultyId - Faculty of the actor (optional)
   * @returns Holder assignment with holderUnit and holderUser
   */
  getHolderForState(
    state: ProjectState,
    proposal: Pick<Proposal, 'ownerId' | 'facultyId' | 'holderUnit' | 'holderUser'>,
    actorId?: string,
    actorFacultyId?: string,
  ): { holderUnit: string | null; holderUser: string | null } {
    this.logger.debug(`Calculating holder for state: ${state}`);

    switch (state) {
      // Phase A: Proposal States
      case ProjectState.DRAFT:
        // Not assigned - still with owner
        return { holderUnit: null, holderUser: null };

      case ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW:
        // Assigned to faculty for review
        return {
          holderUnit: proposal.facultyId,
          holderUser: null, // Anyone with QUAN_LY_KHOA role can act
        };

      case ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW:
        // PKHCN assigns council
        return {
          holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN,
          holderUser: null,
        };

      case ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW:
        // Assigned to council - holderUnit should be council_id
        // This will be set by the ASSIGN_COUNCIL action
        return {
          holderUnit: proposal.holderUnit || null, // Keep existing if set
          holderUser: proposal.holderUser || null,
        };

      // Phase B: Changes & Approval
      case ProjectState.CHANGES_REQUESTED:
        // Return to PI for revisions
        return {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

      case ProjectState.APPROVED:
      case ProjectState.IN_PROGRESS:
        // PI owns the approved project
        return {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

      // Phase C: Acceptance & Handover
      case ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW:
        // Faculty reviews acceptance
        return {
          holderUnit: proposal.facultyId,
          holderUser: null, // Anyone with QUAN_LY_KHOA role
        };

      case ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW:
        // PKHCN or BGH reviews
        return {
          holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN,
          holderUser: null,
        };

      case ProjectState.HANDOVER:
        // PI completes handover
        return {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

      case ProjectState.COMPLETED:
        // Terminal - no holder needed
        return {
          holderUnit: null,
          holderUser: null,
        };

      // Exception States
      case ProjectState.PAUSED:
        // PKHCN controls pause
        return {
          holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN,
          holderUser: null,
        };

      case ProjectState.CANCELLED:
      case ProjectState.REJECTED:
      case ProjectState.WITHDRAWN:
        // Terminal - assigned to decision maker for tracking
        return {
          holderUnit: actorFacultyId || proposal.facultyId,
          holderUser: actorId || null,
        };

      default:
        // Fallback - shouldn't happen with proper typing
        this.logger.warn(`Unknown state in getHolderForState: ${state}`);
        return {
          holderUnit: null,
          holderUser: null,
        };
    }
  }

  /**
   * Check if a user can act on a proposal based on holder rules
   *
   * @param proposal - Proposal with holderUnit, holderUser, state, and ownerId
   * @param userId - User ID to check
   * @param userFacultyId - User's faculty ID
   * @param userRole - User's role
   * @returns true if user can act on the proposal
   */
  canUserActOnProposal(
    proposal: Pick<Proposal, 'holderUnit' | 'holderUser' | 'state' | 'ownerId'>,
    userId: string,
    userFacultyId: string | null,
    userRole: string,
  ): boolean {
    const { holderUnit, holderUser, state, ownerId } = proposal;

    // Exception: Terminal states - no one can act
    if (
      state === ProjectState.COMPLETED ||
      state === ProjectState.CANCELLED ||
      state === ProjectState.REJECTED ||
      state === ProjectState.WITHDRAWN
    ) {
      return false;
    }

    // DRAFT state - only owner can act
    if (state === ProjectState.DRAFT) {
      return ownerId === userId;
    }

    // Specific user assignment
    if (holderUser) {
      return holderUser === userId;
    }

    // Faculty/unit assignment
    if (holderUnit) {
      // PHONG_KHCN is a special unit code
      if (holderUnit === SPECIAL_UNIT_CODES.PHONG_KHCN) {
        return userRole === 'PHONG_KHCN';
      }

      // Faculty assignment
      return userFacultyId === holderUnit;
    }

    // No holder = no restriction (shouldn't happen in practice)
    return true;
  }

  /**
   * Get holder display name for UI
   *
   * @param holderUnit - Unit ID or code
   * @param holderUser - User ID
   * @returns Display string
   */
  getHolderDisplayName(
    holderUnit: string | null,
    holderUser: string | null,
  ): string {
    if (holderUser) {
      // Specific user - would need to query User table for display name
      return 'Người dùng được chỉ định';
    }

    if (holderUnit) {
      if (holderUnit === SPECIAL_UNIT_CODES.PHONG_KHCN) {
        return 'Phòng KHCN';
      }
      // Faculty - would need to query Faculty table
      return `Khoa (${holderUnit})`;
    }

    return 'Chưa phân công';
  }

  /**
   * Terminal states that should NOT appear in queue filters
   * These states are complete/cancelled and don't need action
   */
  private readonly TERMINAL_QUEUE_STATES: ProjectState[] = [
    ProjectState.COMPLETED,
    ProjectState.CANCELLED,
    ProjectState.REJECTED,
    ProjectState.WITHDRAWN,
  ];

  /**
   * Check if a state is terminal for queue purposes
   *
   * @param state - Proposal state to check
   * @returns true if state is terminal (not in queue)
   */
  isTerminalQueueState(state: ProjectState): boolean {
    return this.TERMINAL_QUEUE_STATES.includes(state);
  }

  /**
   * Get Prisma where input for "Đang chờ tôi" (Waiting for me) queue filter
   *
   * Returns proposals where:
   * - holderUnit matches user's faculty_id, OR
   * - holderUnit = "PHONG_KHCN" and user has PHONG_KHCN role, OR
   * - holderUser matches user.id
   * - AND state is NOT terminal (COMPLETED, CANCELLED, REJECTED, WITHDRAWN)
   *
   * @param userId - User ID to match against holderUser
   * @param userFacultyId - User's faculty ID to match against holderUnit
   * @param userRole - User's role (for PHONG_KHCN special handling)
   * @returns Prisma.WhereInput for querying proposals in user's queue
   */
  getMyQueueProposalsFilter(
    userId: string,
    userFacultyId: string | null,
    userRole: string,
  ): Prisma.ProposalWhereInput {
    const isPhongKHCN = userRole === 'PHONG_KHCN';

    return {
      OR: [
        // Match by holderUser (specific user assignment)
        { holderUser: userId },
        // Match by holderUnit = user's faculty
        { holderUnit: userFacultyId },
        // Match by PHONG_KHCN special unit (only if user has role)
        ...(isPhongKHCN ? [{ holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN }] : []),
      ],
      // Exclude terminal states from queue
      state: { notIn: this.TERMINAL_QUEUE_STATES },
    };
  }

  /**
   * Get Prisma where input for "Của tôi" (My Proposals) queue filter
   *
   * Returns proposals where:
   * - ownerId = user.id
   * - Useful for PROJECT_OWNER to see all their proposals
   *
   * @param userId - User ID (owner)
   * @returns Prisma.WhereInput for querying user's proposals
   */
  getMyProposalsFilter(userId: string): Prisma.ProposalWhereInput {
    return { ownerId: userId };
  }

  /**
   * Get Prisma where input for "Quá hạn" (Overdue) queue filter
   *
   * Returns proposals where:
   * - sla_deadline < now()
   * - state is NOT terminal (COMPLETED, CANCELLED, PAUSED)
   *
   * @param currentDate - Current date for comparison (defaults to new Date())
   * @returns Prisma.WhereInput for querying overdue proposals
   */
  getOverdueProposalsFilter(
    currentDate: Date = new Date(),
  ): Prisma.ProposalWhereInput {
    return {
      slaDeadline: { lt: currentDate },
      state: {
        notIn: [...this.TERMINAL_QUEUE_STATES, ProjectState.PAUSED],
      },
    };
  }

  /**
   * Get Prisma where input for "Sắp đến hạn" (Upcoming) queue filter
   *
   * Story 3.5: Returns proposals where SLA deadline is within 2 working days
   * - sla_deadline >= startDate AND <= endDate
   * - state is NOT terminal (COMPLETED, CANCELLED, PAUSED)
   *
   * @param startDate - Start date for range (typically now())
   * @param endDate - End date for range (typically now + 2 working days)
   * @returns Prisma.WhereInput for querying upcoming proposals
   */
  getUpcomingProposalsFilter(
    startDate: Date,
    endDate: Date,
  ): Prisma.ProposalWhereInput {
    return {
      slaDeadline: {
        gte: startDate,
        lte: endDate,
      },
      state: {
        notIn: [...this.TERMINAL_QUEUE_STATES, ProjectState.PAUSED],
      },
    };
  }

  /**
   * Get service health/stats
   * Useful for health checks and monitoring
   */
  getStats() {
    return {
      service: 'HolderAssignmentService',
      terminalStates: this.TERMINAL_QUEUE_STATES.length,
      specialUnitCodes: Object.values(SPECIAL_UNIT_CODES),
    };
  }
}
