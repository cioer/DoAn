import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { Permission } from './permissions.enum';
import { UserRole, Permission as PrismaPermission } from '@prisma/client';

/**
 * Permission cache entry with TTL
 */
interface CacheEntry {
  permissions: Permission[];
  expiresAt: number;
}

/**
 * RBAC Service
 *
 * Handles permission checking logic for Role-Based Access Control.
 * Provides methods to check user permissions based on their role.
 *
 * Features:
 * - In-memory caching with 5-minute TTL
 * - Type-safe permission checks
 * - Database-backed permission storage
 */
@Injectable()
export class RbacService implements OnModuleInit {
  private readonly logger = new Logger(RbacService.name);
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private permissionCache: Map<UserRole, CacheEntry> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Clear expired cache entries
   * Called periodically to clean up stale data
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [role, entry] of this.permissionCache.entries()) {
      if (entry.expiresAt < now) {
        this.permissionCache.delete(role);
      }
    }
  }

  /**
   * Get all permissions for a given role (with caching)
   * @param role - User role to get permissions for
   * @returns Array of permissions assigned to the role
   */
  async getUserPermissions(role: UserRole): Promise<Permission[]> {
    // Clean expired cache entries periodically
    this.cleanExpiredCache();

    // Check cache first
    const cached = this.permissionCache.get(role);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    // Fetch from database
    try {
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { role },
        select: { permission: true },
      });

      const permissions = rolePermissions.map((rp) => rp.permission as Permission);

      // Store in cache
      this.permissionCache.set(role, {
        permissions,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return permissions;
    } catch (error) {
      this.logger.error(`Error getting permissions for role ${role}: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Clear permission cache for a specific role
   * Call this after updating role permissions
   * @param role - Role to clear cache for
   */
  clearCacheForRole(role: UserRole): void {
    this.permissionCache.delete(role);
  }

  /**
   * Clear entire permission cache
   * Call this after bulk permission updates
   */
  clearAllCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Module initialization hook
   */
  onModuleInit(): void {
    this.logger.log('RBAC Service initialized with permission caching');
  }

  /**
   * Check if a role has a specific permission
   * @param role - User role to check
   * @param permission - Permission to check for
   * @returns True if role has the permission
   */
  async hasPermission(role: UserRole, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(role);
    return permissions.includes(permission);
  }

  /**
   * Check if a role has any of the specified permissions
   * @param role - User role to check
   * @param permissions - Array of permissions to check
   * @returns True if role has at least one of the permissions
   */
  async hasAnyPermission(role: UserRole, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(role);
    return permissions.some((permission) => userPermissions.includes(permission));
  }

  /**
   * Check if a role has all of the specified permissions
   * @param role - User role to check
   * @param permissions - Array of permissions to check
   * @returns True if role has all of the permissions
   */
  async hasAllPermissions(role: UserRole, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(role);
    return permissions.every((permission) => userPermissions.includes(permission));
  }

  /**
   * Check if a role matches the given role
   * @param userRole - User's role
   * @param role - Role to check against
   * @returns True if roles match
   */
  hasRole(userRole: UserRole, role: UserRole): boolean {
    return userRole === role;
  }

  /**
   * Get all permissions for a user (includes role-based permissions)
   * This is a convenience method for frontend responses
   * @param role - User role
   * @returns Array of permission strings
   */
  async getPermissionsForUser(role: UserRole): Promise<string[]> {
    const permissions = await this.getUserPermissions(role);
    return permissions.map((p) => p as string);
  }

  /**
   * Seed default permissions for all roles
   * This should be called to initialize the permission system
   * @returns Summary of seeded permissions
   */
  async seedPermissions(): Promise<{ role: string; permissions: string[] }[]> {
    this.logger.log('Starting permission seeding...');

    // Define permissions for each role using Prisma's Permission enum
    const rolePermissions: Record<UserRole, PrismaPermission[]> = {
      // ADMIN gets all permissions
      [UserRole.ADMIN]: Object.values(PrismaPermission),

      // PHONG_KHCN - Science & Technology Department
      [UserRole.PHONG_KHCN]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.CALENDAR_MANAGE,
        PrismaPermission.AUDIT_VIEW,
        PrismaPermission.USER_MANAGE,
        PrismaPermission.FORM_TEMPLATE_IMPORT,
        PrismaPermission.DEMO_SWITCH_PERSONA,
        PrismaPermission.DEMO_RESET,
      ],

      // QUAN_LY_KHOA - Faculty Manager
      [UserRole.QUAN_LY_KHOA]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.FACULTY_DASHBOARD_VIEW,
        PrismaPermission.FACULTY_APPROVE,
        PrismaPermission.FACULTY_RETURN,
        PrismaPermission.PROPOSAL_VIEW_FACULTY,
        PrismaPermission.FACULTY_USER_MANAGE,
      ],

      // GIANG_VIEN - Lecturer/PI
      [UserRole.GIANG_VIEN]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.PROPOSAL_CREATE,
        PrismaPermission.PROPOSAL_EDIT,
        PrismaPermission.VIEW_EVALUATION_RESULTS,
        PrismaPermission.EXPORT_PROPOSAL_PDF,
      ],

      // HOI_DONG - Council Member
      [UserRole.HOI_DONG]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.VIEW_EVALUATION_RESULTS,
      ],

      // THU_KY_HOI_DONG - Council Secretary
      [UserRole.THU_KY_HOI_DONG]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.CALENDAR_MANAGE,
        PrismaPermission.VIEW_EVALUATION_RESULTS,
      ],

      // BAN_GIAM_HOC - Board of Directors
      [UserRole.BAN_GIAM_HOC]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.AUDIT_VIEW,
      ],

      // BGH - Legacy Board of Directors
      [UserRole.BGH]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.AUDIT_VIEW,
      ],

      // THU_KY_KHOA - Faculty Secretary
      [UserRole.THU_KY_KHOA]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.FACULTY_DASHBOARD_VIEW,
        PrismaPermission.PROPOSAL_VIEW_FACULTY,
      ],

      // THANH_TRUNG - Evaluation Committee
      [UserRole.THANH_TRUNG]: [
        PrismaPermission.DASHBOARD_VIEW,
        PrismaPermission.VIEW_EVALUATION_RESULTS,
      ],
    };

    const results: { role: string; permissions: string[] }[] = [];

    for (const [role, permissions] of Object.entries(rolePermissions)) {
      // Delete existing permissions for this role
      await this.prisma.rolePermission.deleteMany({
        where: { role: role as UserRole },
      });

      // Insert new permissions
      if (permissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissions.map((permission) => ({
            role: role as UserRole,
            permission,
          })),
          skipDuplicates: true,
        });
      }

      results.push({
        role,
        permissions: permissions as string[],
      });

      this.logger.log(`Seeded ${permissions.length} permissions for role ${role}`);
    }

    // Clear all cache after seeding
    this.clearAllCache();

    this.logger.log('Permission seeding completed');
    return results;
  }
}
