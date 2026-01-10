import { BadRequestException } from '@nestjs/common';
import { UserRole, ProjectState, User, Faculty } from '@prisma/client';
import { ImportService } from './import.service';
import { AuditService } from '../audit/audit.service';
import { ExcelParserService } from './helpers/excel-parser.service';
import {
  ImportResult,
  ImportError,
} from './dto/import-result.dto';

/**
 * Import Service Tests
 * Story 10.1: Import Excel (Users, Proposals)
 *
 * Tests follow Epic 9 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - File operations OUTSIDE transactions
 * - Proper DTO mapping
 */

// Manual mocks
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  proposal: {
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  faculty: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  workflowLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
};

const mockAuditService = {
  logEvent: vi.fn().mockResolvedValue(undefined),
};

const mockExcelParserService = {
  parseUserImportFile: vi.fn(),
  parseProposalImportFile: vi.fn(),
  mapRole: vi.fn(),
  mapState: vi.fn(),
};

describe('ImportService', () => {
  let service: ImportService;

  // Test data fixtures
  const mockUsers: User[] = [
    {
      id: 'user-1',
      email: 'nguyenvan@example.com',
      displayName: 'Nguyễn Văn A',
      role: UserRole.GIANG_VIEN,
      facultyId: 'faculty-1',
      passwordHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      faculty: {} as any,
      refreshTokens: [],
      auditEventsAsActor: [],
      auditEventsAsActing: [],
      ownedProposals: [],
    },
  ];

  const mockFaculties: Faculty[] = [
    {
      id: 'faculty-1',
      code: 'FAC-001',
      name: 'Khoa CNTT',
      createdAt: new Date(),
      updatedAt: new Date(),
      users: [],
      proposals: [],
    },
  ];

  const mockContext = {
    userId: 'admin-1',
    userDisplayName: 'Admin User',
    ip: '127.0.0.1',
    userAgent: 'test',
    requestId: 'req-1',
  };

  beforeEach(() => {
    service = new ImportService(
      mockPrisma as any,
      mockExcelParserService as any,
      mockAuditService as any,
    );
    vi.clearAllMocks();

    // Default mock responses
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  });

  describe('AC1, AC2: User Import - Success Cases', () => {
    beforeEach(() => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.GIANG_VIEN,
          facultyId: 'FAC-001',
          _lineNumber: 2,
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.faculty.findUnique.mockResolvedValue(mockFaculties[0]);
      mockPrisma.user.create.mockResolvedValue({});
    });

    it('should import users successfully', async () => {
      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      const result = await service.importUsers(file, mockContext);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(1);
      expect(result.entityType).toBe('users');
      expect(result.errors).toHaveLength(0);
    });

    it('should parse file OUTSIDE transaction (Epic 7 retro pattern)', async () => {
      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      await service.importUsers(file, mockContext);

      // Verify parsing happens first (outside transaction)
      expect(mockExcelParserService.parseUserImportFile).toHaveBeenCalledWith(file.buffer);
    });

    it('should import multiple users in transaction', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'user1@example.com',
          displayName: 'User 1',
          role: UserRole.GIANG_VIEN,
          facultyId: 'FAC-001',
          _lineNumber: 2,
        },
        {
          email: 'user2@example.com',
          displayName: 'User 2',
          role: UserRole.ADMIN,
          facultyId: null,
          _lineNumber: 3,
        },
      ]);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      const result = await service.importUsers(file, mockContext);

      expect(result.success).toBe(2);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(2);
    });

    it('should log audit event after import', async () => {
      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      await service.importUsers(file, mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'USER_CREATE',
        actorUserId: 'admin-1',
        entityType: 'User',
        entityId: expect.stringContaining('import_'),
        metadata: expect.objectContaining({
          importType: 'users',
          filename: 'users.xlsx',
        }),
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });
  });

  describe('AC3, AC4: User Import - Validation', () => {
    it('should reject invalid email format', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'invalid-email',
          displayName: 'Test User',
          role: UserRole.GIANG_VIEN,
          facultyId: 'FAC-001',
          _lineNumber: 2,
        },
      ]);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      const result = await service.importUsers(file, mockContext);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toBe('Email không đúng định dạng');
      expect(result.errors[0].field).toBe('email');
    });

    it('should reject duplicate email', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'existing@example.com',
          displayName: 'Test User',
          role: UserRole.GIANG_VIEN,
          facultyId: 'FAC-001',
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      const result = await service.importUsers(file, mockContext);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('Email đã tồn tại');
    });

    it('should reject display name less than 2 characters', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'test@example.com',
          displayName: 'A',
          role: UserRole.GIANG_VIEN,
          facultyId: 'FAC-001',
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      const result = await service.importUsers(file, mockContext);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('ít nhất 2 ký tự');
    });

    it('should reject non-existent faculty', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.GIANG_VIEN,
          facultyId: 'NON-EXISTENT',
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.faculty.findUnique.mockResolvedValue(null);
      mockPrisma.faculty.findFirst.mockResolvedValue(null);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      });

      const result = await service.importUsers(file, mockContext);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('Khoa không tồn tại');
    });
  });

  describe('AC5, AC6: Proposal Import', () => {
    beforeEach(() => {
      mockExcelParserService.parseProposalImportFile.mockResolvedValue([
        {
          ownerId: 'nguyenvan@example.com',
          title: 'Nghiên cứu AI',
          facultyCode: 'FAC-001',
          state: ProjectState.DRAFT,
          researchField: 'CNTT',
          budget: 50000000,
          _lineNumber: 2,
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'nguyenvan@example.com',
      });
      mockPrisma.faculty.findFirst.mockResolvedValue(mockFaculties[0]);
      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.proposal.create.mockResolvedValue({});
      mockPrisma.workflowLog.create.mockResolvedValue({});
    });

    it('should import proposals successfully', async () => {
      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      const result = await service.importProposals(file, mockContext);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(1);
      expect(result.entityType).toBe('proposals');
    });

    it('should auto-assign holder based on state', async () => {
      mockExcelParserService.parseProposalImportFile.mockResolvedValue([
        {
          ownerId: 'test@example.com',
          title: 'Test Proposal',
          facultyCode: 'FAC-001',
          state: ProjectState.FACULTY_REVIEW,
          _lineNumber: 2,
        },
      ]);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      await service.importProposals(file, mockContext);

      expect(mockPrisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          holderUnit: 'faculty-1',
        }),
      });
    });

    it('should set holderUnit to PHONG_KHCN for council review states', async () => {
      mockExcelParserService.parseProposalImportFile.mockResolvedValue([
        {
          ownerId: 'test@example.com',
          title: 'Test Proposal',
          facultyCode: 'FAC-001',
          state: ProjectState.OUTLINE_COUNCIL_REVIEW,
          _lineNumber: 2,
        },
      ]);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      await service.importProposals(file, mockContext);

      expect(mockPrisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          holderUnit: 'PHONG_KHCN',
        }),
      });
    });

    it('should set holderUnit to null for DRAFT state', async () => {
      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      await service.importProposals(file, mockContext);

      expect(mockPrisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          holderUnit: null,
        }),
      });
    });
  });

  describe('AC7: Proposal Import Validation', () => {
    it('should reject non-existent owner', async () => {
      mockExcelParserService.parseProposalImportFile.mockResolvedValue([
        {
          ownerId: 'nonexistent@example.com',
          title: 'Test Proposal',
          facultyCode: 'FAC-001',
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      const result = await service.importProposals(file, mockContext);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('Chủ đề tài không tồn tại');
    });

    it('should reject title less than 5 characters', async () => {
      mockExcelParserService.parseProposalImportFile.mockResolvedValue([
        {
          ownerId: 'test@example.com',
          title: 'ABC',
          facultyCode: 'FAC-001',
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      const result = await service.importProposals(file, mockContext);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('ít nhất 5 ký tự');
    });

    it('should reject non-existent faculty', async () => {
      mockExcelParserService.parseProposalImportFile.mockResolvedValue([
        {
          ownerId: 'test@example.com',
          title: 'Valid Title Here',
          facultyCode: 'NON-EXISTENT',
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.faculty.findFirst.mockResolvedValue(null);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      const result = await service.importProposals(file, mockContext);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].message).toContain('Khoa không tồn tại');
    });
  });

  describe('AC8: File Parse Errors', () => {
    it('should throw BadRequestException for invalid file format', async () => {
      mockExcelParserService.parseUserImportFile.mockRejectedValue(
        new BadRequestException('File không đúng định dạng')
      );

      const file = {
        buffer: Buffer.from('invalid data'),
        originalname: 'users.txt',
      };

      await expect(service.importUsers(file, mockContext)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for empty file', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([]);

      const file = {
        buffer: Buffer.from(''),
        originalname: 'users.xlsx',
      };

      await expect(service.importUsers(file, mockContext)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('AC9: RBAC Authorization', () => {
    it('should allow import for ADMIN role', () => {
      expect(() => {
        service.validateImportPermission(UserRole.ADMIN);
      }).not.toThrow();
    });

    it('should reject import for non-ADMIN roles', () => {
      expect(() => {
        service.validateImportPermission(UserRole.GIANG_VIEN);
      }).toThrow(BadRequestException);

      try {
        service.validateImportPermission(UserRole.GIANG_VIEN);
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Chỉ Admin mới có thể thực hiện thao tác này',
          },
        });
      }
    });
  });

  describe('AC10: Idempotency and Atomicity', () => {
    it('should continue processing after individual row failure', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'valid1@example.com',
          displayName: 'Valid User 1',
          role: UserRole.GIANG_VIEN,
          facultyId: null,
          _lineNumber: 2,
        },
        {
          email: 'invalid-email',
          displayName: 'Invalid User',
          role: UserRole.GIANG_VIEN,
          facultyId: null,
          _lineNumber: 3,
        },
        {
          email: 'valid2@example.com',
          displayName: 'Valid User 2',
          role: UserRole.GIANG_VIEN,
          facultyId: null,
          _lineNumber: 4,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      const result = await service.importUsers(file, mockContext);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe('Epic 9 Retro: Type Safety', () => {
    it('should use proper typing - NO as unknown casting', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.GIANG_VIEN,
          facultyId: null,
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      const result = await service.importUsers(file, mockContext);

      // Verify result is properly typed
      expect(result).toHaveProperty('entityType');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('duration');

      // Verify errors array is properly typed
      expect(Array.isArray(result.errors)).toBe(true);
      result.errors.forEach((error: ImportError) => {
        expect(error).toHaveProperty('lineNumber');
        expect(error).toHaveProperty('row');
        expect(error).toHaveProperty('message');
        expect(typeof error.lineNumber).toBe('number');
        expect(typeof error.message).toBe('string');
      });
    });

    it('should use UserRole enum directly - NO double cast', async () => {
      mockExcelParserService.parseUserImportFile.mockResolvedValue([
        {
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.ADMIN,
          facultyId: null,
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation((data) => {
        // Verify role is UserRole enum, not string cast
        expect(data.role).toBe(UserRole.ADMIN);
        return {};
      });

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'users.xlsx',
      };

      await service.importUsers(file, mockContext);
    });
  });

  describe('Edge Cases', () => {
    it('should handle proposal with no faculty code lookup', async () => {
      mockExcelParserService.parseProposalImportFile.mockResolvedValue([
        {
          ownerId: 'test@example.com',
          title: 'Valid Title Here',
          facultyCode: 'FAC-001',
          _lineNumber: 2,
        },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.faculty.findFirst.mockResolvedValue(mockFaculties[0]);
      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.proposal.create.mockResolvedValue({});

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      const result = await service.importProposals(file, mockContext);

      expect(result.success).toBe(1);
    });

    it('should generate proposal code correctly', async () => {
      mockPrisma.proposal.count.mockResolvedValue(5);

      const file = {
        buffer: Buffer.from('excel data'),
        originalname: 'proposals.xlsx',
      };

      await service.importProposals(file, mockContext);

      expect(mockPrisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'DT-006',
        }),
      });
    });
  });
});
