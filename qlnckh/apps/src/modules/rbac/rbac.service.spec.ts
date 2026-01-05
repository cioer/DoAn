import { Test, TestingModule } from '@nestjs/testing';
import { RbacService } from './rbac.service';
import { PrismaService } from '../auth/prisma.service';
import { Permission } from './permissions.enum';
import { UserRole } from '@prisma/client';

describe('RbacService', () => {
  let service: RbacService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    rolePermission: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    prismaService = module.get<PrismaService>(PrismaService);

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

      mockPrismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getUserPermissions(UserRole.ADMIN);

      expect(result).toEqual([Permission.USER_MANAGE, Permission.CALENDAR_MANAGE]);
      expect(prismaService.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
        select: { permission: true },
      });
    });

    it('should return empty array if role has no permissions', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissions(UserRole.GIANG_VIEN);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockPrismaService.rolePermission.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getUserPermissions(UserRole.ADMIN);

      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true if role has the permission', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
      ]);

      const result = await service.hasPermission(UserRole.ADMIN, Permission.USER_MANAGE);

      expect(result).toBe(true);
    });

    it('should return false if role does not have the permission', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.hasPermission(UserRole.GIANG_VIEN, Permission.USER_MANAGE);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if role has at least one of the permissions', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
      ]);

      const result = await service.hasAnyPermission(UserRole.ADMIN, [
        Permission.USER_MANAGE,
        Permission.DEMO_RESET,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if role has none of the permissions', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.hasAnyPermission(UserRole.GIANG_VIEN, [
        Permission.USER_MANAGE,
        Permission.DEMO_RESET,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if role has all permissions', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
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
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
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
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
        { permission: Permission.CALENDAR_MANAGE },
      ]);

      const result = await service.getPermissionsForUser(UserRole.ADMIN);

      expect(result).toEqual([Permission.USER_MANAGE, Permission.CALENDAR_MANAGE]);
      expect(result).toEqual(['USER_MANAGE', 'CALENDAR_MANAGE']);
    });

    it('should return empty array if no permissions', async () => {
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.getPermissionsForUser(UserRole.GIANG_VIEN);

      expect(result).toEqual([]);
    });
  });
});
