import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { FacultyType } from '@prisma/client';

/**
 * Update Faculty DTO
 *
 * Validation rules for updating a faculty
 * All fields are optional
 */
export class UpdateFacultyDto {
  @IsString({ message: 'Mã khoa phải là chuỗi' })
  @IsOptional()
  code?: string;

  @IsString({ message: 'Tên khoa phải là chuỗi' })
  @IsOptional()
  name?: string;

  @IsEnum(FacultyType, { message: 'Loại đơn vị không hợp lệ' })
  @IsOptional()
  type?: FacultyType;
}
