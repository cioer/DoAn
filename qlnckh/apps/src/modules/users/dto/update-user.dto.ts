import { IsEnum, IsString, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Update User DTO
 *
 * Validation rules for updating an existing user
 * All fields are optional - only provided fields will be updated
 */
export class UpdateUserDto {
  @IsString({ message: 'Họ và tên phải là chuỗi' })
  @IsOptional()
  @MinLength(2, { message: 'Họ và tên phải có ít nhất 2 ký tự' })
  displayName?: string;

  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  @IsOptional()
  role?: UserRole;

  @IsString({ message: 'Mã đơn vị phải là chuỗi' })
  @IsOptional()
  facultyId?: string;
}
