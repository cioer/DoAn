import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteGuard } from './RouteGuard';
import { Permission } from '../../shared/types/permissions';

// Mock the auth store module
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from '../../stores/authStore';

describe('RouteGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication check', () => {
    it('should redirect to login when not authenticated', () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const mockState = {
          isAuthenticated: false,
          hasPermission: vi.fn(),
          hasRole: vi.fn(),
        };
        return selector ? selector(mockState) : mockState;
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RouteGuard permission={Permission.USER_MANAGE}>
                  <div>Protected Content</div>
                </RouteGuard>
              }
            />
            <Route path="/auth/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>,
      );

      // Navigate component should be rendered
      expect(container.innerHTML).toContain('Login Page');
    });

    it('should render children when authenticated and has permission', () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const mockState = {
          isAuthenticated: true,
          hasPermission: vi.fn(() => true),
          hasRole: vi.fn(),
        };
        return selector ? selector(mockState) : mockState;
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RouteGuard permission={Permission.USER_MANAGE}>
                  <div>Protected Content</div>
                </RouteGuard>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Protected Content')).toBeDefined();
    });
  });

  describe('Permission check', () => {
    it('should show 403 page when user lacks permission', () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const mockState = {
          isAuthenticated: true,
          hasPermission: vi.fn(() => false),
          hasRole: vi.fn(),
        };
        return selector ? selector(mockState) : mockState;
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RouteGuard permission={Permission.USER_MANAGE}>
                  <div>Protected Content</div>
                </RouteGuard>
              }
            />
            <Route path="/error/403" element={<div>403 Forbidden</div>} />
          </Routes>
        </MemoryRouter>,
      );

      // Should redirect to 403 page
      expect(container.innerHTML).toContain('403 Forbidden');
    });
  });

  describe('Role check', () => {
    it('should render children when user has required role', () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const mockState = {
          isAuthenticated: true,
          hasPermission: vi.fn(),
          hasRole: vi.fn(() => true),
        };
        return selector ? selector(mockState) : mockState;
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RouteGuard role={'ADMIN' as any}>
                  <div>Admin Content</div>
                </RouteGuard>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Admin Content')).toBeDefined();
    });

    it('should show 403 page when user lacks required role', () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const mockState = {
          isAuthenticated: true,
          hasPermission: vi.fn(),
          hasRole: vi.fn(() => false),
        };
        return selector ? selector(mockState) : mockState;
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RouteGuard role={'ADMIN' as any}>
                  <div>Admin Content</div>
                </RouteGuard>
              }
            />
            <Route path="/error/403" element={<div>403 Forbidden</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(container.innerHTML).toContain('403 Forbidden');
    });
  });

  describe('Fallback behavior', () => {
    it('should use custom fallback path when specified', () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const mockState = {
          isAuthenticated: true,
          hasPermission: vi.fn(() => false),
          hasRole: vi.fn(),
        };
        return selector ? selector(mockState) : mockState;
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RouteGuard
                  permission={Permission.USER_MANAGE}
                  fallbackPath="/custom-error"
                >
                  <div>Protected Content</div>
                </RouteGuard>
              }
            />
            <Route path="/custom-error" element={<div>Custom Error</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(container.innerHTML).toContain('Custom Error');
    });
  });
});
