import { apiClient } from '../auth/auth';

/**
 * Holiday types matching backend DTOs
 */
export interface Holiday {
  id: string;
  date: string; // ISO date string
  name: string;
  isHoliday: boolean;
  year: number;
  month: number;
  day: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayDto {
  date: string; // ISO date string
  name: string;
  isHoliday: boolean;
}

export interface UpdateHolidayDto {
  name?: string;
  isHoliday?: boolean;
}

export interface HolidayQueryDto {
  year?: number;
  month?: number;
  isHoliday?: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Calendar API Client
 *
 * All holiday/calendar-related API calls
 * Story 1.8: Business Calendar Basic
 */
export const calendarApi = {
  /**
   * GET /api/calendar/holidays
   * List all holidays with optional filtering
   */
  getHolidays: async (params: HolidayQueryDto = {}): Promise<Holiday[]> => {
    const queryParams = new URLSearchParams();
    if (params.year !== undefined) queryParams.append('year', String(params.year));
    if (params.month !== undefined) queryParams.append('month', String(params.month));
    if (params.isHoliday !== undefined) queryParams.append('isHoliday', String(params.isHoliday));

    const url = queryParams.toString() ? `/calendar/holidays?${queryParams.toString()}` : '/calendar/holidays';
    const response = await apiClient.get<ApiResponse<Holiday[]>>(url);
    return response.data.data;
  },

  /**
   * GET /api/calendar/holidays/:id
   * Get holiday by ID
   */
  getHolidayById: async (id: string): Promise<Holiday> => {
    const response = await apiClient.get<ApiResponse<Holiday>>(`/calendar/holidays/${id}`);
    return response.data.data;
  },

  /**
   * POST /api/calendar/holidays
   * Create a new holiday
   */
  createHoliday: async (data: CreateHolidayDto): Promise<Holiday> => {
    const response = await apiClient.post<ApiResponse<Holiday>>('/calendar/holidays', data);
    return response.data.data;
  },

  /**
   * PATCH /api/calendar/holidays/:id
   * Update an existing holiday
   */
  updateHoliday: async (id: string, data: UpdateHolidayDto): Promise<Holiday> => {
    const response = await apiClient.patch<ApiResponse<Holiday>>(`/calendar/holidays/${id}`, data);
    return response.data.data;
  },

  /**
   * DELETE /api/calendar/holidays/:id
   * Delete a holiday
   */
  deleteHoliday: async (id: string): Promise<void> => {
    await apiClient.delete(`/calendar/holidays/${id}`);
  },
};
