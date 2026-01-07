import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from '@prisma/client';

/**
 * Generate Document DTO
 *
 * Epic 7 Story 7.3: DOCX Generation
 */
export class GenerateDocDto {
  @IsEnum(DocumentType, {
    message: 'Loại tài liệu không hợp lệ',
  })
  documentType: DocumentType;

  @IsString()
  @IsOptional()
  @IsUUID()
  templateId?: string; // Override active template
}

/**
 * Document Response DTO
 */
export class DocumentResponseDto {
  id: string;
  proposalId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  sha256Hash: string;
  generatedBy: string;
  generatedAt: Date;
  downloadUrl: string;
}

/**
 * Verification Result DTO
 */
export class VerificationResultDto {
  valid: boolean;
  storedHash: string;
  currentHash: string;
  verifiedAt: Date;
  verifiedBy: string;
  documentId: string;
}

export * from './generate-doc.dto';
