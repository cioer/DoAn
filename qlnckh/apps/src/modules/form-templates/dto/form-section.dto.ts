import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsInt, IsObject } from 'class-validator';

export type SectionIdType = string;

export class FormSectionDto {
  @ApiProperty({ description: 'Section ID' })
  id: string;

  @ApiProperty({ description: 'Template ID' })
  templateId: string;

  @ApiProperty({ description: 'Canonical section ID (never changes)' })
  sectionId: string;

  @ApiProperty({ description: 'Vietnamese display label' })
  label: string;

  @ApiProperty({ description: 'React component name' })
  component: string;

  @ApiProperty({ description: 'Display order in form' })
  displayOrder: number;

  @ApiProperty({ description: 'Is section required' })
  isRequired: boolean;

  @ApiProperty({ description: 'Additional configuration', required: false })
  config: Record<string, unknown> | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class CreateFormSectionDto {
  @ApiProperty({ description: 'Canonical section ID' })
  @IsString()
  sectionId: string;

  @ApiProperty({ description: 'Vietnamese display label' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'React component name' })
  @IsString()
  component: string;

  @ApiProperty({ description: 'Display order in form' })
  @IsInt()
  displayOrder: number;

  @ApiProperty({ description: 'Is section required', required: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ description: 'Additional configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateFormSectionDto {
  @ApiProperty({ description: 'Vietnamese display label', required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: 'React component name', required: false })
  @IsOptional()
  @IsString()
  component?: string;

  @ApiProperty({ description: 'Display order in form', required: false })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiProperty({ description: 'Is section required', required: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ description: 'Additional configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
