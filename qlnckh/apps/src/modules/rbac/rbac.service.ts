import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { Permission } from './permissions.enum';
import { UserRole } from '@prisma/client';

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
}
