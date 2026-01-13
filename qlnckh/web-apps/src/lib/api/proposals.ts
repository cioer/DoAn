import { apiClient } from '../auth/auth';

/**
 * Proposal types matching backend DTOs
 */
export interface Proposal {
  id: string;
  code: string;
  title: string;
  state: string;
  ownerId: string;
  facultyId: string;
  holderUnit: string | null;
  holderUser: string | null;
  slaStartDate: Date | null;
  slaDeadline: Date | null;
  actualStartDate: Date | null;
  completedDate: Date | null;
  templateId: string | null;
  templateVersion: string | null;
  formData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  template?: {
    id: string;
    code: string;
    name: string;
    version: string;
  } | null;
  owner?: {
    id: string;
    email: string;
    displayName: string;
    role?: string;
  };
  faculty?: {
    id: string;
    code: string;
    name: string;
  };
  holderUserInfo?: {
    id: string;
    displayName: string;
    email: string;
    role: string;
  } | null;
}

export interface CreateProposalRequest {
  title: string;
  facultyId: string;
  templateId: string;
  formData?: Record<string, unknown>;
}

export interface UpdateProposalRequest {
  title?: string;
  formData?: Record<string, unknown>;
}

export interface AutoSaveProposalRequest {
  formData: Record<string, unknown>;
  expectedUpdatedAt?: Date;
}

