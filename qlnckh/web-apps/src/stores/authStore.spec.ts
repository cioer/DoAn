/**
 * Auth Store Tests
 *
 * Tests for Zustand auth store including:
 * - User authentication state management
 * - Permission checking (hasPermission, hasAnyPermission)
 * - Role checking (hasRole)
 * - Demo mode functionality
 * - Effective user resolution (actingAs vs user)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import { UserRole } from '../shared/types/auth';
import { Permission } from '../shared/types/permissions';
import { DemoPersona } from '../shared/types/auth';

describe('AuthStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  describe('Authentication State', () => {
    it('should initialize with empty state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.actingAs).toBeNull();
      expect(state.demoMode).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set user and update isAuthenticated', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [Permission.PROPOSAL_CREATE, Permission.PROPOSAL_EDIT],
      };

      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should clear user and isAuthenticated on logout', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [Permission.PROPOSAL_CREATE],
      };

      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.actingAs).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the matching role', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.QUAN_LY_KHOA,
        permissions: [],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().hasRole(UserRole.QUAN_LY_KHOA)).toBe(true);
    });

    it('should return false when user has a different role', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().hasRole(UserRole.QUAN_LY_KHOA)).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      expect(useAuthStore.getState().hasRole(UserRole.GIANG_VIEN)).toBe(false);
    });

    it('should return false when user is null', () => {
      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().hasRole(UserRole.GIANG_VIEN)).toBe(false);
    });

    it('should check actingAs role when in demo mode', () => {
      const mainUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: UserRole.ADMIN,
        permissions: [],
      };

      const actingAsUser = {
        id: 'user-2',
        email: 'giang-vien@example.com',
        name: 'Giảng Viên',
        role: UserRole.GIANG_VIEN,
        permissions: [],
      };

      useAuthStore.getState().setUser(mainUser);
      useAuthStore.getState().setActingAs(actingAsUser);

      // Should check actingAs role, not main user role
      expect(useAuthStore.getState().hasRole(UserRole.GIANG_VIEN)).toBe(true);
      expect(useAuthStore.getState().hasRole(UserRole.ADMIN)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: UserRole.ADMIN,
        permissions: [Permission.USER_MANAGE, Permission.PROPOSAL_EDIT],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().hasPermission(Permission.USER_MANAGE)).toBe(true);
      expect(useAuthStore.getState().hasPermission(Permission.PROPOSAL_EDIT)).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [Permission.PROPOSAL_CREATE],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().hasPermission(Permission.USER_MANAGE)).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      expect(useAuthStore.getState().hasPermission(Permission.PROPOSAL_CREATE)).toBe(false);
    });

    it('should check actingAs permissions when in demo mode', () => {
      const mainUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: UserRole.ADMIN,
        permissions: [Permission.USER_MANAGE],
      };

      const actingAsUser = {
        id: 'user-2',
        email: 'giang-vien@example.com',
        name: 'Giảng Viên',
        role: UserRole.GIANG_VIEN,
        permissions: [Permission.PROPOSAL_CREATE],
      };

      useAuthStore.getState().setUser(mainUser);
      useAuthStore.getState().setActingAs(actingAsUser);

      // Should check actingAs permissions
      expect(useAuthStore.getState().hasPermission(Permission.PROPOSAL_CREATE)).toBe(true);
      expect(useAuthStore.getState().hasPermission(Permission.USER_MANAGE)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one of the permissions', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [Permission.PROPOSAL_CREATE],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(
        useAuthStore.getState().hasAnyPermission([
          Permission.USER_MANAGE,
          Permission.PROPOSAL_CREATE,
        ])
      ).toBe(true);
    });

    it('should return true when user has all of the permissions', () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: UserRole.ADMIN,
        permissions: [Permission.USER_MANAGE, Permission.PROPOSAL_EDIT],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(
        useAuthStore.getState().hasAnyPermission([
          Permission.USER_MANAGE,
          Permission.PROPOSAL_EDIT,
        ])
      ).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [Permission.PROPOSAL_CREATE],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(
        useAuthStore.getState().hasAnyPermission([
          Permission.USER_MANAGE,
          Permission.USER_DELETE,
        ])
      ).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      expect(
        useAuthStore.getState().hasAnyPermission([Permission.PROPOSAL_CREATE])
      ).toBe(false);
    });

    it('should check actingAs permissions when in demo mode', () => {
      const mainUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: UserRole.ADMIN,
        permissions: [Permission.USER_MANAGE],
      };

      const actingAsUser = {
        id: 'user-2',
        email: 'giang-vien@example.com',
        name: 'Giảng Viên',
        role: UserRole.GIANG_VIEN,
        permissions: [Permission.PROPOSAL_CREATE],
      };

      useAuthStore.getState().setUser(mainUser);
      useAuthStore.getState().setActingAs(actingAsUser);

      expect(
        useAuthStore.getState().hasAnyPermission([
          Permission.USER_MANAGE,
          Permission.PROPOSAL_CREATE,
        ])
      ).toBe(true); // Has PROPOSAL_CREATE from actingAs
    });
  });

  describe('getEffectiveUser', () => {
    it('should return user when actingAs is null', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().getEffectiveUser()).toEqual(mockUser);
    });

    it('should return actingAs when set', () => {
      const mainUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: UserRole.ADMIN,
        permissions: [],
      };

      const actingAsUser = {
        id: 'user-2',
        email: 'giang-vien@example.com',
        name: 'Giảng Viên',
        role: UserRole.GIANG_VIEN,
        permissions: [],
      };

      useAuthStore.getState().setUser(mainUser);
      useAuthStore.getState().setActingAs(actingAsUser);

      expect(useAuthStore.getState().getEffectiveUser()).toEqual(actingAsUser);
    });

    it('should return null when both user and actingAs are null', () => {
      expect(useAuthStore.getState().getEffectiveUser()).toBeNull();
    });
  });

  describe('Demo Mode', () => {
    it('should set demo mode and personas', () => {
      const mockPersonas: DemoPersona[] = [
        {
          id: 'persona-1',
          name: 'Persona 1',
          role: UserRole.GIANG_VIEN,
        },
        {
          id: 'persona-2',
          name: 'Persona 2',
          role: UserRole.QUAN_LY_KHOA,
        },
      ];

      useAuthStore.getState().setDemoMode(true, mockPersonas);

      const state = useAuthStore.getState();
      expect(state.demoMode).toBe(true);
      expect(state.demoPersonas).toEqual(mockPersonas);
    });

    it('should disable demo mode', () => {
      useAuthStore.getState().setDemoMode(true, []);

      expect(useAuthStore.getState().demoMode).toBe(true);

      useAuthStore.getState().setDemoMode(false);

      expect(useAuthStore.getState().demoMode).toBe(false);
    });

    it('should clear actingAs on logout', () => {
      const mainUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: UserRole.ADMIN,
        permissions: [],
      };

      const actingAsUser = {
        id: 'user-2',
        email: 'giang-vien@example.com',
        name: 'Giảng Viên',
        role: UserRole.GIANG_VIEN,
        permissions: [],
      };

      useAuthStore.getState().setUser(mainUser);
      useAuthStore.getState().setActingAs(actingAsUser);
      expect(useAuthStore.getState().actingAs).toEqual(actingAsUser);

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().actingAs).toBeNull();
    });
  });

  describe('Error and Loading State', () => {
    it('should set error message', () => {
      useAuthStore.getState().setError('Login failed');

      expect(useAuthStore.getState().error).toBe('Login failed');
    });

    it('should clear error when setting user', () => {
      useAuthStore.getState().setError('Some error');
      expect(useAuthStore.getState().error).toBe('Some error');

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.GIANG_VIEN,
        permissions: [],
      };

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});
