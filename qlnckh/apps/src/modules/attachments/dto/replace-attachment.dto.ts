import { ApiProperty } from '@nestjs/swagger';

/**
 * Replace Attachment DTO
 * Used for replacing files in proposals (Story 2.5)
 */
export class ReplaceAttachmentDto {
  @ApiProperty({
    description: 'File data (multipart)',
    type: 'string',
    format: 'binary',
  })
  file!: Express.Multer.File;
}

/**
 * Replace Attachment Response DTO
 * Wraps replacement result in success envelope
 */
export interface ReplaceAttachmentResponseDto {
  success: true;
  data: {
    id: string;
    proposalId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    uploadedAt: Date;
  };
}

/**
 * Delete Attachment Response DTO
 * Wraps deletion result in success envelope
 */
export interface DeleteAttachmentResponseDto {
  success: true;
  data: {
    id: string;
    deletedAt: Date;
  };
}
