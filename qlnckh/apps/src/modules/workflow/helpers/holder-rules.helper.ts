import { ProjectState, Proposal } from '@prisma/client';
import { SPECIAL_UNIT_CODES } from './workflow.constants';

/**
 * Holder Assignment
 * Defines who holds the proposal at each state
 */
export interface HolderAssignment {
  holderUnit: string | null;
  holderUser: string | null;
}

/**
 * Get holder assignment for a proposal state
 *
 * Based on Epic 3 holder rules:
 * - DRAFT: null, null (not assigned yet)
 * - FACULTY_REVIEW: faculty_id, null (faculty reviews)
 * - SCHOOL_SELECTION_REVIEW: "PHONG_KHCN", null (PKHCN assigns council)
 * - OUTLINE_COUNCIL_REVIEW: council_id, council_secretary_id
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
export function getHolderForState(
  state: ProjectState,
  proposal: Pick<
    Proposal,
    'ownerId' | 'facultyId' | 'holderUnit' | 'holderUser'
  >,
  actorId?: string,
  actorFacultyId?: string,
): HolderAssignment {
  switch (state) {
    // Phase A: Proposal States
    case ProjectState.DRAFT:
      // Not assigned - still with owner
      return { holderUnit: null, holderUser: null };

    case ProjectState.FACULTY_REVIEW:
      // Assigned to faculty for review
      return {
        holderUnit: proposal.facultyId,
        holderUser: null, // Anyone with QUAN_LY_KHOA role can act
      };

    case ProjectState.SCHOOL_SELECTION_REVIEW:
      // PKHCN assigns council
      return {
        holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN,
        holderUser: null,
      };

    case ProjectState.OUTLINE_COUNCIL_REVIEW:
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
    case ProjectState.FACULTY_ACCEPTANCE_REVIEW:
      // Faculty reviews acceptance
      return {
        holderUnit: proposal.facultyId,
        holderUser: null, // Anyone with QUAN_LY_KHOA role
      };

    case ProjectState.SCHOOL_ACCEPTANCE_REVIEW:
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
export function canUserActOnProposal(
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
    return ownerId === userId; // Will be checked elsewhere
  }

  // Specific user assignment
  if (holderUser) {
    return holderUser === userId;
  }

  // Faculty/unit assignment
  if (holderUnit) {
    // PHONG_KHCN is a special unit code
    if (holderUnit === 'PHONG_KHCN') {
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
export function getHolderDisplayName(
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