export interface ProposalListParams {
  ownerId?: string;
  state?: string;
  facultyId?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface ProposalListResponse {
  data: Proposal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// Epic 6: Acceptance & Handover Types
// ============================================================================

/**
 * Product type for faculty acceptance
 */
export enum ProductType {
  BAI_BAO = 'BAI_BAO',
  SACH = 'SACH',
  PHAN_MEM = 'PHAN_MEM',
  SAN_PHAM = 'SAN_PHAM',
  KHAC = 'KHAC',
}

/**
 * Faculty acceptance product
 */
export interface FacultyAcceptanceProduct {
  name: string;
  type: ProductType;
  note?: string;
  attachmentId?: string;
}

/**
 * Submit faculty acceptance request
 */
export interface SubmitFacultyAcceptanceRequest {
  results: string;
  products: FacultyAcceptanceProduct[];
  attachmentIds?: string[];
}

/**
 * Faculty decision
 */
export enum FacultyDecision {
  DAT = 'DAT',
  KHONG_DAT = 'KHONG_DAT',
}

/**
 * Faculty acceptance decision request
 */
export interface FacultyAcceptanceDecisionRequest {
  decision: FacultyDecision;
  comments?: string;
}

/**
 * School decision
 */
export enum SchoolDecision {
  DAT = 'DAT',
  KHONG_DAT = 'KHONG_DAT',
}

/**
 * School acceptance decision request
 */
export interface SchoolAcceptanceDecisionRequest {
  decision: SchoolDecision;
  comments?: string;
}

/**
 * Handover checklist item
 */
export interface HandoverChecklistItem {
  id: string;
  checked: boolean;
  note?: string;
}

/**
 * Complete handover request
 */
export interface CompleteHandoverRequest {
  checklist: HandoverChecklistItem[];
}

/**
 * Dossier pack type
 */
export enum DossierPackType {
  FACULTY_ACCEPTANCE = 'FACULTY_ACCEPTANCE',
  SCHOOL_ACCEPTANCE = 'SCHOOL_ACCEPTANCE',
  HANDOVER = 'HANDOVER',
  FINAL = 'FINAL',
}

/**
 * Dossier pack status response
 */
export interface DossierPackStatus {
  ready: boolean;
  state: string;
  message: string;
}

/**
 * Dossier export response
 */
export interface DossierExportResponse {
  zipId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Proposals API Client
 *
 * All proposal-related API calls
 */
export const proposalsApi = {
  /**
   * Get paginated list of proposals with optional filters
   */
  getProposals: async (params: ProposalListParams = {}): Promise<ProposalListResponse> => {
    const { page = 1, limit = 20, ownerId, state, facultyId, overdue } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));
    if (ownerId) queryParams.append('ownerId', ownerId);
    if (state) queryParams.append('state', state);
    if (facultyId) queryParams.append('facultyId', facultyId);
    if (overdue) queryParams.append('overdue', 'true');

    const response = await apiClient.get<{ success: true; data: Proposal[]; meta: any }>(
      `/proposals?${queryParams.toString()}`,
    );

    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  /**
   * Get proposal by ID
   */
  getProposalById: async (id: string): Promise<Proposal> => {
    const response = await apiClient.get<Proposal>(`/proposals/${id}`);
    return response.data; // Backend returns proposal directly, not wrapped
  },

  /**
   * Create a new proposal (DRAFT state)
   * Note: Backend returns proposal directly, not wrapped in { success: true, data: ... }
   */
  createProposal: async (data: CreateProposalRequest): Promise<Proposal> => {
    const response = await apiClient.post<Proposal>(
      '/proposals',
      data,
    );
    return response.data;
  },

  /**
   * Update proposal (DRAFT only)
   * Note: Backend returns proposal directly
   */
  updateProposal: async (id: string, data: UpdateProposalRequest): Promise<Proposal> => {
    const response = await apiClient.put<Proposal>(
      `/proposals/${id}`,
      data,
    );
    return response.data;
  },

  /**
   * Auto-save proposal form data (Story 2.3)
   * Deep merges partial form data with existing data
   * Note: Backend returns proposal directly
   */
  autoSave: async (id: string, data: AutoSaveProposalRequest): Promise<Proposal> => {
    const response = await apiClient.patch<Proposal>(
      `/proposals/${id}/auto-save`,
      data,
    );
    return response.data;
  },

  /**
   * Delete proposal (DRAFT only)
   */
  deleteProposal: async (id: string): Promise<void> => {
    await apiClient.delete(`/proposals/${id}`);
  },

  // ========================================================================
  // Epic 6: Acceptance & Handover API Calls
  // ========================================================================

  /**
   * Story 6.1: Start project execution (APPROVED → IN_PROGRESS)
   */
  startProject: async (id: string): Promise<Proposal> => {
    const response = await apiClient.post<Proposal>(
      `/proposals/${id}/start`,
    );
    return response.data;
  },

  /**
   * Story 6.2: Submit faculty acceptance review (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
   */
  submitFacultyAcceptance: async (id: string, data: SubmitFacultyAcceptanceRequest): Promise<Proposal> => {
    const response = await apiClient.post<Proposal>(
      `/proposals/${id}/faculty-acceptance`,
      data,
    );
    return response.data;
  },

  /**
   * Story 6.3: Get faculty acceptance data for review
   */
  getFacultyAcceptanceData: async (id: string): Promise<{
    results?: string;
    products?: Array<{ id: string; name: string; type: string; note?: string }>;
    submittedAt?: string;
  }> => {
    const response = await apiClient.get<{
      results?: string;
      products?: Array<{ id: string; name: string; type: string; note?: string }>;
      submittedAt?: string;
    }>(`/proposals/${id}/faculty-acceptance-data`);
    return response.data;
  },

  /**
   * Story 6.3: Submit faculty acceptance decision
   */
  submitFacultyDecision: async (id: string, data: FacultyAcceptanceDecisionRequest): Promise<Proposal> => {
    const response = await apiClient.post<Proposal>(
      `/proposals/${id}/faculty-acceptance-decision`,
      data,
    );
    return response.data;
  },

  /**
   * Story 6.4: Get school acceptance data for review
   */
  getSchoolAcceptanceData: async (id: string): Promise<{
    facultyDecision?: { decision: string; decidedAt: string; comments?: string };
    results?: string;
    products?: Array<{ id: string; name: string; type: string; note?: string }>;
  }> => {
    const response = await apiClient.get<{
      facultyDecision?: { decision: string; decidedAt: string; comments?: string };
      results?: string;
      products?: Array<{ id: string; name: string; type: string; note?: string }>;
    }>(`/proposals/${id}/school-acceptance-data`);
    return response.data;
  },

  /**
   * Story 6.4: Submit school acceptance decision
   */
  submitSchoolDecision: async (id: string, data: SchoolAcceptanceDecisionRequest): Promise<Proposal> => {
    const response = await apiClient.post<Proposal>(
      `/proposals/${id}/school-acceptance-decision`,
      data,
    );
    return response.data;
  },

  /**
   * Story 6.5: Save handover checklist draft
   */
  saveHandoverChecklist: async (id: string, checklist: HandoverChecklistItem[]): Promise<Proposal> => {
    const response = await apiClient.patch<Proposal>(
      `/proposals/${id}/handover-checklist`,
      { checklist },
    );
    return response.data;
  },

  /**
   * Story 6.5: Complete handover (HANDOVER → COMPLETED)
   */
  completeHandover: async (id: string, checklist: HandoverChecklistItem[]): Promise<Proposal> => {
    const response = await apiClient.post<Proposal>(
      `/proposals/${id}/complete-handover`,
      { checklist },
    );
    return response.data;
  },

  /**
   * Story 6.6: Get dossier pack status
   */
  getDossierPackStatus: async (id: string, packType: DossierPackType): Promise<DossierPackStatus> => {
    const response = await apiClient.get<DossierPackStatus>(
      `/proposals/${id}/dossier-status/${packType}`,
    );
    return response.data;
  },

  /**
   * Story 6.6: Generate dossier pack ZIP
   */
  generateDossierPack: async (id: string, packType: DossierPackType): Promise<DossierExportResponse> => {
    const response = await apiClient.post<DossierExportResponse>(
      `/proposals/${id}/dossier/${packType}`,
    );
    return response.data;
  },
};
