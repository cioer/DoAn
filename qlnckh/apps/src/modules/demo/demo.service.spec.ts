import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DemoService } from './demo.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditAction } from '../audit/audit-action.enum';
import { Permission } from '../rbac/permissions.enum';
import { UserRole } from '@prisma/client';

describe('DemoService', () => {
  let service: DemoService;
  let prismaService: PrismaService;
  let rbacService: RbacService;
  let auditService: AuditService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockRbacService = {
    getUserPermissions: jest.fn(),
  };

  const mockAuditService = {
    logEvent: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DemoService>(DemoService);
    prismaService = module.get<PrismaService>(PrismaService);
    rbacService = module.get<RbacService>(RbacService);
    auditService = module.get<AuditService>(AuditService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('isDemoModeEnabled', () => {
    it('should return true when DEMO_MODE is "true"', () => {
      mockConfigService.get.mockReturnValue('true');
      expect(service.isDemoModeEnabled()).toBe(true);
    });

    it('should return false when DEMO_MODE is not "true"', () => {
      mockConfigService.get.mockReturnValue('false');
      expect(service.isDemoModeEnabled()).toBe(false);
    });

    it('should return false when DEMO_MODE is undefined', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.isDemoModeEnabled()).toBe(false);
    });
  });

  describe('getDemoModeConfig', () => {
    it('should return enabled with personas when DEMO_MODE is true', async () => {
      mockConfigService.get.mockReturnValue('true');
      const config = await service.getDemoModeConfig();

      expect(config.enabled).toBe(true);
      expect(config.personas).toHaveLength(8);
      expect(config.personas[0]).toMatchObject({
        id: 'DT-USER-001',
        name: 'Giảng viên',
        role: 'GIANG_VIEN',
      });
    });

    it('should return disabled with empty personas when DEMO_MODE is false', async () => {
      mockConfigService.get.mockReturnValue('false');
      const config = await service.getDemoModeConfig();

      expect(config.enabled).toBe(false);
      expect(config.personas).toHaveLength(0);
    });
  });

  describe('switchPersona', () => {
    const mockActorUser = {
      id: 'real-user-id',
      displayName: 'Real User',
      email: 'real@example.com',
      role: UserRole.ADMIN,
      facultyId: null,
    };

    const mockTargetUser = {
      id: 'DT-USER-002',
      displayName: 'Quản lý Khoa',
      email: 'quanly@example.com',
      role: UserRole.QUAN_LY_KHOA,
      facultyId: 'KHOA-01',
    };

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('true');
      mockRbacService.getUserPermissions.mockResolvedValue([Permission.DEMO_SWITCH_PERSONA]);
      mockPrismaService.user.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'real-user-id') return mockActorUser;
        if (args.where.id === 'DT-USER-002') return mockTargetUser;
        return null;
      });
    });

    it('should switch persona successfully', async () => {
      const result = await service.switchPersona('real-user-id', 'DT-USER-002');

      expect(result.user.id).toBe('real-user-id');
      expect(result.actingAs.id).toBe('DT-USER-002');
      expect(result.actingAs.role).toBe(UserRole.QUAN_LY_KHOA);
    });

    it('should log audit event with actor and actingAs', async () => {
      await service.switchPersona('real-user-id', 'DT-USER-002');

      expect(auditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.DEMO_PERSONA_SWITCH,
        actorUserId: 'real-user-id',
        actingAsUserId: 'DT-USER-002',
        entityType: 'users',
        entityId: 'DT-USER-002',
        metadata: expect.objectContaining({
          from_role: UserRole.ADMIN,
          to_role: UserRole.QUAN_LY_KHOA,
        }),
      });
    });

    it('should throw ForbiddenException when demo mode is disabled', async () => {
      mockConfigService.get.mockReturnValue('false');

      await expect(
        service.switchPersona('real-user-id', 'DT-USER-002'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when target is not a demo persona', async () => {
      await expect(
        service.switchPersona('real-user-id', 'invalid-persona-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when target user not found', async () => {
      mockPrismaService.user.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'real-user-id') return mockActorUser;
        return null; // Target not found
      });

      await expect(
        service.switchPersona('real-user-id', 'DT-USER-002'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when actor user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.switchPersona('real-user-id', 'DT-USER-002'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPersonaById', () => {
    it('should return persona when demo mode is enabled', () => {
      mockConfigService.get.mockReturnValue('true');
      const persona = service.getPersonaById('DT-USER-001');

      expect(persona).not.toBeNull();
      expect(persona?.id).toBe('DT-USER-001');
      expect(persona?.name).toBe('Giảng viên');
    });

    it('should return null when demo mode is disabled', () => {
      mockConfigService.get.mockReturnValue('false');
      const persona = service.getPersonaById('DT-USER-001');

      expect(persona).toBeNull();
    });

    it('should return null when persona id not found', () => {
      mockConfigService.get.mockReturnValue('true');
      const persona = service.getPersonaById('invalid-id');

      expect(persona).toBeNull();
    });
  });

  describe('isDemoPersona', () => {
    it('should be exported and available', () => {
      const { isDemoPersona } = require('./constants/demo-personas');
      expect(isDemoPersona('DT-USER-001')).toBe(true);
      expect(isDemoPersona('DT-USER-008')).toBe(true);
      expect(isDemoPersona('invalid-id')).toBe(false);
    });
  });
});
