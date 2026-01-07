import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { FacultyAcceptanceProductDto } from './faculty-acceptance-product.dto';

/**
 * Submit Faculty Acceptance DTO
 * Story 6.2: Submit faculty acceptance review (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
 */
export class SubmitFacultyAcceptanceDto {
  @ApiProperty({ description: 'Kết quả thực hiện (implementation results)' })
  @IsString()
  @IsNotEmpty()
  results: string;

  @ApiProperty({
    description: 'Danh sách sản phẩm đầu ra',
    type: [FacultyAcceptanceProductDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacultyAcceptanceProductDto)
  products: FacultyAcceptanceProductDto[];

  @ApiProperty({
    description: 'IDs of uploaded attachment files',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
