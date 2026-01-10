import { apiClient } from '../auth/auth';

/**
 * Export types matching backend DTOs
 */
export interface ExportFilters {
  state?: string;
  facultyId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ExportExcelRequest {
  filters?: ExportFilters;
}

/**
 * Exports API Client
 *
 * All export-related API calls
 * Story 8.3: Export Excel per Filter
 * Story 10.2: Export Excel Full Dump
 */
export const exportsApi = {
  /**
   * POST /api/exports/excel
   * Export proposals to Excel with optional filters
   */
  exportExcel: async (data: ExportExcelRequest = {}): Promise<Blob> => {
    const response = await apiClient.post<Blob>('/exports/excel', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Helper to download the exported file
   */
  downloadExport: async (data: ExportExcelRequest = {}, filename?: string): Promise<void> => {
    const blob = await exportsApi.exportExcel(data);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `danh-sach-de-tai-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
