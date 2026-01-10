import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonaDropdown } from './PersonaDropdown';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../lib/auth/auth';
import { UserRole } from '../../shared/types/auth';
import { Permission } from '../../shared/types/permissions';

// Mock the auth store
vi.mock('../../stores/authStore');
// Mock the auth API
vi.mock('../../lib/auth/auth');

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockAuthApi = authApi as unknown as ReturnType<typeof vi.fn>;

describe('PersonaDropdown Component', () => {
  const mockSetDemoMode = vi.fn();
  const mockSetActingAs = vi.fn();

  const defaultAuthState = {
    user: {
      id: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com',
      role: UserRole.ADMIN,
      facultyId: null,
      permissions: [Permission.DEMO_SWITCH_PERSONA],
    },
    actingAs: null,
    demoMode: true,
    demoPersonas: [
      {
        id: 'DT-USER-001',
        name: 'Giảng viên',
        displayName: 'Giảng viên',
        role: UserRole.GIANG_VIEN,
        description: 'Chủ nhiệm đề tài',
      },
      {
        id: 'DT-USER-002',
        name: 'Quản lý Khoa',
        displayName: 'Quản lý Khoa',
        role: UserRole.QUAN_LY_KHOA,
        description: 'Duyệt hồ sơ cấp Khoa',
      },
    ],
    isAuthenticated: true,
    isLoading: false,
    error: null,
    setUser: vi.fn(),
    setActingAs: mockSetActingAs,
    setDemoMode: mockSetDemoMode,
    setLoading: vi.fn(),
    setError: vi.fn(),
    logout: vi.fn(),
    hasPermission: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    getEffectiveUser: vi.fn(function (this: any) {
      return this.actingAs || this.user;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (mockUseAuthStore as ReturnType<typeof vi.fn>).mockReturnValue(defaultAuthState);
    // Mock authApi.getDemoConfig to return a resolved promise
    (mockAuthApi.getDemoConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      enabled: true,
      personas: defaultAuthState.demoPersonas,
    });
    // Mock authApi.switchPersona
    (mockAuthApi.switchPersona as ReturnType<typeof vi.fn>).mockResolvedValue({
      actingAs: defaultAuthState.demoPersonas[0],
    });
  });

  describe('Visibility', () => {
    it('should not render when demo mode is disabled', () => {
      (mockUseAuthStore as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultAuthState,
        demoMode: false,
      });

      const { container } = render(<PersonaDropdown />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when demo mode is enabled', () => {
      render(<PersonaDropdown />);

      expect(screen.getByText(/Đang đóng vai:/i)).toBeDefined();
    });
  });

  describe('Persona Selection', () => {
    it('should show current user when not acting as anyone', () => {
      render(<PersonaDropdown />);

      expect(screen.getByText('Test User')).toBeDefined();
    });

    it('should show acting as persona when set', () => {
      (mockUseAuthStore as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultAuthState,
        actingAs: defaultAuthState.demoPersonas[0],
      });

      render(<PersonaDropdown />);

      expect(screen.getByText(/Giảng viên/)).toBeDefined();
    });

    it('should show dropdown when button is clicked', async () => {
      render(<PersonaDropdown />);

      // Click the dropdown button to open
      const dropdownButton = screen.getByText(/Đang đóng vai:/i).closest('button');
      fireEvent.click(dropdownButton!);

      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByText('Chọn Persona')).toBeDefined();
      });

      // Check for persona names in the dropdown
      expect(screen.getByText('Giảng viên')).toBeDefined();
      expect(screen.getByText('Quản lý Khoa')).toBeDefined();
    });

    it('should display persona descriptions in dropdown', async () => {
      render(<PersonaDropdown />);

      const dropdownButton = screen.getByText(/Đang đóng vai:/i).closest('button');
      fireEvent.click(dropdownButton!);

      await waitFor(() => {
        expect(screen.getByText('Chủ nhiệm đề tài')).toBeDefined();
        expect(screen.getByText('Duyệt hồ sơ cấp Khoa')).toBeDefined();
      });
    });
  });

  describe('Current User Display', () => {
    it('should show acting as persona when set', () => {
      (mockUseAuthStore as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultAuthState,
        actingAs: defaultAuthState.demoPersonas[1],
      });

      render(<PersonaDropdown />);

      expect(screen.getByText(/Quản lý Khoa/i)).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when switch fails', async () => {
      (mockAuthApi.switchPersona as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Switch failed')
      );

      render(<PersonaDropdown />);

      const dropdownButton = screen.getByText(/Đang đóng vai:/i).closest('button');
      fireEvent.click(dropdownButton!);

      await waitFor(() => {
        expect(screen.getByText('Chọn Persona')).toBeDefined();
      });

      // Click on a persona (not the active one)
      const personaButton = screen.getByText('Giảng viên').closest('button');
      if (personaButton) {
        fireEvent.click(personaButton);

        await waitFor(() => {
          expect(screen.getByText(/Switch failed/i)).toBeDefined();
        }, { timeout: 3000 });
      }
    });
  });
});
