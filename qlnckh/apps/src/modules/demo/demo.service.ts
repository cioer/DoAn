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
import {
  DEMO_PERSONAS,
  getPersonaById,
  isDemoPersona,
} from './constants/demo-personas';
import {
  SwitchPersonaResponse,
  DemoModeConfigResponse,
  DemoPersonaResponse,
} from './entities/demo-persona.entity';

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
}
