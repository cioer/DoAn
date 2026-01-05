import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for HttpOnly cookies
});

// Import shared types
export type {
  User,
  UserRole,
  LoginRequest,
  AuthResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
  DemoModeConfig,
  DemoPersona,
  SwitchPersonaResponse,
  ResetDemoResponse,
} from '../shared/types/auth';

// Handle 401 responses with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        // Retry original request
        return apiClient(originalRequest);
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// Auth API functions
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; actingAs?: User }> => {
    const response = await apiClient.post<{ success: true; data: { user: User; actingAs?: User } }>(
      '/auth/login',
      { email, password },
    );
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<{ user: User; actingAs?: User }> => {
    const response = await apiClient.get<{ success: true; data: { user: User; actingAs?: User } }>(
      '/auth/me',
    );
    return response.data.data;
  },

  // Demo mode API functions
  getDemoConfig: async (): Promise<DemoModeConfig> => {
    const response = await apiClient.get<{ success: true; data: DemoModeConfig }>(
      '/demo/config',
    );
    return response.data.data;
  },

  switchPersona: async (targetUserId: string): Promise<SwitchPersonaResponse> => {
    const response = await apiClient.post<{ success: true; data: SwitchPersonaResponse }>(
      '/demo/switch-persona',
      { targetUserId },
    );
    return response.data.data;
  },

  resetDemo: async (): Promise<ResetDemoResponse> => {
    const response = await apiClient.post<{ success: true; data: ResetDemoResponse }>(
      '/demo/reset',
      { confirmed: true },
    );
    return response.data.data;
  },
};
