/**
 * Workflow Components Barrel Export
 *
 * Exports all workflow-related components for easy importing.
 * Story 5.1: Added SchoolSelectionActions export
 * Story 5.2: Added CouncilAssignmentDialog export
 */

export { SchoolSelectionActions } from './SchoolSelectionActions';
export type { SchoolSelectionActionsProps, UserInfo } from './SchoolSelectionActions';

export { CouncilAssignmentDialog } from './CouncilAssignmentDialog';
export type { CouncilAssignmentDialogProps, Council, CouncilMember } from './CouncilAssignmentDialog';

export { ProposalActions } from './ProposalActions';
export type { ProposalActionsProps } from './ProposalActions';

export { SLABadge } from './SLABadge';
export type { SLABadgeProps } from './SLABadge';

export { ChangesRequestedBanner } from './ChangesRequestedBanner';
export type { ChangesRequestedBannerProps } from './ChangesRequestedBanner';

// Temporarily disabled due to Vite compilation issues
// export { RevisionPanel } from './RevisionPanel';
// export type { RevisionPanelProps } from './RevisionPanel';

// BAN_GIAM_HOC High-Level Decision Actions
export { CouncilReviewApprovalActions } from './CouncilReviewApprovalActions';
export type { CouncilReviewApprovalActionsProps } from './CouncilReviewApprovalActions';

export { SchoolAcceptanceActions } from './SchoolAcceptanceActions';
export type { SchoolAcceptanceActionsProps } from './SchoolAcceptanceActions';
