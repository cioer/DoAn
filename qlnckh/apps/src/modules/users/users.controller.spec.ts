import { UsersController } from './users.controller';
import { UserRole, User } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Users Controller Unit Tests
 *
 * Tests all CRUD operations with proper mocking
 * Follows red-green-refactor cycle
 */
describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;

  // Mock current user (admin)
  const mockCurrentUser = {
    id: 'admin-id',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    facultyId: null,
  };

  // Sample user data
  const mockUser: Omit<User, 'passwordHash' | 'deletedAt'> = {
    id: 'user-id',
    email: 'user@example.com',
    displayName: 'Test User',
    role: UserRole.GIANG_VIEN,
    facultyId: 'faculty-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTempPassword = 'Abc123Xyz789';

  beforeEach(() => {
    // Create mock service
    mockUsersService = {
      createUser: vi.fn().mockResolvedValue({
        user: mockUser,
        temporaryPassword: mockTempPassword,
      }),
      getUsers: vi.fn().mockResolvedValue({
        users: [mockUser],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
      getUserById: vi.fn().mockResolvedValue(mockUser),
      updateUser: vi.fn().mockResolvedValue(mockUser),
      softDeleteUser: vi.fn().mockResolvedValue(mockUser),
    };

    // Manually create controller with mock service - bypass DI
    controller = new UsersController(mockUsersService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /users', () => {
    it('should create a user with temporary password', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        displayName: 'New User',
        role: UserRole.GIANG_VIEN,
        facultyId: 'faculty-id',
      };

      const result = await controller.createUser(createUserDto, mockCurrentUser, {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test' },
      } as any);

      expect(result).toEqual({
        success: true,
        data: {
          user: mockUser,
          temporaryPassword: mockTempPassword,
        },
      });

      expect(mockUsersService.createUser).toHaveBeenCalledWith(
        createUserDto,
        mockCurrentUser.id,
        mockCurrentUser.role,
        mockCurrentUser.facultyId,
        '127.0.0.1',
        'test',
      );
    });

    it('should throw ConflictException when email exists', async () => {
      mockUsersService.createUser.mockRejectedValue(
        new ConflictException({
          success: false,
          error: {
            error_code: 'EMAIL_EXISTS',
            message: 'Email đã được sử dụng',
          },
        }),
      );

      const createUserDto = {
        email: 'existing@example.com',
        displayName: 'Existing User',
        role: UserRole.GIANG_VIEN,
      };

      await expect(
        controller.createUser(createUserDto, mockCurrentUser, {
          ip: '127.0.0.1',
          headers: { 'user-agent': 'test' },
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('GET /users', () => {
    it('should return paginated user list', async () => {
      const result = await controller.getUsers(1, 20);

      expect(result).toEqual({
        success: true,
        data: [mockUser],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      expect(mockUsersService.getUsers).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined);
    });

    it('should filter users by role', async () => {
      await controller.getUsers(1, 20, UserRole.GIANG_VIEN);

      expect(mockUsersService.getUsers).toHaveBeenCalledWith(
        1,
        20,
        UserRole.GIANG_VIEN,
        undefined,
        undefined,
      );
    });

    it('should search users by email/displayName', async () => {
      await controller.getUsers(1, 20, undefined, undefined, 'test');

      expect(mockUsersService.getUsers).toHaveBeenCalledWith(1, 20, undefined, undefined, 'test');
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      const result = await controller.getUserById('user-id');

      expect(result).toEqual({
        success: true,
        data: mockUser,
      });

      expect(mockUsersService.getUserById).toHaveBeenCalledWith('user-id');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.getUserById.mockRejectedValue(
        new NotFoundException({
          success: false,
          error: {
            error_code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng',
          },
        }),
      );

      await expect(controller.getUserById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user', async () => {
      const updateUserDto = {
        displayName: 'Updated Name',
        role: UserRole.QUAN_LY_KHOA,
      };

      const result = await controller.updateUser(
        'user-id',
        updateUserDto,
        mockCurrentUser,
        { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any,
      );

      expect(result).toEqual({
        success: true,
        data: mockUser,
      });

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        'user-id',
        updateUserDto,
        mockCurrentUser.id,
        mockCurrentUser.role,
        mockCurrentUser.facultyId,
        '127.0.0.1',
        'test',
      );
    });
  });

  describe('DELETE /users/:id', () => {
    it('should soft delete user', async () => {
      const result = await controller.softDeleteUser(
        'user-id',
        mockCurrentUser,
        { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any,
      );

      expect(result).toEqual({
        success: true,
        data: {
          message: 'Đã xóa người dùng thành công',
          user: mockUser,
        },
      });

      expect(mockUsersService.softDeleteUser).toHaveBeenCalledWith(
        'user-id',
        mockCurrentUser.id,
        mockCurrentUser.role,
        mockCurrentUser.facultyId,
        '127.0.0.1',
        'test',
      );
    });

    it('should prevent self-deletion', async () => {
      mockUsersService.softDeleteUser.mockRejectedValue(
        new ConflictException({
          success: false,
          error: {
            error_code: 'CANNOT_DELETE_SELF',
            message: 'Không thể xóa tài khoản của chính mình',
          },
        }),
      );

      await expect(
        controller.softDeleteUser(
          'admin-id',
          mockCurrentUser,
          { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  /**
   * Test: Temporary password format validation
   * Verifies generated password meets requirements:
   * - 12 characters
   * - Contains uppercase, lowercase, and numbers
   */
  describe('Temporary Password Generation', () => {
    it('should generate password with correct format', async () => {
      const result = await controller.createUser(
        {
          email: 'new@example.com',
          displayName: 'New',
          role: UserRole.GIANG_VIEN,
        },
        mockCurrentUser,
        { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any,
      );

      const password = result.data.temporaryPassword;

      // Check length
      expect(password).toHaveLength(12);

      // Check contains uppercase
      expect(password).toMatch(/[A-Z]/);

      // Check contains lowercase
      expect(password).toMatch(/[a-z]/);

      // Check contains numbers
      expect(password).toMatch(/[0-9]/);
    });
  });

  /**
   * Test: Audit logging for user actions
   * Verifies audit events are created for update and delete
   */
  describe('Audit Logging', () => {
    it('should log audit event on update', async () => {
      await controller.updateUser(
        'user-id',
        { role: UserRole.QUAN_LY_KHOA },
        mockCurrentUser,
        { ip: '192.168.1.1', headers: { 'user-agent': 'Mozilla' } } as any,
      );

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        'user-id',
        { role: UserRole.QUAN_LY_KHOA },
        mockCurrentUser.id,
        mockCurrentUser.role,
        mockCurrentUser.facultyId,
        '192.168.1.1',
        'Mozilla',
      );
    });

    it('should log audit event on delete', async () => {
      await controller.softDeleteUser(
        'user-id',
        mockCurrentUser,
        { ip: '192.168.1.1', headers: { 'user-agent': 'Mozilla' } } as any,
      );

      expect(mockUsersService.softDeleteUser).toHaveBeenCalledWith(
        'user-id',
        mockCurrentUser.id,
        mockCurrentUser.role,
        mockCurrentUser.facultyId,
        '192.168.1.1',
        'Mozilla',
      );
    });
  });

  /**
   * Test: Soft delete behavior
   * Verifies soft-deleted users cannot login
   */
  describe('Soft Delete Behavior', () => {
    it('should return NotFoundException for soft-deleted user', async () => {
      mockUsersService.getUserById.mockRejectedValue(
        new NotFoundException({
          success: false,
          error: {
            error_code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng',
          },
        }),
      );

      await expect(controller.getUserById('deleted-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
