import { FormType, FormDocumentStatus, Prisma } from '@prisma/client';

/**
 * Response DTO cho ProposalDocument
 */
export class ProposalDocumentDto {
  id: string;
  proposalId: string;
  formType: FormType;
  status: FormDocumentStatus;
  version: number;

  // File info
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;

  // Form data (JsonValue from Prisma)
  formData?: Prisma.JsonValue | null;

  // Workflow tracking
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
}

/**
 * Response DTO với thông tin form chi tiết
 */
export class ProposalDocumentWithInfoDto extends ProposalDocumentDto {
  formInfo: {
    name: string;
    description: string;
    phase: string;
    templateFile: string;
  };
}

/**
 * Response DTO cho danh sách documents của proposal
 */
export class ProposalDocumentsListDto {
  proposalId: string;
  proposalCode: string;
  currentState: string;
  documents: ProposalDocumentWithInfoDto[];
  requiredForms: FormType[];
  optionalForms: FormType[];
  completedForms: FormType[];
  missingForms: FormType[];
  canTransition: boolean;
}
