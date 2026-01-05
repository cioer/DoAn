import { IsEmail, IsString, IsNotEmpty, IsEnum, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Create User DTO
 *
 * Validation rules for creating a new user account
 */
export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email là bắt buộc' })
  email: string;

  @IsString({ message: 'Họ và tên phải là chuỗi' })
  @IsNotEmpty({ message: 'Họ và tên là bắt buộc' })
  @MinLength(2, { message: 'Họ và tên phải có ít nhất 2 ký tự' })
  displayName: string;

  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  @IsNotEmpty({ message: 'Vai trò là bắt buộc' })
  role: UserRole;

  @IsString({ message: 'Mã đơn vị phải là chuỗi' })
  @IsOptional()
  facultyId?: string;
}
