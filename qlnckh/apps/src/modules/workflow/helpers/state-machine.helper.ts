import { ProjectState, WorkflowAction, Proposal } from '@prisma/client';

/**
 * Invalid Transition Error
 * Thrown when an invalid state transition is attempted
 */
export class InvalidTransitionError extends Error {
  constructor(
    public fromState: ProjectState,
    public toState: ProjectState,
    public action: WorkflowAction,
    message?: string,
  ) {
    super(
      message ||
        `Invalid transition: ${fromState} → ${toState} (action: ${action})`,
    );
    this.name = 'InvalidTransitionError';
  }
}

/**
 * State Transition Definition
 * Defines valid transitions between states with associated actions
 */
export interface StateTransition {
  fromState: ProjectState;
  toState: ProjectState;
  action: WorkflowAction;
  allowedRoles?: string[]; // Optional role restriction
}

/**
 * Valid State Transitions
 * Based on Epic 3 requirements and architecture decisions
 *
 * CRITICAL: SUBMITTED is an EVENT, not a STATE
 * - DRAFT → FACULTY_REVIEW (direct, no SUBMITTED state)
 * - workflow_logs.action = SUBMIT records the event
 */
export const VALID_TRANSITIONS: StateTransition[] = [
  // Phase A: Proposal Submission & Council Reviews
  // DRAFT → Faculty Council Outline Review
  {
    fromState: ProjectState.DRAFT,
    toState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    action: WorkflowAction.SUBMIT,
    allowedRoles: ['GIANG_VIEN'],
  },

  // Faculty Council Outline Review Outcomes
  {
    fromState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    action: WorkflowAction.APPROVE,
    allowedRoles: ['QUAN_LY_KHOA', 'GIANG_VIEN'], // Council chair and members
  },
  {
    fromState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.CHANGES_REQUESTED,
    action: WorkflowAction.RETURN,
    allowedRoles: ['QUAN_LY_KHOA', 'GIANG_VIEN'], // Council chair and members
  },

  // School Council Outline Review Outcomes
  {
    fromState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.APPROVED,
    action: WorkflowAction.APPROVE,
    allowedRoles: ['BAN_GIAM_HOC', 'GIANG_VIEN', 'QUAN_LY_KHOA'], // Council chair and members
  },
  {
    fromState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.CHANGES_REQUESTED,
    action: WorkflowAction.RETURN,
    allowedRoles: ['BAN_GIAM_HOC', 'GIANG_VIEN', 'QUAN_LY_KHOA'], // Council chair and members
  },
  {
    fromState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.REJECTED,
    action: WorkflowAction.REJECT,
    allowedRoles: ['BAN_GIAM_HOC'], // Only council chair can reject
  },

  // Changes Requested → Resubmit
  {
    fromState: ProjectState.CHANGES_REQUESTED,
    toState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    action: WorkflowAction.RESUBMIT,
    allowedRoles: ['GIANG_VIEN'],
  },
  {
    fromState: ProjectState.CHANGES_REQUESTED,
    toState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    action: WorkflowAction.RESUBMIT,
    allowedRoles: ['GIANG_VIEN'],
  },

  // Approved → In Progress
  {
    fromState: ProjectState.APPROVED,
    toState: ProjectState.IN_PROGRESS,
    action: WorkflowAction.START_PROJECT,
    allowedRoles: ['GIANG_VIEN', 'PHONG_KHCN'],
  },

  // In Progress → Faculty Council Acceptance Review
  {
    fromState: ProjectState.IN_PROGRESS,
    toState: ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    action: WorkflowAction.SUBMIT_ACCEPTANCE,
    allowedRoles: ['GIANG_VIEN'],
  },

  // Faculty Council Acceptance Review Outcomes
  {
    fromState: ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    toState: ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
    action: WorkflowAction.FACULTY_ACCEPT,
    allowedRoles: ['QUAN_LY_KHOA', 'GIANG_VIEN'], // Council chair and members
  },
  {
    fromState: ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    toState: ProjectState.CHANGES_REQUESTED,
    action: WorkflowAction.RETURN,
    allowedRoles: ['QUAN_LY_KHOA', 'GIANG_VIEN'], // Council chair and members
  },

  // School Council Acceptance Review Outcomes
  {
    fromState: ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
    toState: ProjectState.HANDOVER,
    action: WorkflowAction.ACCEPT,
    allowedRoles: ['BAN_GIAM_HOC', 'GIANG_VIEN', 'QUAN_LY_KHOA'], // Council chair and members
  },
  {
    fromState: ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
    toState: ProjectState.CHANGES_REQUESTED,
    action: WorkflowAction.RETURN,
    allowedRoles: ['BAN_GIAM_HOC', 'GIANG_VIEN', 'QUAN_LY_KHOA'], // Council chair and members
  },

  // Handover → Completed
  {
    fromState: ProjectState.HANDOVER,
    toState: ProjectState.COMPLETED,
    action: WorkflowAction.FINALIZE,
    allowedRoles: ['PHONG_KHCN', 'GIANG_VIEN'],
  },
  // Story 6.5: Complete handover (alternative action)
  {
    fromState: ProjectState.HANDOVER,
    toState: ProjectState.COMPLETED,
    action: WorkflowAction.HANDOVER_COMPLETE,
    allowedRoles: ['GIANG_VIEN', 'PHONG_KHCN'],
  },

  // Exception States - Epic 9: Cancel/Withdraw/Reject/Pause/Resume

  // Cancel: DRAFT → CANCELLED (Story 9.1)
  {
    fromState: ProjectState.DRAFT,
    toState: ProjectState.CANCELLED,
    action: WorkflowAction.CANCEL,
    allowedRoles: ['GIANG_VIEN'],
  },
  // Cancel: PAUSED → CANCELLED (Story 9.1 - owner can cancel paused proposals)
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.CANCELLED,
    action: WorkflowAction.CANCEL,
    allowedRoles: ['GIANG_VIEN'],
  },

  // Withdraw: Review states → WITHDRAWN (Story 9.1)
  {
    fromState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.WITHDRAWN,
    action: WorkflowAction.WITHDRAW,
    allowedRoles: ['GIANG_VIEN'],
  },
  {
    fromState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.WITHDRAWN,
    action: WorkflowAction.WITHDRAW,
    allowedRoles: ['GIANG_VIEN'],
  },
  {
    fromState: ProjectState.CHANGES_REQUESTED,
    toState: ProjectState.WITHDRAWN,
    action: WorkflowAction.WITHDRAW,
    allowedRoles: ['GIANG_VIEN'],
  },

  // Reject: Review states → REJECTED (Story 9.2)
  {
    fromState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.REJECTED,
    action: WorkflowAction.REJECT,
    allowedRoles: ['QUAN_LY_KHOA', 'BAN_GIAM_HOC'],
  },
  {
    fromState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.REJECTED,
    action: WorkflowAction.REJECT,
    allowedRoles: ['BAN_GIAM_HOC'],
  },
  {
    fromState: ProjectState.CHANGES_REQUESTED,
    toState: ProjectState.REJECTED,
    action: WorkflowAction.REJECT,
    allowedRoles: ['QUAN_LY_KHOA', 'BAN_GIAM_HOC'],
  },

  // Pause: Non-terminal states → PAUSED (Story 9.3, PHONG_KHCN only)
  {
    fromState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.CHANGES_REQUESTED,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.APPROVED,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.IN_PROGRESS,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.HANDOVER,
    toState: ProjectState.PAUSED,
    action: WorkflowAction.PAUSE,
    allowedRoles: ['PHONG_KHCN'],
  },

  // Resume: PAUSED → pre-pause state (Story 9.3)
  // Note: Resume is special - the target state depends on prePauseState
  // The service layer handles this dynamically
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.CHANGES_REQUESTED,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.APPROVED,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.IN_PROGRESS,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
  {
    fromState: ProjectState.PAUSED,
    toState: ProjectState.HANDOVER,
    action: WorkflowAction.RESUME,
    allowedRoles: ['PHONG_KHCN'],
  },
];

