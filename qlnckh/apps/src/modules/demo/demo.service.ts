import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../auth/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { Permission } from '../rbac/permissions.enum';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import {
  DEMO_PERSONAS,
  getPersonaById,
  isDemoPersona,
} from './constants/demo-personas';
import {
  SwitchPersonaResponse,
  DemoModeConfigResponse,
  DemoPersonaResponse,
  ResetDemoResponse,
  ResetDemoCounts,
} from './entities/demo-persona.entity';
import {
  DEMO_FACULTIES,
  DEMO_USERS,
  DEMO_PROPOSALS,
  DEMO_HOLIDAYS,
  DEMO_ROLE_PERMISSIONS,
  type DemoWorkflowLog,
} from '../../seeds/demo-seed-data.constants';

/**
 * Audit context interface
 * Passed from controller to service for audit logging
 */
export interface AuditContext {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Demo Service
 *
 * Handles demo mode functionality including:
 * - Demo mode configuration check
 * - Persona switching for demo operators
 * - Audit logging for persona switches
 * - Idempotency validation to prevent duplicate switches
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  // In-memory idempotency tracking (TODO: Replace with Redis when configured)
  private readonly idempotencyCache = new Map<string, { timestamp: number; result: SwitchPersonaResponse }>();
  private readonly IDEMPOTENCY_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private rbacService: RbacService,
    private configService: ConfigService,
    @Optional() private auditService?: AuditService,
  ) {}

  /**
   * Check if demo mode is enabled
   */
  isDemoModeEnabled(): boolean {
    return this.configService.get<string>('DEMO_MODE') === 'true';
  }

  /**
   * Get demo mode configuration including available personas
   * Only returns personas when demo mode is enabled
   */
  async getDemoModeConfig(): Promise<DemoModeConfigResponse> {
    const enabled = this.isDemoModeEnabled();

    const personas: DemoPersonaResponse[] = enabled
      ? DEMO_PERSONAS.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          description: p.description,
        }))
      : [];

    return {
      enabled,
      personas,
    };
  }

  /**
   * Switch to a different persona in demo mode
   *
   * @param actorUserId - The real user ID (person performing the switch)
   * @param targetUserId - The persona user ID to switch to
   * @param auditContext - Audit context for logging
   * @param idempotencyKey - Optional key to prevent duplicate switches
   * @returns Switch response with both user and actingAs
   */
  async switchPersona(
    actorUserId: string,
    targetUserId: string,
    auditContext?: AuditContext,
    idempotencyKey?: string,
  ): Promise<SwitchPersonaResponse> {
    // Check if demo mode is enabled
    if (!this.isDemoModeEnabled()) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'DEMO_MODE_DISABLED',
          message: 'Chế độ demo không được bật',
        },
      });
    }

    // Validate target user is a demo persona
    if (!isDemoPersona(targetUserId)) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'INVALID_DEMO_PERSONA',
          message: 'Người dùng không phải là demo persona hợp lệ',
        },
      });
    }

    // Check idempotency - prevent duplicate switches
    if (idempotencyKey) {
      const cached = this.idempotencyCache.get(idempotencyKey);
      if (cached && Date.now() - cached.timestamp < this.IDEMPOTENCY_TTL) {
        this.logger.log(`Returning cached result for idempotency key: ${idempotencyKey}`);
        return cached.result;
      }
    }

    // Get the target persona user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PERSONA_NOT_FOUND',
          message: 'Không tìm thấy persona trong hệ thống',
        },
      });
    }

    // Get the actor user (real user)
    const actorUser = await this.prisma.user.findUnique({
      where: { id: actorUserId },
    });

    if (!actorUser) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Không tìm thấy người dùng',
        },
      });
    }

    // Get permissions for both users
    const actorPermissions = await this.rbacService.getUserPermissions(
      actorUser.role,
    );
    const targetPermissions = await this.rbacService.getUserPermissions(
      targetUser.role,
    );

    // Log the persona switch audit event
    if (this.auditService) {
      await this.auditService.logEvent({
        action: AuditAction.DEMO_PERSONA_SWITCH,
        actorUserId: actorUserId,
        actingAsUserId: targetUserId,
        entityType: 'users',
        entityId: targetUserId,
        metadata: {
          from_role: actorUser.role,
          to_role: targetUser.role,
          from_user_id: actorUserId,
          to_user_id: targetUserId,
          actor_display_name: actorUser.displayName,
          target_display_name: targetUser.displayName,
          idempotency_key: idempotencyKey,
        },
        ...auditContext,
      });
    }

    this.logger.log(
      `User ${actorUserId} switched to persona ${targetUserId} (${targetUser.displayName})`,
    );

    // Build response
    const result: SwitchPersonaResponse = {
      user: {
        id: actorUser.id,
        displayName: actorUser.displayName,
        email: actorUser.email,
        role: actorUser.role,
        facultyId: actorUser.facultyId,
        permissions: actorPermissions,
      },
      actingAs: {
        id: targetUser.id,
        displayName: targetUser.displayName,
        email: targetUser.email,
        role: targetUser.role,
        facultyId: targetUser.facultyId,
        permissions: targetPermissions,
      },
    };

    // Cache result for idempotency (TODO: Replace with Redis when configured)
    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, {
        timestamp: Date.now(),
        result,
      });

      // Clean up expired entries periodically (simple cleanup)
      if (this.idempotencyCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of this.idempotencyCache.entries()) {
          if (now - value.timestamp > this.IDEMPOTENCY_TTL) {
            this.idempotencyCache.delete(key);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get a demo persona by ID
   * Returns null if not found or demo mode disabled
   */
  getPersonaById(userId: string): DemoPersonaResponse | null {
    if (!this.isDemoModeEnabled()) {
      return null;
    }

    const persona = getPersonaById(userId);
    if (!persona) {
      return null;
    }

    return {
      id: persona.id,
      name: persona.name,
      role: persona.role,
      description: persona.description,
    };
  }

  /**
   * Get current persona for a user
   * In demo mode, this can be different from the logged-in user
   *
   * @param userId - The acting-as user ID (from session)
   * @param originalUserId - The original logged-in user ID
   * @returns User info with permissions
   */
  async getCurrentPersona(
    userId: string,
    originalUserId?: string,
  ): Promise<SwitchPersonaResponse | null> {
    if (!this.isDemoModeEnabled()) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const permissions = await this.rbacService.getUserPermissions(user.role);

    // If originalUserId is provided and different, return both
    if (originalUserId && originalUserId !== userId) {
      const originalUser = await this.prisma.user.findUnique({
        where: { id: originalUserId },
      });

      if (originalUser) {
        const originalPermissions =
          await this.rbacService.getUserPermissions(originalUser.role);

        return {
          user: {
            id: originalUser.id,
            displayName: originalUser.displayName,
            email: originalUser.email,
            role: originalUser.role,
            facultyId: originalUser.facultyId,
            permissions: originalPermissions,
          },
          actingAs: {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            facultyId: user.facultyId,
            permissions,
          },
        };
      }
    }

    // Only return acting-as if the user is a demo persona
    if (isDemoPersona(userId)) {
      return {
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          facultyId: user.facultyId,
          permissions,
        },
        actingAs: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          facultyId: user.facultyId,
          permissions,
        },
      };
    }

    return null;
  }

  /**
   * Reset demo data and reseed
   * Only available in APP_MODE=demo environment
   * Resets all demo data and runs seed pipeline to recreate it
   *
   * @param actorUserId - User ID performing the reset
   * @param auditContext - Audit context for logging
   * @returns Reset confirmation with counts and duration
   */
  async resetDemo(
    actorUserId: string,
    auditContext?: AuditContext,
  ): Promise<ResetDemoResponse> {
    const appMode = this.configService.get<string>('APP_MODE');

    // Security check: Only allow in demo environment
    if (appMode !== 'demo') {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint không tồn tại',
        },
      });
    }

    const startTime = Date.now();

    // Use transaction for atomic reset
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete workflow logs
      await tx.workflowLog.deleteMany({});

      // 2. Delete proposals
      await tx.proposal.deleteMany({});

      // 3. Delete business calendar entries
      await tx.businessCalendar.deleteMany({});

      // 4. Delete role permissions (for demo roles only)
      const demoRoles: UserRole[] = [
        UserRole.GIANG_VIEN,
        UserRole.QUAN_LY_KHOA,
        UserRole.THU_KY_KHOA,
        UserRole.PHONG_KHCN,
        UserRole.THU_KY_HOI_DONG,
        UserRole.THANH_TRUNG,
        UserRole.BAN_GIAM_HOC,
      ];
      await tx.rolePermission.deleteMany({
        where: { role: { in: demoRoles } },
      });

      // 5. Delete demo users (DT-USER-XXX)
      await tx.user.deleteMany({
        where: {
          id: { startsWith: 'DT-USER-' },
        },
      });

      // 6. Delete demo faculties (FAC-XXX)
      await tx.faculty.deleteMany({
        where: {
          code: { startsWith: 'FAC-' },
        },
      });
    });

    // Reseed data
    const [facultyCount, userCount, proposalCount, holidayCount, permissionCount] =
      await Promise.all([
        this.seedFaculties(),
        this.seedUsers(),
        this.seedProposals(),
        this.seedBusinessCalendar(),
        this.seedRolePermissions(),
      ]);

    const duration = Date.now() - startTime;

    // Log audit event
    if (this.auditService) {
      await this.auditService.logEvent({
        action: AuditAction.DEMO_RESET,
        actorUserId: actorUserId,
        entityType: 'demo',
        entityId: 'demo-reset',
        metadata: {
          duration,
          counts: {
            users: userCount,
            faculties: facultyCount,
            proposals: proposalCount,
            holidays: holidayCount,
            permissions: permissionCount,
          },
        },
        ...auditContext,
      });
    }

    this.logger.log(`Demo reset completed in ${duration}ms`);

    return {
      message: 'Đã reset demo thành công',
      counts: {
        users: userCount,
        faculties: facultyCount,
        proposals: proposalCount,
        holidays: holidayCount,
        permissions: permissionCount,
      },
      duration,
    };
  }

  // ============================================================
  // SEEDING HELPERS (shared with demo.seed.ts)
  // ============================================================

  /**
   * DNS namespace for UUID v5 (RFC 4122)
   */
  private readonly DEMO_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  /**
   * Generate deterministic UUID v5
   */
  private generateUUIDv5(namespace: string, name: string): string {
    const namespaceBytes = this.uuidToBytes(namespace);
    const nameBytes = Buffer.from(name, 'utf8');
    const combined = Buffer.concat([namespaceBytes, nameBytes]);
    const hash = crypto.createHash('sha1').update(combined).digest();
    const bytes = Buffer.from(hash);
    bytes[6] = (bytes[6]! & 0x0f) | 0x50; // Version 5
    bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant
    return this.bytesToUuid(bytes);
  }

  private uuidToBytes(uuid: string): Buffer {
    const hex = uuid.replace(/-/g, '');
    const buffer = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      buffer[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return buffer;
  }

  private bytesToUuid(buffer: Buffer): string {
    const hex = buffer.toString('hex');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32),
    ].join('-');
  }

  /**
   * Seed faculties
   */
  private async seedFaculties(): Promise<number> {
    for (const faculty of DEMO_FACULTIES) {
      const deterministicId = this.generateUUIDv5(this.DEMO_NAMESPACE, `faculty-${faculty.code}`);
      await this.prisma.faculty.upsert({
        where: { code: faculty.code },
        update: {},
        create: {
          id: deterministicId,
          code: faculty.code,
          name: faculty.name,
          type: faculty.type,
        },
      });
    }
    return DEMO_FACULTIES.length;
  }

  /**
   * Seed users
   */
  private async seedUsers(): Promise<number> {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('Demo@123', 10);

    // Get faculty IDs for mapping
    const faculties = await this.prisma.faculty.findMany();
    const facultyMap = new Map(faculties.map((f) => [f.code, f.id]));

    for (const userData of DEMO_USERS) {
      const facultyId = userData.facultyCode ? facultyMap.get(userData.facultyCode) : null;

      await this.prisma.user.upsert({
        where: { id: userData.id },
        update: {},
        create: {
          id: userData.id,
          email: userData.email,
          passwordHash: hashedPassword,
          displayName: userData.displayName,
          role: userData.role,
          facultyId,
        },
      });
    }
    return DEMO_USERS.length;
  }

  /**
   * Seed role permissions
   */
  private async seedRolePermissions(): Promise<number> {
    let count = 0;
    for (const rp of DEMO_ROLE_PERMISSIONS) {
      try {
        await this.prisma.rolePermission.upsert({
          where: {
            role_permission: {
              role: rp.role,
              permission: rp.permission as any,
            },
          },
          create: {
            role: rp.role,
            permission: rp.permission as any,
          },
          update: {},
        });
        count++;
      } catch {
        // Skip invalid permissions
      }
    }
    return count;
  }

  /**
   * Seed proposals with workflow logs
   */
  private async seedProposals(): Promise<number> {
    // Get faculty IDs for mapping
    const faculties = await this.prisma.faculty.findMany();
    const facultyMap = new Map(faculties.map((f) => [f.code, f.id]));

    for (const proposalData of DEMO_PROPOSALS) {
      const facultyId = facultyMap.get(proposalData.facultyCode);
      if (!facultyId) continue;

      // Verify owner exists
      const owner = await this.prisma.user.findUnique({
        where: { id: proposalData.ownerId },
      });
      if (!owner) continue;

      // Generate deterministic proposal ID
      const proposalId = this.generateUUIDv5(this.DEMO_NAMESPACE, `proposal-${proposalData.code}`);

      // Create proposal
      await this.prisma.proposal.upsert({
        where: { code: proposalData.code },
        update: {},
        create: {
          id: proposalId,
          code: proposalData.code,
          title: proposalData.title,
          state: proposalData.state,
          ownerId: proposalData.ownerId,
          facultyId,
          holderUnit: proposalData.holderUnit,
          holderUser: proposalData.holderUser,
          slaStartDate: proposalData.state !== 'DRAFT' ? new Date('2026-01-01T00:00:00.000Z') : null,
          slaDeadline: proposalData.state !== 'DRAFT' ? new Date('2026-01-08T00:00:00.000Z') : null,
        },
      });

      // Create workflow logs
      const logs = proposalData.workflowLogs || [];
      for (const log of logs) {
        await this.prisma.workflowLog.create({
          data: {
            proposalId,
            action: log.action,
            fromState: log.fromState,
            toState: log.toState,
            actorId: log.actorId,
            actorName: log.actorName,
            returnTargetState: log.returnTargetState,
            returnTargetHolderUnit: log.returnTargetHolderUnit,
            reasonCode: log.reasonCode,
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
          },
        });
      }
    }
    return DEMO_PROPOSALS.length;
  }

  /**
   * Seed business calendar
   */
  private async seedBusinessCalendar(): Promise<number> {
    for (const holiday of DEMO_HOLIDAYS) {
      await this.prisma.businessCalendar.upsert({
        where: { date: new Date(holiday.date) },
        update: {},
        create: {
          date: new Date(holiday.date),
          name: holiday.name,
          isHoliday: holiday.isHoliday,
          isWorkingDay: holiday.isWorkingDay,
          recurring: holiday.recurring,
        },
      });
    }
    return DEMO_HOLIDAYS.length;
  }
}
