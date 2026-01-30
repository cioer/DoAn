import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email đăng nhập',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email phải là định dạng email hợp lệ' })
  email: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 8 ký tự)',
    example: 'Password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;
}
