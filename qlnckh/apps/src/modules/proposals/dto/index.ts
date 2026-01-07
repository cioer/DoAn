export {
  ProposalDto,
  ProposalWithTemplateDto,
  CreateProposalDto,
  UpdateProposalDto,
  AutoSaveProposalDto,
  ProposalQueryDto,
  PaginationMeta,
  PaginatedProposalsDto,
} from './proposal.dto';

// Story 2.6: Form data types and helper functions
export {
  ProposalFormData,
  SectionIdType,
  SectionDataType,
  InfoGeneralSection,
  ContentMethodSection,
  ResearchMethodSection,
  ExpectedResultsSection,
  BudgetSection,
  BudgetItem,
  AttachmentsSection,
  ResearchersSection,
  Researcher,
  FacilitiesSection,
  TimelineSection,
  Milestone,
  ReferencesSection,
  Reference,
  FacultyAcceptanceResultsSection,
  FacultyAcceptanceProductsSection,
  SchoolAcceptanceResultsSection,
  SchoolAcceptanceProductsSection,
  HandoverChecklistSection,
  ExtensionReasonSection,
  ExtensionDurationSection,
  Product,
} from './proposal-form-data.dto';

// Epic 6: Acceptance & Handover DTOs
export { StartProjectDto, StartProjectResponseDto } from './start-proposal.dto';
export {
  SubmitFacultyAcceptanceDto,
} from './submit-faculty-acceptance.dto';
export {
  FacultyAcceptanceProductDto,
  ProductType,
} from './faculty-acceptance-product.dto';
export {
  FacultyAcceptanceDecisionDto,
  FacultyDecision,
} from './faculty-acceptance-decision.dto';
export {
  SchoolAcceptanceDecisionDto,
  SchoolDecision,
} from './school-acceptance-decision.dto';
export {
  CompleteHandoverDto,
  SaveHandoverChecklistDto,
} from './complete-handover.dto';
export {
  HandoverChecklistItemDto,
  HANDOVER_CHECKLIST_ITEMS,
  HandoverChecklistItemId,
} from './handover-checklist.dto';
