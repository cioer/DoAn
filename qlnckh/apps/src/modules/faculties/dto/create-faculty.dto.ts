import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { FacultyType } from '@prisma/client';

/**
 * Create Faculty DTO
 *
 * Validation rules for creating a new faculty
 */
export class CreateFacultyDto {
  @IsString({ message: 'Mã khoa phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã khoa là bắt buộc' })
  @MinLength(2, { message: 'Mã khoa phải có ít nhất 2 ký tự' })
  code: string;

  @IsString({ message: 'Tên khoa phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên khoa là bắt buộc' })
  @MinLength(2, { message: 'Tên khoa phải có ít nhất 2 ký tự' })
  name: string;

  @IsEnum(FacultyType, { message: 'Loại đơn vị không hợp lệ' })
  @IsOptional()
  type?: FacultyType;
}
