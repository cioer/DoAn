import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';

/**
 * Product Type Enum
 * Types of research products for faculty acceptance
 */
export enum ProductType {
  BAI_BAO = 'BAI_BAO',           // Bài báo khoa học
  SACH = 'SACH',                 // Sách/chương sách
  PHAN_MEM = 'PHAN_MEM',         // Phần mềm
  SAN_PHAM = 'SAN_PHAM',         // Sản phẩm
  KHAC = 'KHAC',                 // Khác
}

/**
 * Faculty Acceptance Product DTO
 * Represents a single product in the acceptance submission
 */
export class FacultyAcceptanceProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Product type', enum: ProductType })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({
    description: 'Optional note about the product',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Attachment ID if file uploaded',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  attachmentId?: string;
}
