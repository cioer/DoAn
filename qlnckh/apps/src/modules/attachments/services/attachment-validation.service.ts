import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Attachment Validation Service
 *
 * Handles file validation logic for attachments.
 * Extracted from attachments.service.ts for separation of concerns.
 *
 * Phase 1 Refactor: Extract validation logic
 */
@Injectable()
export class AttachmentValidationService {
  /**
   * Allowed MIME types for attachments
   */
  private readonly ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
  ]);

  /**
   * Allowed file extensions (fallback for MIME type detection)
   */
  private readonly ALLOWED_EXTENSIONS = new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.jpg',
    '.jpeg',
    '.png',
  ]);

  /**
   * Default configuration values
   */
  readonly DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly DEFAULT_MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Validate file size
   *
   * @param fileSize - File size in bytes
   * @param maxSize - Maximum allowed size (default: 5MB)
   * @returns Error message if invalid, null if valid
   */
  validateFileSize(fileSize: number, maxSize = this.DEFAULT_MAX_FILE_SIZE): string | null {
    if (fileSize > maxSize) {
      return 'File quá 5MB. Vui lòng nén hoặc chia nhỏ.';
    }
    return null;
  }

  /**
   * Validate total size for proposal
   *
   * @param currentTotal - Current total size
   * @param newFileSize - New file size
   * @param maxTotalSize - Maximum total size (default: 50MB)
   * @returns Error message if invalid, null if valid
   */
  validateTotalSize(
    currentTotal: number,
    newFileSize: number,
    maxTotalSize = this.DEFAULT_MAX_TOTAL_SIZE,
  ): string | null {
    if (currentTotal + newFileSize > maxTotalSize) {
      return 'Tổng dung lượng đã vượt giới hạn (50MB/proposal).';
    }
    return null;
  }

  /**
   * Validate MIME type
   *
   * @param mimetype - File MIME type
   * @returns True if valid
   */
  isValidMimeType(mimetype: string): boolean {
    return this.ALLOWED_MIME_TYPES.has(mimetype);
  }

  /**
   * Validate file extension
   *
   * @param filename - Original filename
   * @returns True if valid
   */
  isValidExtension(filename: string): boolean {
    const ext = this.getFileExtension(filename);
    return this.ALLOWED_EXTENSIONS.has(ext);
  }

  /**
   * Validate file type (MIME or extension fallback)
   *
   * @param mimetype - File MIME type
   * @param filename - Original filename
   * @returns Error message if invalid, null if valid
   */
  validateFileType(mimetype: string, filename: string): string | null {
    // Check MIME type first
    if (this.isValidMimeType(mimetype)) {
      return null;
    }

    // Fallback: check extension if MIME type is not recognized
    if (this.isValidExtension(filename)) {
      return null;
    }

    return 'Định dạng file không được hỗ trợ.';
  }

  /**
   * Get file extension from filename
   *
   * @param filename - Original filename
   * @returns File extension with dot (e.g., ".pdf")
   */
  getFileExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    return ext ? `.${ext}` : '';
  }

  /**
   * Remove file extension from filename
   *
   * @param filename - Original filename
   * @returns Filename without extension
   */
  removeFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  }

  /**
   * Generate unique filename (UUID + original name)
   *
   * @param originalName - Original filename
   * @returns Unique filename
   */
  generateUniqueFilename(originalName: string): string {
    const fileExtension = this.getFileExtension(originalName);
    const baseFileName = this.removeFileExtension(originalName);
    return `${randomUUID()}-${baseFileName}${fileExtension}`;
  }
}
