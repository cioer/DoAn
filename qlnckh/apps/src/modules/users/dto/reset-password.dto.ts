import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Reset Password DTO
 *
 * For admin to reset user password
 * Generates a random 8-character password
 */
export class ResetPasswordDto {
  /**
   * Optional confirmation flag
   * Can be used by frontend to require explicit confirmation
   */
  @IsBoolean()
  @IsOptional()
  confirmed?: boolean;
}

/**
 * Reset Password Response
 */
export interface ResetPasswordResponse {
  userId: string;
  email: string;
  temporaryPassword: string;
  message: string;
}
