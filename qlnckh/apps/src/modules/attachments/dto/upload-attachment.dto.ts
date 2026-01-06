import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * Upload Attachment DTO
 * Used for uploading files to proposals
 */
export class UploadAttachmentDto {
  @ApiProperty({
    description: 'File data (base64 encoded or multipart)',
    type: 'string',
    format: 'binary',
  })
  @IsNotEmpty()
  @IsString()
  file!: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'document.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  fileName?: string;
}

/**
 * Attachment Response DTO
 */
export class AttachmentDto {
  @ApiProperty({
    description: 'Attachment ID',
    example: 'uuid-v4',
  })
  id!: string;

  @ApiProperty({
    description: 'Proposal ID',
    example: 'uuid-v4',
  })
  proposalId!: string;

  @ApiProperty({
    description: 'File name',
    example: 'document.pdf',
  })
  fileName!: string;

  @ApiProperty({
    description: 'File URL',
    example: '/uploads/uuid-document.pdf',
  })
  fileUrl!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1234567,
  })
  fileSize!: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'Uploader user ID',
    example: 'uuid-v4',
  })
  uploadedBy!: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2026-01-06T10:30:00Z',
  })
  uploadedAt!: Date;
}

/**
 * Upload Attachment Response DTO
 * Wraps attachment data in success envelope
 */
export interface UploadAttachmentResponseDto {
  success: true;
  data: AttachmentDto;
  meta?: Record<string, unknown>;
}

/**
 * Attachments List Response DTO
 */
export interface AttachmentsListResponseDto {
  success: true;
  data: AttachmentDto[];
  meta: {
    total: number;
    totalSize: number; // in bytes
  };
}
