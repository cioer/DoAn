/**
 * Faculty Permissions Integration Tests
 *
 * Integration tests for new faculty-related permissions:
 * - FACULTY_APPROVE
 * - FACULTY_RETURN
 * - PROPOSAL_VIEW_FACULTY
 * - FACULTY_DASHBOARD_VIEW
 * - FACULTY_USER_MANAGE
 */
import { RbacService } from '../rbac.service';
import { Permission } from '../permissions.enum';
import { UserRole } from '@prisma/client';

describe('RbacService - Faculty Permissions Integration', () => {
  let service: RbacService;

  const mockPrisma = {
    rolePermission: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    service = new RbacService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('FACULTY_APPROVE Permission', () => {
    it('should grant FACULTY_APPROVE to QUAN_LY_KHOA role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.FACULTY_APPROVE },
        { permission: Permission.PROPOSAL_VIEW_FACULTY },
      ]);

      const result = await service.hasPermission(UserRole.QUAN_LY_KHOA, Permission.FACULTY_APPROVE);

      expect(result).toBe(true);
    });

    it('should not grant FACULTY_APPROVE to GIANG_VIEN role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.PROPOSAL_CREATE },
      ]);

      const result = await service.hasPermission(UserRole.GIANG_VIEN, Permission.FACULTY_APPROVE);

      expect(result).toBe(false);
    });

    it('should not grant FACULTY_APPROVE to ADMIN role by default', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.USER_MANAGE },
      ]);

      const result = await service.hasPermission(UserRole.ADMIN, Permission.FACULTY_APPROVE);

      expect(result).toBe(false);
    });
  });

  describe('FACULTY_RETURN Permission', () => {
    it('should grant FACULTY_RETURN to QUAN_LY_KHOA role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.FACULTY_RETURN },
      ]);

      const result = await service.hasPermission(UserRole.QUAN_LY_KHOA, Permission.FACULTY_RETURN);

      expect(result).toBe(true);
    });

    it('should not grant FACULTY_RETURN to GIANG_VIEN role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.PROPOSAL_CREATE },
      ]);

      const result = await service.hasPermission(UserRole.GIANG_VIEN, Permission.FACULTY_RETURN);

      expect(result).toBe(false);
    });
  });

  describe('PROPOSAL_VIEW_FACULTY Permission', () => {
    it('should grant PROPOSAL_VIEW_FACULTY to QUAN_LY_KHOA role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.PROPOSAL_VIEW_FACULTY },
      ]);

      const result = await service.hasPermission(UserRole.QUAN_LY_KHOA, Permission.PROPOSAL_VIEW_FACULTY);

      expect(result).toBe(true);
    });
  });

  describe('FACULTY_DASHBOARD_VIEW Permission', () => {
    it('should grant FACULTY_DASHBOARD_VIEW to QUAN_LY_KHOA role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.FACULTY_DASHBOARD_VIEW },
      ]);

      const result = await service.hasPermission(UserRole.QUAN_LY_KHOA, Permission.FACULTY_DASHBOARD_VIEW);

      expect(result).toBe(true);
    });

    it('should return all faculty permissions for QUAN_LY_KHOA', async () => {
      const expectedPermissions = [
        Permission.FACULTY_APPROVE,
        Permission.FACULTY_RETURN,
        Permission.PROPOSAL_VIEW_FACULTY,
        Permission.FACULTY_DASHBOARD_VIEW,
        Permission.FACULTY_USER_MANAGE,
      ];

      mockPrisma.rolePermission.findMany.mockResolvedValue(
        expectedPermissions.map((p) => ({ permission: p }))
      );

      const result = await service.getUserPermissions(UserRole.QUAN_LY_KHOA);

      expect(result).toEqual(expect.arrayContaining(expectedPermissions));
      expect(result).toHaveLength(5); // Assuming DEMO_SWITCH_PERSONA also exists
    });
  });

  describe('FACULTY_USER_MANAGE Permission', () => {
    it('should grant FACULTY_USER_MANAGE to QUAN_LY_KHOA role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.FACULTY_USER_MANAGE },
      ]);

      const result = await service.hasPermission(UserRole.QUAN_LY_KHOA, Permission.FACULTY_USER_MANAGE);

      expect(result).toBe(true);
    });

    it('should not grant FACULTY_USER_MANAGE to GIANG_VIEN role', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.hasPermission(UserRole.GIANG_VIEN, Permission.FACULTY_USER_MANAGE);

      expect(result).toBe(false);
    });

    it('should distinguish between USER_MANAGE and FACULTY_USER_MANAGE', async () => {
      // ADMIN has USER_MANAGE but not FACULTY_USER_MANAGE
      mockPrisma.rolePermission.findMany
        .mockResolvedValueOnce([{ permission: Permission.USER_MANAGE }]) // ADMIN
        .mockResolvedValueOnce([{ permission: Permission.FACULTY_USER_MANAGE }]); // QUAN_LY_KHOA

      const adminHasUserManage = await service.hasPermission(UserRole.ADMIN, Permission.USER_MANAGE);
      const adminHasFacultyUserManage = await service.hasPermission(UserRole.ADMIN, Permission.FACULTY_USER_MANAGE);

      expect(adminHasUserManage).toBe(true);
      expect(adminHasFacultyUserManage).toBe(false);
    });
  });

  describe('hasAnyPermission with faculty permissions', () => {
    it('should return true if QUAN_LY_KHOA has any faculty permission', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.FACULTY_APPROVE },
      ]);

      const result = await service.hasAnyPermission(UserRole.QUAN_LY_KHOA, [
        Permission.FACULTY_APPROVE,
        Permission.FACULTY_RETURN,
        Permission.PROPOSAL_VIEW_FACULTY,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if QUAN_LY_KHOA has none of the checked permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: Permission.PROPOSAL_CREATE }, // Different permission
      ]);

      const result = await service.hasAnyPermission(UserRole.QUAN_LY_KHOA, [
        Permission.FACULTY_APPROVE,
        Permission.FACULTY_RETURN,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('Permission enum completeness', () => {
    it('should include all 5 new faculty permissions', () => {
      expect(Permission.FACULTY_APPROVE).toBe('FACULTY_APPROVE');
      expect(Permission.FACULTY_RETURN).toBe('FACULTY_RETURN');
      expect(Permission.PROPOSAL_VIEW_FACULTY).toBe('PROPOSAL_VIEW_FACULTY');
      expect(Permission.FACULTY_DASHBOARD_VIEW).toBe('FACULTY_DASHBOARD_VIEW');
      expect(Permission.FACULTY_USER_MANAGE).toBe('FACULTY_USER_MANAGE');
    });
  });
});
