import { apiClient } from '../auth/auth';

/**
 * Generate UUID v4 for idempotency key
 * Story 10.1: Import Excel - Idempotency for anti-double-submit
 */
export function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Import API Types
 */
export enum ImportEntityType {
  USERS = 'users',
  PROPOSALS = 'proposals',
}

export interface ImportError {
  lineNumber: number;
  row: Record<string, unknown>;
  message: string;
  field?: string;
}

export interface ImportResult {
  entityType: ImportEntityType;
  total: number;
  success: number;
  failed: number;
  errors: ImportError[];
  duration: number;
}

export interface ImportStatus {
  supportedTypes: ImportEntityType[];
  maxFileSize: number;
  allowedFormats: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Import API Client
 *
 * Story 10.1: Import Excel (Users, Proposals)
 * All endpoints require ADMIN role
 */
export const importApi = {
  /**
   * POST /api/admin/import/users
   * Import users from Excel file
   */
  importUsers: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiResponse<ImportResult>>(
      '/admin/import/users',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Idempotency-Key': generateIdempotencyKey(),
        },
      },
    );
    return response.data.data;
  },

  /**
   * POST /api/admin/import/proposals
   * Import proposals from Excel file
   */
  importProposals: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiResponse<ImportResult>>(
      '/admin/import/proposals',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Idempotency-Key': generateIdempotencyKey(),
        },
      },
    );
    return response.data.data;
  },

  /**
   * GET /api/admin/import/status
   * Get import capabilities and status
   */
  getStatus: async (): Promise<ImportStatus> => {
    const response = await apiClient.get<ApiResponse<ImportStatus>>(
      '/admin/import/status',
    );
    return response.data.data;
  },

  /**
   * GET /api/admin/import/template/:entity
   * Download Excel template for import
   */
  downloadTemplate: async (entity: ImportEntityType): Promise<Blob> => {
    const response = await apiClient.get(`/admin/import/template/${entity}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
