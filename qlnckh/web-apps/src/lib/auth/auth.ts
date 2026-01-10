import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Extended axios request config with retry flag for token refresh
 */
interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

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

/**
 * Token Refresh Manager
 *
 * Prevents race conditions when multiple requests fail with 401 simultaneously.
 * Only one refresh request is made, and all queued requests wait for it.
 */
class TokenRefreshManager {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  /**
   * Process the queued requests after token refresh
   */
  private processQueue(error: unknown | null, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Add a request to the refresh queue
   */
  public addRequestToQueue(
    resolve: (value?: unknown) => void,
    reject: (reason?: unknown) => void,
  ) {
    this.failedQueue.push({ resolve, reject });
  }

  /**
   * Check if currently refreshing
   */
  public get isTokenRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * Set refresh state
   */
  public setRefreshState(state: boolean) {
    this.isRefreshing = state;
  }

  /**
   * Process all queued requests
   */
  public refreshQueue(error: unknown | null = null) {
    this.processQueue(error);
  }
}

const refreshManager = new TokenRefreshManager();

/**
 * Logout handler - clears auth state and redirects to login
 * Can be called from auth interceptor when refresh fails
 */
let handleLogout: (() => void) | null = null;

/**
 * Register logout handler for token refresh failure
 * Called by AuthProvider/AuthGuard to properly clear state
 */
export function registerLogoutHandler(fn: () => void) {
  handleLogout = fn;
}

/**
 * Perform logout with state cleanup
 */
function performLogout() {
  if (handleLogout) {
    handleLogout();
  } else {
    // Fallback if no handler registered - minimal cleanup
    window.location.href = '/auth/login';
  }
}

/**
 * Refresh the access token
 */
async function refreshAccessToken(): Promise<string> {
  const response = await axios.post<{ success: true; data: { user: any } }>(
    `${API_URL}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  return 'refreshed'; // Token is handled via HttpOnly cookie
}

// Handle 401 responses with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfigWithRetry;

    // If 401 and not already retrying
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (refreshManager.isTokenRefreshing) {
        return new Promise((resolve, reject) => {
          refreshManager.addRequestToQueue(resolve, reject);
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      refreshManager.setRefreshState(true);

      try {
        // Try to refresh the token
        await refreshAccessToken();

        refreshManager.setRefreshState(false);
        refreshManager.refreshQueue(null);

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshManager.setRefreshState(false);
        refreshManager.refreshQueue(refreshError);

        // Refresh failed, logout user
        performLogout();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Auth API functions
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: any; actingAs?: any }> => {
    const response = await apiClient.post<{
      success: true;
      data: { user: any; actingAs?: any };
    }>('/auth/login', { email, password });
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<{ user: any; actingAs?: any }> => {
    const response = await apiClient.get<{
      success: true;
      data: { user: any; actingAs?: any };
    }>('/auth/me');
    return response.data.data;
  },

  // Demo mode API functions
  getDemoConfig: async (): Promise<any> => {
    const response = await apiClient.get<{
      success: true;
      data: any;
    }>('/demo/config');
    return response.data.data;
  },

  switchPersona: async (targetUserId: string): Promise<any> => {
    const response = await apiClient.post<{
      success: true;
      data: any;
    }>('/demo/switch-persona', { targetUserId });
    return response.data.data;
  },

  resetDemo: async (): Promise<any> => {
    const response = await apiClient.post<{
      success: true;
      data: any;
    }>('/demo/reset', { confirmed: true });
    return response.data.data;
  },
};
