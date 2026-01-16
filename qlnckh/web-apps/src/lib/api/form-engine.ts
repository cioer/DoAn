/**
 * Form Engine API Client
 *
 * Integrates with FormEngine microservice for advanced document generation.
 * Supports all 18 form templates (1b-18b) with:
 * - Smart variable replacement
 * - PDF conversion via LibreOffice
 * - Dynamic table generation
 */

import { apiClient } from '../auth/auth';
import type {
  GenerateFormRequest,
  FormGenerationResult,
  FormEngineTemplate,
  FormEngineHealth,
  FormTemplateType,
} from '../../shared/types/form-engine';

/**
 * Mapping from frontend FormTemplateType to backend FormType (Prisma enum)
 */
const TEMPLATE_TO_FORM_TYPE: Record<FormTemplateType, string> = {
  PROPOSAL_OUTLINE: 'FORM_1B',
  EVALUATION_FORM: 'FORM_2B',
  FACULTY_MEETING_MINUTES: 'FORM_3B',
  SUMMARY_CATALOG: 'FORM_4B',
  SCHOOL_EVALUATION: 'FORM_5B',
  COUNCIL_MEETING_MINUTES: 'FORM_6B',
  REVISION_REQUEST: 'FORM_7B',
  FACULTY_ACCEPTANCE_EVAL: 'FORM_8B',
  FACULTY_ACCEPTANCE_MINUTES: 'FORM_9B',
  FINAL_REPORT: 'FORM_10B',
  FACULTY_ACCEPTANCE_DECISION: 'FORM_11B',
  SCHOOL_ACCEPTANCE_EVAL: 'FORM_12B',
  SCHOOL_ACCEPTANCE_MINUTES: 'FORM_13B',
  SCHOOL_ACCEPTANCE_DECISION: 'FORM_14B',
  PRODUCT_LIST: 'FORM_15B',
  PRODUCT_APPENDIX: 'FORM_16B',
  HANDOVER_CHECKLIST: 'FORM_17B',
  EXTENSION_REQUEST: 'FORM_18B',
};

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Form Engine API
 *
 * Endpoints match with ProposalDocumentsController:
 * - POST /proposal-documents/generate
 * - GET /proposal-documents/form-types
 * - GET /proposal-documents/:id/download
 * - GET /proposal-documents/:id/download-pdf
 * - GET /proposal-documents/health
 */
export const formEngineApi = {
  /**
   * Generate document using FormEngine
   *
   * @param proposalId - Proposal ID
   * @param request - Generation options
   * @returns Generated document info
   */
  generateForm: async (
    proposalId: string,
    request: GenerateFormRequest
  ): Promise<FormGenerationResult> => {
    // Convert frontend templateType to backend formType
    const formType = TEMPLATE_TO_FORM_TYPE[request.templateType];

    // Build additionalData from request options
    const additionalData: Record<string, unknown> = {
      ...request.additionalData,
      ...(request.isPass !== undefined && { isPass: request.isPass }),
      ...(request.isApproved !== undefined && { isApproved: request.isApproved }),
      ...(request.evaluatorName && { evaluatorName: request.evaluatorName }),
      ...(request.soPhieuDongY !== undefined && { soPhieuDongY: request.soPhieuDongY }),
      ...(request.soPhieuPhanDoi !== undefined && { soPhieuPhanDoi: request.soPhieuPhanDoi }),
      ...(request.noiDungChinhSua && { noiDungChinhSua: request.noiDungChinhSua }),
      ...(request.noiDungBoSung && { noiDungBoSung: request.noiDungBoSung }),
      ...(request.noiDungKhongPhuHop && { noiDungKhongPhuHop: request.noiDungKhongPhuHop }),
      ...(request.revisionContent && { revisionContent: request.revisionContent }),
      ...(request.chuNhiem && { chuNhiem: request.chuNhiem }),
      ...(request.hoiDong && { hoiDong: request.hoiDong }),
    };

    const response = await apiClient.post<ApiResponse<FormGenerationResult>>(
      '/proposal-documents/generate',
      {
        proposalId,
        formType,
        additionalData: Object.keys(additionalData).length > 0 ? additionalData : undefined,
        regenerate: request.generatePdf, // Use generatePdf as regenerate flag if needed
      }
    );
    return response.data.data;
  },

  /**
   * Get available form templates
   *
   * @returns List of available templates
   */
  getTemplates: async (): Promise<FormEngineTemplate[]> => {
    const response = await apiClient.get<ApiResponse<FormEngineTemplate[]>>(
      '/proposal-documents/form-types'
    );
    return response.data.data;
  },

  /**
   * Check FormEngine health status
   *
   * @returns Health status
   */
  getHealth: async (): Promise<FormEngineHealth> => {
    const response = await apiClient.get<ApiResponse<FormEngineHealth>>(
      '/proposal-documents/health'
    );
    return response.data.data;
  },

  /**
   * Download generated DOCX file
   *
   * @param documentId - Document ID
   * @returns Blob for download
   */
  downloadDocx: async (documentId: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/proposal-documents/${documentId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Download generated PDF file
   *
   * @param documentId - Document ID
   * @returns Blob for download
   */
  downloadPdf: async (documentId: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/proposal-documents/${documentId}/download-pdf`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Get download URL for DOCX
   *
   * @param documentId - Document ID
   * @returns Download URL
   */
  getDocxUrl: (documentId: string): string => {
    return `/api/proposal-documents/${documentId}/download`;
  },

  /**
   * Get download URL for PDF
   *
   * @param documentId - Document ID
   * @returns Download URL
   */
  getPdfUrl: (documentId: string): string => {
    return `/api/proposal-documents/${documentId}/download-pdf`;
  },
};

/**
 * Helper function to trigger file download
 */
export const downloadFile = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export type { GenerateFormRequest, FormGenerationResult, FormEngineTemplate, FormEngineHealth };
