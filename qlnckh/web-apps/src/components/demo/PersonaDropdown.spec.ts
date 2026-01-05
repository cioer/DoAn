import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonaDropdown } from './PersonaDropdown';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../lib/auth/auth';
import { UserRole } from '../../shared/types/auth';
import { Permission } from '../../shared/types/permissions';

// Mock the auth store
jest.mock('../../stores/authStore');
// Mock the auth API
jest.mock('../../lib/auth/auth');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('PersonaDropdown Component', () => {
  const mockSetDemoMode = jest.fn();
  const mockSetActingAs = jest.fn();

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
        role: UserRole.GIANG_VIEN,
        description: 'Chủ nhiệm đề tài',
      },
      {
        id: 'DT-USER-002',
        name: 'Quản lý Khoa',
        role: UserRole.QUAN_LY_KHOA,
        description: 'Duyệt hồ sơ cấp Khoa',
      },
    ],
    isAuthenticated: true,
    isLoading: false,
    error: null,
    setUser: jest.fn(),
    setActingAs: mockSetActingAs,
    setDemoMode: mockSetDemoMode,
    setLoading: jest.fn(),
    setError: jest.fn(),
    logout: jest.fn(),
    hasPermission: jest.fn(() => true),
    hasAnyPermission: jest.fn(() => true),
    hasRole: jest.fn(() => true),
    getEffectiveUser: jest.fn(function (this: any) {
      return this.actingAs || this.user;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue(defaultAuthState);
  });

  describe('Visibility', () => {
    it('should not render when demo mode is disabled', () => {
      mockUseAuthStore.mockReturnValue({
        ...defaultAuthState,
        demoMode: false,
      });

      const { container } = render(<PersonaDropdown />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when demo mode is enabled', () => {
      render(<PersonaDropdown />);

      expect(screen.getByText('DEMO')).toBeInTheDocument();
      expect(screen.getByText('Đang đóng vai:')).toBeInTheDocument();
    });
  });

  describe('Persona Display', () => {
    it('should show user name when not acting as anyone', () => {
      render(<PersonaDropdown />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should show acting as user name when acting as persona', () => {
      const actingAsUser = {
        id: 'DT-USER-002',
        displayName: 'Quản lý Khoa',
        email: 'quanly@example.com',
        role: UserRole.QUAN_LY_KHOA,
        facultyId: 'KHOA-01',
        permissions: [],
      };

      mockUseAuthStore.mockReturnValue({
        ...defaultAuthState,
        actingAs: actingAsUser,
        getEffectiveUser: jest.fn(function (this: any) {
          return this.actingAs || this.user;
        }),
      });

      render(<PersonaDropdown />);

      expect(screen.getByText('Quản lý Khoa')).toBeInTheDocument();
    });
  });

  describe('Dropdown Menu', () => {
    it('should open dropdown on button click', async () => {
      mockAuthApi.getDemoConfig.mockResolvedValue({
        enabled: true,
        personas: defaultAuthState.demoPersonas,
      });

      render(<PersonaDropdown />);

      const button = screen.getByText('Đang đóng vai:').closest('button');
      fireEvent.click(button as Element);

      await waitFor(() => {
        expect(screen.getByText('Giảng viên')).toBeInTheDocument();
        expect(screen.getByText('Quản lý Khoa')).toBeInTheDocument();
      });
    });

    it('should close dropdown on backdrop click', async () => {
      mockAuthApi.getDemoConfig.mockResolvedValue({
        enabled: true,
        personas: defaultAuthState.demoPersonas,
      });

      render(<PersonaDropdown />);

      // Open dropdown
      const button = screen.getByText('Đang đóng vai:').closest('button');
      fireEvent.click(button as Element);

      await waitFor(() => {
        expect(screen.getByText('Giảng viên')).toBeInTheDocument();
      });

      // Click backdrop
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Giảng viên')).not.toBeInTheDocument();
      });
    });
  });

  describe('Persona Switching', () => {
    it('should call switchPersona API when persona is clicked', async () => {
      mockAuthApi.getDemoConfig.mockResolvedValue({
        enabled: true,
        personas: defaultAuthState.demoPersonas,
      });

      const switchResponse = {
        user: defaultAuthState.user,
        actingAs: {
          id: 'DT-USER-002',
          displayName: 'Quản lý Khoa',
          email: 'quanly@example.com',
          role: UserRole.QUAN_LY_KHOA,
          facultyId: 'KHOA-01',
          permissions: [],
        },
      };

      mockAuthApi.switchPersona.mockResolvedValue(switchResponse);

      render(<PersonaDropdown />);

      // Open dropdown
      const button = screen.getByText('Đang đóng vai:').closest('button');
      fireEvent.click(button as Element);

      await waitFor(() => {
        expect(screen.getByText('Giảng viên')).toBeInTheDocument();
      });

      // Click on persona
      const personaButton = screen.getByText('Quản lý Khoa').closest('button');
      fireEvent.click(personaButton as Element);

      await waitFor(() => {
        expect(mockAuthApi.switchPersona).toHaveBeenCalledWith('DT-USER-002');
        expect(mockSetActingAs).toHaveBeenCalledWith(switchResponse.actingAs);
      });
    });

    it('should disable active persona button', async () => {
      const actingAsUser = {
        id: 'DT-USER-002',
        displayName: 'Quản lý Khoa',
        email: 'quanly@example.com',
        role: UserRole.QUAN_LY_KHOA,
        facultyId: 'KHOA-01',
        permissions: [],
      };

      mockUseAuthStore.mockReturnValue({
        ...defaultAuthState,
        actingAs: actingAsUser,
        getEffectiveUser: jest.fn(function (this: any) {
          return this.actingAs || this.user;
        }),
      });

      mockAuthApi.getDemoConfig.mockResolvedValue({
        enabled: true,
        personas: defaultAuthState.demoPersonas,
      });

      render(<PersonaDropdown />);

      // Open dropdown
      const button = screen.getByText('Đang đóng vai:').closest('button');
      fireEvent.click(button as Element);

      await waitFor(() => {
        expect(screen.getByText('Quản lý Khoa')).toBeInTheDocument();
      });

      // The active persona button should be disabled
      const activePersonaButton = screen.getAllByText('Quản lý Khoa')[1].closest('button');
      expect(activePersonaButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when switching', async () => {
      mockAuthApi.getDemoConfig.mockResolvedValue({
        enabled: true,
        personas: defaultAuthState.demoPersonas,
      });

      // Make switchPersona hang
      mockAuthApi.switchPersona.mockImplementation(() => new Promise(() => {}));

      render(<PersonaDropdown />);

      // Open dropdown
      const button = screen.getByText('Đang đóng vai:').closest('button');
      fireEvent.click(button as Element);

      await waitFor(() => {
        expect(screen.getByText('Giảng viên')).toBeInTheDocument();
      });

      // Click on persona
      const personaButton = screen.getByText('Giảng viên').closest('button');
      fireEvent.click(personaButton as Element);

      await waitFor(() => {
        expect(screen.getByText(/Đang chuyển/)).toBeInTheDocument();
      });
    });
  });
});
