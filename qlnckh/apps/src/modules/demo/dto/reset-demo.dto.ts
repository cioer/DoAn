import { IsDefined, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Reset Demo DTO
 * Request body for resetting demo data
 * Requires explicit confirmation to prevent accidental resets
 */
export class ResetDemoDto {
  @ApiProperty({
    description: 'Confirmation flag - must be true to execute reset',
    example: true,
  })
  @IsDefined({ message: 'Vui lòng xác nhận reset demo' })
  @IsBoolean({ message: 'Confirmation phải là boolean' })
  confirmed: boolean;
}
