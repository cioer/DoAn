import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Switch Persona DTO
 * Request body for switching to a different persona in demo mode
 */
export class SwitchPersonaDto {
  @ApiProperty({
    description: 'User ID of the persona to impersonate',
    example: 'DT-USER-002',
  })
  @IsNotEmpty({ message: 'ID người dùng không được để trống' })
  @IsUUID('4', { message: 'ID người dùng không hợp lệ' })
  targetUserId: string;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicate switches',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Idempotency key không hợp lệ' })
  idempotencyKey?: string;
}
