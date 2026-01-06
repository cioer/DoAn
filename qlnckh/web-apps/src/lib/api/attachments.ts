import { apiClient } from '../auth/auth';

/**
 * Attachment types matching backend DTOs
 */
export interface Attachment {
  id: string;
  proposalId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  deletedAt: Date | null;
}

/**
 * Upload progress callback type
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Upload options
 */
export interface UploadOptions {
  onProgress?: UploadProgressCallback;
  timeout?: number; // Default: 30000ms (30 seconds)
}

/**
 * Attachments API Client
 *
 * All attachment-related API calls
 */
export const attachmentsApi = {
  /**
   * Get all attachments for a proposal
   */
  getByProposalId: async (proposalId: string): Promise<{
    data: Attachment[];
    total: number;
    totalSize: number;
  }> => {
    const response = await apiClient.get<{
      success: true;
      data: Attachment[];
      meta: { total: number; totalSize: number };
    }>(`/proposals/${proposalId}/attachments`);

    return {
      data: response.data.data,
      total: response.data.meta.total,
      totalSize: response.data.meta.totalSize,
    };
  },

  /**
   * Upload a file to a proposal
   * Uses FormData for multipart upload
   */
  upload: async (
    proposalId: string,
    file: File,
    options: UploadOptions = {},
  ): Promise<Attachment> => {
    const { timeout = 30000 } = options;

    // Client-side validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('FILE_TOO_LARGE: File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
    }

    // Validate file type by extension
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      throw new Error('INVALID_FILE_TYPE: Định dạng file không được hỗ trợ.');
    }

    return new Promise((resolve, reject) => {
      // Create timeout handler
      const timeoutId = setTimeout(() => {
        reject(new Error('TIMEOUT: Upload quá hạn. Vui lòng thử lại.'));
      }, timeout);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && options.onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          options.onProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(`${response.error.code}: ${response.error.message}`));
            }
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            reject(new Error(`${response.error?.code || 'ERROR'}: ${response.error?.message || 'Upload thất bại.'}`));
          } catch {
            reject(new Error(`Upload thất bại. Status: ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('NETWORK_ERROR: Upload thất bại. Vui lòng kiểm tra kết nối.'));
      });

      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Upload bị hủy.'));
      });

      // Open and send request
      const token = localStorage.getItem('access_token');
      xhr.open('POST', `/api/proposals/${proposalId}/attachments`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.send(formData);
    });
  },

  /**
   * Get download URL for an attachment
   */
  getDownloadUrl: (attachment: Attachment): string => {
    return attachment.fileUrl;
  },

  /**
   * Replace an attachment with a new file (Story 2.5)
   * Uses FormData for multipart upload
   */
  replace: async (
    proposalId: string,
    attachmentId: string,
    file: File,
    options: UploadOptions = {},
  ): Promise<Attachment> => {
    const { timeout = 30000 } = options;

    // Client-side validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('FILE_TOO_LARGE: File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
    }

    // Validate file type by extension
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      throw new Error('INVALID_FILE_TYPE: Định dạng file không được hỗ trợ.');
    }

    return new Promise((resolve, reject) => {
      // Create timeout handler
      const timeoutId = setTimeout(() => {
        reject(new Error('TIMEOUT: Upload quá hạn. Vui lòng thử lại.'));
      }, timeout);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && options.onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          options.onProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(`${response.error.code}: ${response.error.message}`));
            }
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            reject(new Error(`${response.error?.code || 'ERROR'}: ${response.error?.message || 'Thay thế thất bại.'}`));
          } catch {
            reject(new Error(`Thay thế thất bại. Status: ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('NETWORK_ERROR: Thay thế thất bại. Vui lòng kiểm tra kết nối.'));
      });

      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Thay thế bị hủy.'));
      });

      // Open and send request
      const token = localStorage.getItem('access_token');
      xhr.open('PUT', `/api/proposals/${proposalId}/attachments/${attachmentId}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.send(formData);
    });
  },

  /**
   * Delete an attachment (Story 2.5)
   */
  delete: async (proposalId: string, attachmentId: string): Promise<{
    id: string;
    deletedAt: Date;
  }> => {
    const response = await apiClient.delete<{
      success: true;
      data: { id: string; deletedAt: Date };
    }>(`/proposals/${proposalId}/attachments/${attachmentId}`);

    return response.data.data;
  },

  /**
   * Format file size for display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },
};
