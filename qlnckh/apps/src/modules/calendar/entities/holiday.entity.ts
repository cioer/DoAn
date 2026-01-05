import { IsString, IsBoolean, IsDateString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Holiday Response Entity
 * Represents a holiday in the business calendar
 */
export class HolidayResponseDto {
  @ApiProperty({ description: 'Holiday ID' })
  id: string;

  @ApiProperty({ description: 'Holiday date in ISO 8601 format', example: '2026-01-01' })
  date: string;

  @ApiProperty({ description: 'Holiday name (e.g., "Tết Dương Lịch")' })
  name: string;

  @ApiProperty({ description: 'Whether this is a holiday (non-working day)', example: true })
  isHoliday: boolean;

  @ApiProperty({ description: 'Whether this is a working day (compensatory day)', example: false })
  isWorkingDay: boolean;

  @ApiProperty({ description: 'Whether this holiday recurs yearly', example: true })
  recurring: boolean;
}

/**
 * Create Holiday DTO
 * Request body for creating a new holiday
 */
export class CreateHolidayDto {
  @ApiProperty({ description: 'Holiday date in ISO 8601 format', example: '2026-01-01' })
  @IsNotEmpty({ message: 'Ngày không được để trống' })
  @IsDateString({}, { message: 'Ngày phải ở định dạng ISO 8601' })
  date: string;

  @ApiProperty({ description: 'Holiday name', example: 'Tết Dương Lịch' })
  @IsNotEmpty({ message: 'Tên ngày lễ không được để trống' })
  name: string;

  @ApiPropertyOptional({ description: 'Whether this is a holiday (default: true)', example: true })
  @IsOptional()
  @IsBoolean({ message: 'isHoliday phải là boolean' })
  isHoliday?: boolean;

  @ApiPropertyOptional({ description: 'Whether this recurs yearly (default: false)', example: true })
  @IsOptional()
  @IsBoolean({ message: 'recurring phải là boolean' })
  recurring?: boolean;

  @ApiPropertyOptional({ description: 'Whether this is a working/compensatory day (default: false)', example: false })
  @IsOptional()
  @IsBoolean({ message: 'isWorkingDay phải là boolean' })
  isWorkingDay?: boolean;
}

/**
 * Update Holiday DTO
 * Request body for updating an existing holiday
 */
export class UpdateHolidayDto {
  @ApiPropertyOptional({ description: 'Holiday name', example: 'Tết Dương Lịch' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Whether this is a holiday', example: true })
  @IsOptional()
  @IsBoolean({ message: 'isHoliday phải là boolean' })
  isHoliday?: boolean;

  @ApiPropertyOptional({ description: 'Whether this is a working/compensatory day', example: false })
  @IsOptional()
  @IsBoolean({ message: 'isWorkingDay phải là boolean' })
  isWorkingDay?: boolean;

  @ApiPropertyOptional({ description: 'Whether this recurs yearly', example: true })
  @IsOptional()
  @IsBoolean({ message: 'recurring phải là boolean' })
  recurring?: boolean;
}

/**
 * Holiday Query DTO
 * Query parameters for filtering holidays
 */
export class HolidayQueryDto {
  @ApiPropertyOptional({ description: 'Filter by year (e.g., 2026)', example: 2026 })
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Filter by month (1-12)', example: 1 })
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ description: 'Filter by isHoliday flag', example: true })
  @IsOptional()
  @IsBoolean({ message: 'isHoliday phải là boolean' })
  isHoliday?: boolean;
}
