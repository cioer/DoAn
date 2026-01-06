import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export enum ProjectType {
  CAP_TRUONG = 'CAP_TRUONG',
  CAP_KHOA = 'CAP_KHOA',
}

export class FormTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template code (e.g., MAU_01B)' })
  code: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Template version' })
  version: string;

  @ApiProperty({ description: 'Template description', required: false })
  description: string | null;

  @ApiProperty({ description: 'Is template active' })
  isActive: boolean;

  @ApiProperty({ description: 'Project type', enum: ProjectType })
  projectType: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class FormTemplateWithSectionsDto extends FormTemplateDto {
  @ApiProperty({ description: 'Form sections', type: [Object] })
  sections: FormSectionDto[];
}

export class CreateFormTemplateDto {
  @ApiProperty({ description: 'Template code (e.g., MAU_01B)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template version', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Is template active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Project type', enum: ProjectType, required: false })
  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: string;

  @ApiProperty({ description: 'Form sections', type: [Object], required: false })
  @IsOptional()
  sections?: CreateFormSectionDto[];
}

export class UpdateFormTemplateDto {
  @ApiProperty({ description: 'Template name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Is template active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Re-export form section DTOs
export { FormSectionDto, CreateFormSectionDto } from './form-section.dto';
