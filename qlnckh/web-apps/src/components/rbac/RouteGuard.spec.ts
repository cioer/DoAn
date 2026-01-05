import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from '@react-router';
import { RouteGuard } from './RouteGuard';
import { Permission } from '../../shared/types/permissions';
import { useAuthStore } from '../../stores/authStore';

// Mock the auth store
jest.mock('../../stores/authStore');

describe('RouteGuard Component', () => {
  const mockHasPermission = jest.fn();
  const mockHasRole = jest.fn();
  const mockIsAuthenticated = false;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: mockIsAuthenticated,
      hasPermission: mockHasPermission,
      hasRole: mockHasRole,
    });
  });

  describe('Authentication check', () => {
    it('should redirect to login when not authenticated', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        hasPermission: mockHasPermission,
        hasRole: mockHasRole,
      });

      render(
        <BrowserRouter>
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
        </BrowserRouter>,
      );

      // Should redirect to login
      expect(window.location.pathname).toContain('/auth/login');
    });

    it('should render children when authenticated and has permission', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        hasPermission: () => true,
        hasRole: mockHasRole,
      });

      render(
        <BrowserRouter>
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
        </BrowserRouter>,
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Permission check', () => {
    it('should show 403 page when user lacks permission', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        hasPermission: () => false,
        hasRole: mockHasRole,
      });

      render(
        <BrowserRouter>
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
        </BrowserRouter>,
      );

      // Should redirect to 403 page
      expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    });
  });

  describe('Role check', () => {
    it('should render children when user has required role', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasRole: () => true,
      });

      render(
        <BrowserRouter>
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
        </BrowserRouter>,
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should show 403 page when user lacks required role', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasRole: () => false,
      });

      render(
        <BrowserRouter>
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
        </BrowserRouter>,
      );

      expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    });
  });

  describe('Fallback behavior', () => {
    it('should use custom fallback path when specified', () => {
      (useAuthStore as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        hasPermission: () => false,
        hasRole: mockHasRole,
      });

      render(
        <BrowserRouter>
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
        </BrowserRouter>,
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });
  });
});
