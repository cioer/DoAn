import { IsDateString, IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

/**
 * Create Holiday DTO
 * Story 10.5: Holiday Management
 *
 * Epic 9 Retro: Proper DTO validation, NO as unknown
 */
export class CreateHolidayDto {
  @IsDateString({}, { message: 'Ngày không hợp lệ' })
  date: string;

  @IsString()
  @MinLength(2, { message: 'Tên ngày lễ phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên ngày lễ không được quá 100 ký tự' })
  name: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}

/**
 * Update Holiday DTO
 */
export class UpdateHolidayDto {
  @IsOptional()
  @IsDateString({}, { message: 'Ngày không hợp lệ' })
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên ngày lễ phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên ngày lễ không được quá 100 ký tự' })
  name?: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}

/**
 * Holiday Query DTO
 */
export class HolidayQueryDto {
  year?: number;
  recurring?: boolean;
  page?: number;
  pageSize?: number;
}
