import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { DocumentTemplateType } from '@prisma/client';

/**
 * Upload Document Template DTO
 *
 * Epic 7 Story 7.2: Template Upload & Registry
 */
export class UploadTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentTemplateType, {
    message: 'Loại template không hợp lệ',
  })
  @IsNotEmpty()
  templateType: DocumentTemplateType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
