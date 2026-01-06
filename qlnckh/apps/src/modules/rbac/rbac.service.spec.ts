import { RbacService } from './rbac.service';
import { Permission } from './permissions.enum';
import { UserRole } from '@prisma/client';

describe('RbacService', () => {
  let service: RbacService;

  // Manual mock - bypass DI
  const mockPrisma = {
    rolePermission: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    // Manually create service with mock prisma - bypass DI
    service = new RbacService(mockPrisma as any);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPermissions', () => {
    it('should return permissions for a given role', async () => {
      const mockPermissions = [
        { permission: Permission.USER_MANAGE },
        { permission: Permission.CALENDAR_MANAGE },
      ];

      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getUserPermissions(UserRole.ADMIN);

      expect(result).toEqual([Permission.USER_MANAGE, Permission.CALENDAR_MANAGE]);
      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
        select: { permission: true },
      });
    });

    it('should return empty array if role has no permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissions(UserRole.GIANG_VIEN);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockPrisma.rolePermission.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getUserPermissions(UserRole.ADMIN);

      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true if role has the permission', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
      ]);

      const result = await service.hasPermission(UserRole.ADMIN, Permission.USER_MANAGE);

      expect(result).toBe(true);
    });

    it('should return false if role does not have the permission', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.hasPermission(UserRole.GIANG_VIEN, Permission.USER_MANAGE);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if role has at least one of the permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
      ]);

      const result = await service.hasAnyPermission(UserRole.ADMIN, [
        Permission.USER_MANAGE,
        Permission.DEMO_RESET,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if role has none of the permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.hasAnyPermission(UserRole.GIANG_VIEN, [
        Permission.USER_MANAGE,
        Permission.DEMO_RESET,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if role has all permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
        { permission: Permission.DEMO_RESET },
      ]);

      const result = await service.hasAllPermissions(UserRole.ADMIN, [
        Permission.USER_MANAGE,
        Permission.DEMO_RESET,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if role is missing any permission', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
      ]);

      const result = await service.hasAllPermissions(UserRole.ADMIN, [
        Permission.USER_MANAGE,
        Permission.DEMO_RESET,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true if roles match', () => {
      const result = service.hasRole(UserRole.ADMIN, UserRole.ADMIN);

      expect(result).toBe(true);
    });

    it('should return false if roles do not match', () => {
      const result = service.hasRole(UserRole.GIANG_VIEN, UserRole.ADMIN);

      expect(result).toBe(false);
    });
  });

  describe('getPermissionsForUser', () => {
    it('should return permissions as string array', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
        { permission: Permission.CALENDAR_MANAGE },
      ]);

      const result = await service.getPermissionsForUser(UserRole.ADMIN);

      expect(result).toEqual([Permission.USER_MANAGE, Permission.CALENDAR_MANAGE]);
      expect(result).toEqual(['USER_MANAGE', 'CALENDAR_MANAGE']);
    });

    it('should return empty array if no permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.getPermissionsForUser(UserRole.GIANG_VIEN);

      expect(result).toEqual([]);
    });
  });
});
