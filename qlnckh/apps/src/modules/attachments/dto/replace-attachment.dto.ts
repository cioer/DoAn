import { ApiProperty } from '@nestjs/swagger';

/**
 * Multer file interface
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

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
  file!: MulterFile;
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
