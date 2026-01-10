import { apiClient } from '../auth/auth';

/**
 * Form Template types matching backend DTOs
 * Updated to match backend response format
 */
export interface FormSection {
  id: string;
  templateId: string;
  sectionId: string;          // Canonical ID (e.g., SEC_INFO_GENERAL)
  label: string;              // Display label (e.g., "Thông tin chung")
  component: string;          // React component name
  displayOrder: number;       // Order in form
  isRequired: boolean;        // Is section required
  config: unknown | null;     // Additional config
  createdAt: string;
  updatedAt: string;
}

export interface FormTemplate {
  id: string;
  code: string;               // e.g., MAU_01B
  name: string;               // e.g., "Đề tài Nghiên cứu Khoa học cấp trường"
  description?: string;
  version: string;
  isActive: boolean;
  projectType?: string;       // CAP_TRUONG | CAP_KHOA
  sections: FormSection[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Import result types
 */
export interface ImportedTemplate {
  code: string;
  name: string;
  sectionsCount: number;
}

export interface ImportError {
  templateCode: string;
  message: string;
}

export interface FormTemplateImportResult {
  success: boolean;
  templates: ImportedTemplate[];
  errors: ImportError[];
  total: number;
  imported: number;
  failed: number;
}

/**
 * Form Templates API Client
 */
export const formTemplatesApi = {
  /**
   * Get all active form templates
   */
  getTemplates: async (): Promise<FormTemplate[]> => {
    const response = await apiClient.get<{ success: true; data: FormTemplate[] }>(
      '/form-templates',
    );
    return response.data.data;
  },

  /**
   * Get form template by ID
   */
  getTemplateById: async (id: string): Promise<FormTemplate> => {
    const response = await apiClient.get<{ success: true; data: FormTemplate }>(
      `/form-templates/${id}`,
    );
    return response.data.data;
  },

  /**
   * Import form templates from Word document (ADMIN only)
   */
  importFromWord: async (file: File): Promise<{
    success: boolean;
    message: string;
    data: FormTemplateImportResult;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: FormTemplateImportResult;
    }>('/form-templates/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
