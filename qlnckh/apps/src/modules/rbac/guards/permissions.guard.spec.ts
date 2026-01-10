import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from '../permissions.enum';
import { UserRole } from '@prisma/client';
import { RbacService } from '../rbac.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let rbacService: RbacService;

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const mockRbacService = {
    hasAllPermissions: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    guard = new PermissionsGuard(
      mockReflector as unknown as Reflector,
      mockRbacService as unknown as RbacService,
    );

    reflector = mockReflector as unknown as Reflector;
    rbacService = mockRbacService as unknown as RbacService;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockExecutionContext: ExecutionContext;

    beforeEach(() => {
      mockExecutionContext = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: {
              id: 'user-123',
              role: UserRole.ADMIN,
            },
          }),
        }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as unknown as ExecutionContext;
    });

    it('should allow access if no permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRbacService.hasAllPermissions).not.toHaveBeenCalled();
    });

    it('should allow access if empty permissions array', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access if user has all required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.USER_MANAGE]);
      mockRbacService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRbacService.hasAllPermissions).toHaveBeenCalledWith(
        UserRole.ADMIN,
        [Permission.USER_MANAGE],
      );
    });

    it('should throw ForbiddenException if user lacks permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.USER_MANAGE]);
      mockRbacService.hasAllPermissions.mockResolvedValue(false);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect(error.response).toEqual({
          success: false,
          error: {
            error_code: 'FORBIDDEN',
            message: 'Bạn không có quyền thực hiện hành động này',
            required_permissions: [Permission.USER_MANAGE],
          },
        });
      }
    });

    it('should throw ForbiddenException if no user in request', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.USER_MANAGE]);

      const contextWithoutUser = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({}),
        }),
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(contextWithoutUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should check permissions for multiple required permissions', async () => {
      const requiredPermissions = [Permission.USER_MANAGE, Permission.DEMO_RESET];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);
      mockRbacService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRbacService.hasAllPermissions).toHaveBeenCalledWith(
        UserRole.ADMIN,
        requiredPermissions,
      );
    });
  });
});