/**
 * State Phase Groups
 * Groups states by lifecycle phase for easier querying
 */
export const STATE_PHASES = {
  PHASE_A_PROPOSAL: [
    ProjectState.DRAFT,
    ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
  ],
  PHASE_B_CHANGES_APPROVAL: [
    ProjectState.CHANGES_REQUESTED,
    ProjectState.APPROVED,
    ProjectState.IN_PROGRESS,
  ],
  PHASE_C_ACCEPTANCE_HANDOVER: [
    ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
    ProjectState.HANDOVER,
    ProjectState.COMPLETED,
  ],
  EXCEPTION_STATES: [
    ProjectState.PAUSED,
    ProjectState.CANCELLED,
    ProjectState.REJECTED,
    ProjectState.WITHDRAWN,
  ],
} as const;

/**
 * Terminal States
 * States from which no further transitions are possible
 */
export const TERMINAL_STATES = [
  ProjectState.COMPLETED,
  ProjectState.CANCELLED,
  ProjectState.REJECTED,
  ProjectState.WITHDRAWN,
] as const;

/**
 * Check if a transition is valid
 *
 * @param fromState - Current state
 * @param toState - Target state
 * @param action - Workflow action being performed
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(
  fromState: ProjectState,
  toState: ProjectState,
  action: WorkflowAction,
): boolean {
  return VALID_TRANSITIONS.some(
    (t) =>
      t.fromState === fromState &&
      t.toState === toState &&
      t.action === action,
  );
}

/**
 * Get valid next states for a given current state and action
 *
 * @param fromState - Current state
 * @param action - Workflow action being performed
 * @returns Array of valid target states
 */
export function getValidNextStates(
  fromState: ProjectState,
  action: WorkflowAction,
): ProjectState[] {
  return VALID_TRANSITIONS.filter(
    (t) => t.fromState === fromState && t.action === action,
  ).map((t) => t.toState);
}

/**
 * Check if a state is a terminal state
 *
 * @param state - State to check
 * @returns true if state is terminal
 */
export function isTerminalState(state: ProjectState): boolean {
  return TERMINAL_STATES.includes(state as any);
}

/**
 * Check if SUBMITTED is being used as a state (forbidden)
 * This function helps enforce the UX-1 rule: SUBMITTED is EVENT, not STATE
 *
 * @param state - State value to check
 * @returns true if the value is 'SUBMITTED' (which is invalid)
 */
export function isSubmittedAsState(state: string): boolean {
  return state === 'SUBMITTED';
}

/**
 * Get allowed roles for a transition
 *
 * @param fromState - Current state
 * @param toState - Target state
 * @param action - Workflow action
 * @returns Array of allowed role names, or undefined if any role can perform
 */
export function getAllowedRolesForTransition(
  fromState: ProjectState,
  toState: ProjectState,
  action: WorkflowAction,
): string[] | undefined {
  const transition = VALID_TRANSITIONS.find(
    (t) =>
      t.fromState === fromState &&
      t.toState === toState &&
      t.action === action,
  );

  return transition?.allowedRoles;
}
