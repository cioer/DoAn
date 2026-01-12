import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Attachment Storage Service
 *
 * Handles file system operations for attachments.
 * Extracted from attachments.service.ts for separation of concerns.
 *
 * Phase 2 Refactor: Extract storage operations
 */
@Injectable()
export class AttachmentStorageService {
  private readonly logger = new Logger(AttachmentStorageService.name);

  /**
   * Default upload directory
   * Use local tmp directory for development (writable path)
   */
  readonly DEFAULT_UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/qlnckh-uploads';

  /**
   * Save file buffer to disk with timeout
   *
   * Story 2.4 - AC4: Upload timeout
   *
   * @param filePath - Full file path
   * @param buffer - File buffer
   * @param timeoutMs - Timeout in milliseconds (default: 30000)
   * @throws BadRequestException if timeout or write fails
   */
  async saveFile(
    filePath: string,
    buffer: Buffer,
    timeoutMs: number = 30000,
  ): Promise<void> {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('FILE_WRITE_TIMEOUT'));
        }, timeoutMs);
      });

      // Ensure directory exists
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      await fs.mkdir(dir, { recursive: true });

      // Race between file write and timeout
      await Promise.race([
        fs.writeFile(filePath, buffer),
        timeoutPromise,
      ]);

      this.logger.debug(`Saved file to disk: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save file to disk: ${error.message}`);
      if (error.message === 'FILE_WRITE_TIMEOUT') {
        throw new Error('UPLOAD_TIMEOUT: Upload quá hạn. Vui lòng thử lại.');
      }
      throw new Error('FILE_SAVE_FAILED: Không thể lưu file. Vui lòng thử lại.');
    }
  }

  /**
   * Delete a file from storage
   *
   * @param fileUrl - File URL (e.g., "/uploads/uuid-filename.pdf")
   * @param uploadDir - Upload directory path (default: DEFAULT_UPLOAD_DIR)
   * @throws Error if deletion fails (except ENOENT)
   */
  async deleteFile(
    fileUrl: string,
    uploadDir: string = this.DEFAULT_UPLOAD_DIR,
  ): Promise<void> {
    try {
      // Extract filename from URL
      const filename = fileUrl.split('/').pop();
      if (!filename) {
        throw new Error('Invalid file URL');
      }

      const filePath = join(uploadDir, filename);

      // Check if file exists before deleting
      await fs.access(filePath);

      // Delete file
      await fs.unlink(filePath);

      this.logger.debug(`Deleted file from storage: ${filePath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`File not found for deletion: ${fileUrl}`);
        return; // Not an error if file doesn't exist
      }
      throw error;
    }
  }

  /**
   * Build file path from filename and upload directory
   *
   * @param filename - Filename
   * @param uploadDir - Upload directory (default: DEFAULT_UPLOAD_DIR)
   * @returns Full file path
   */
  buildFilePath(filename: string, uploadDir = this.DEFAULT_UPLOAD_DIR): string {
    return join(uploadDir, filename);
  }

  /**
   * Build file URL from filename
   *
   * @param filename - Filename
   * @returns File URL
   */
  buildFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}
