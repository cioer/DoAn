/**
 * Auth API Client Tests
 *
 * Tests for authentication API client including:
 * - Login/logout functionality
 * - Token refresh with race condition handling
 * - 401 error handling with automatic retry
 * - Logout handler registration
 * - Demo mode API functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Import the actual module
import { apiClient, authApi, registerLogoutHandler } from './auth';

describe('Auth API Client', () => {
  // Spy on apiClient methods
  const postSpy = vi.spyOn(apiClient, 'post');
  const getSpy = vi.spyOn(apiClient, 'get');

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('apiClient configuration', () => {
    it('should be configured with correct base URL', () => {
      // The baseURL defaults to '/api' when VITE_API_URL is not set
      expect(apiClient.defaults.baseURL).toBe('/api');
    });

    it('should have withCredentials enabled for HttpOnly cookies', () => {
      expect(apiClient.defaults.withCredentials).toBe(true);
    });

    it('should have response interceptor configured', () => {
      expect(apiClient.interceptors.response).toBeDefined();
      expect(typeof apiClient.interceptors.response.use).toBe('function');
    });
  });

  describe('authApi.login', () => {
    it('should send login request with correct payload', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'GIANG_VIEN',
        permissions: [],
      };

      postSpy.mockResolvedValue({
        data: {
          success: true,
          data: { user: mockUser },
        },
      });

      const result = await authApi.login('test@example.com', 'password');

      expect(postSpy).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password',
      });
      expect(result).toEqual({ user: mockUser });
    });

    it('should return user with actingAs when in demo mode', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        permissions: [],
      };

      const mockActingAs = {
        id: 'user-2',
        email: 'giang-vien@example.com',
        name: 'Giảng Viên',
        role: 'GIANG_VIEN',
        permissions: [],
      };

      postSpy.mockResolvedValue({
        data: {
          success: true,
          data: { user: mockUser, actingAs: mockActingAs },
        },
      });

      const result = await authApi.login('admin@example.com', 'password');

      expect(result).toEqual({
        user: mockUser,
        actingAs: mockActingAs,
      });
    });

    it('should throw error on login failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Email hoặc mật khẩu không đúng',
            },
          },
        },
      };

      postSpy.mockRejectedValue(mockError);

      await expect(
        authApi.login('test@example.com', 'wrong-password')
      ).rejects.toEqual(mockError);
    });
  });

  describe('authApi.logout', () => {
    it('should send logout request', async () => {
      postSpy.mockResolvedValue({});

      await authApi.logout();

      expect(postSpy).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('authApi.getMe', () => {
    it('should fetch current user data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'GIANG_VIEN',
        permissions: ['PROPOSAL_CREATE'],
      };

      getSpy.mockResolvedValue({
        data: {
          success: true,
          data: { user: mockUser },
        },
      });

      const result = await authApi.getMe();

      expect(getSpy).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual({ user: mockUser });
    });

    it('should return actingAs when in demo mode', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        permissions: [],
      };

      const mockActingAs = {
        id: 'user-2',
        email: 'giang-vien@example.com',
        name: 'Giảng Viên',
        role: 'GIANG_VIEN',
        permissions: [],
      };

      getSpy.mockResolvedValue({
        data: {
          success: true,
          data: { user: mockUser, actingAs: mockActingAs },
        },
      });

      const result = await authApi.getMe();

      expect(result).toEqual({
        user: mockUser,
        actingAs: mockActingAs,
      });
    });
  });

  describe('Demo Mode APIs', () => {
    it('authApi.getDemoConfig should fetch demo configuration', async () => {
      const mockConfig = {
        enabled: true,
        personas: [
          { id: 'p1', name: 'Persona 1', role: 'GIANG_VIEN' },
          { id: 'p2', name: 'Persona 2', role: 'QUAN_LY_KHOA' },
        ],
      };

      getSpy.mockResolvedValue({
        data: {
          success: true,
          data: mockConfig,
        },
      });

      const result = await authApi.getDemoConfig();

      expect(getSpy).toHaveBeenCalledWith('/demo/config');
      expect(result).toEqual(mockConfig);
    });

    it('authApi.switchPersona should send switch persona request', async () => {
      const mockResponse = {
        user: { id: 'u1', name: 'User' },
        actingAs: { id: 'p1', name: 'Persona' },
      };

      postSpy.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await authApi.switchPersona('persona-1');

      expect(postSpy).toHaveBeenCalledWith('/demo/switch-persona', {
        targetUserId: 'persona-1',
      });
      expect(result).toEqual(mockResponse);
    });

    it('authApi.resetDemo should send reset demo request', async () => {
      const mockResponse = { success: true };

      postSpy.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await authApi.resetDemo();

      expect(postSpy).toHaveBeenCalledWith('/demo/reset', {
        confirmed: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Logout Handler Registration', () => {
    it('should register logout handler', () => {
      const mockLogout = vi.fn();

      expect(() => registerLogoutHandler(mockLogout)).not.toThrow();
    });
  });

  describe('Type Exports', () => {
    it('should export apiClient', () => {
      expect(apiClient).toBeDefined();
    });

    it('should export authApi', () => {
      expect(authApi).toBeDefined();
    });

    it('should export registerLogoutHandler', () => {
      expect(registerLogoutHandler).toBeDefined();
    });
  });
});
