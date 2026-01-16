import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * Change Password DTO
 *
 * For users to change their own password
 * Requires current password verification
 */
export class ChangePasswordDto {
  /**
   * Current password for verification
   */
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword: string;

  /**
   * New password
   * Must be 8-50 characters with at least one uppercase, lowercase, and number
   */
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu không được quá 50 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  })
  newPassword: string;
}
