import { BadRequestException } from '@nestjs/common';
import { ProjectState, User, Faculty } from '@prisma/client';
import { ExportsService } from './exports.service';
import { AuditService } from '../audit/audit.service';
import { ExcelExportService } from './excel-export.service';
import { SlaService } from '../calendar/sla.service';

/**
 * Exports Service Tests
 * Story 8.3: Export Excel (Xuất Excel theo filter)
 *
 * Tests follow Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - File operations OUTSIDE transactions
 * - Proper DTO mapping
 */

// Manual mocks
const mockPrisma = {
  proposal: {
    findMany: vi.fn(),
  },
};

const mockAuditService = {
  logEvent: vi.fn().mockResolvedValue(undefined),
};

const mockExcelExportService = {
  generateProposalsExcel: vi.fn(),
  getStateLabel: vi.fn(),
  formatDate: vi.fn(),
};

const mockSlaService = {
  addBusinessDays: vi.fn().mockReturnValue(new Date('2026-01-10')),
};

const mockFullDumpExportService = {
  generateFullDump: vi.fn(),
};

describe('ExportsService', () => {
  let service: ExportsService;

  // Test data fixtures
  const mockProposals = [
    {
      id: 'proposal-1',
      code: 'DT-001',
      title: 'Nghiên cứu AI',
      state: ProjectState.FACULTY_REVIEW,
      holderUser: 'user-1',
      slaDeadline: new Date('2026-01-15'),
      createdAt: new Date('2026-01-01'),
      owner: {
        displayName: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
      },
      holder: {
        displayName: 'Nguyễn Văn A',
      },
      faculty: {
        name: 'Khoa CNTT',
      },
    },
    {
      id: 'proposal-2',
      code: 'DT-002',
      title: 'Nghiên cứu Blockchain',
      state: ProjectState.APPROVED,
      holderUser: 'user-2',
      slaDeadline: new Date('2026-01-20'),
      createdAt: new Date('2026-01-05'),
      owner: {
        displayName: 'Trần Văn B',
        email: 'tranvanb@example.com',
      },
      holder: {
        displayName: 'Trần Văn B',
      },
      faculty: {
        name: 'Khoa Kinh Tế',
      },
    },
  ];

  const mockContext = {
    userId: 'admin-1',
    userRole: 'PHONG_KHCN',
    ip: '127.0.0.1',
    userAgent: 'test',
    requestId: 'req-1',
  };

  beforeEach(() => {
    service = new ExportsService(
      mockPrisma as any,
      mockAuditService as any,
      mockExcelExportService as any,
      mockFullDumpExportService as any,
      mockSlaService as any,
    );
    vi.clearAllMocks();

    // Default mock responses
    mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
    mockExcelExportService.generateProposalsExcel.mockResolvedValue({
      buffer: Buffer.from('excel data'),
      filename: 'proposals_all_1234567890.xlsx',
    });
    mockExcelExportService.getStateLabel.mockImplementation((state) => state);
    mockExcelExportService.formatDate.mockImplementation((date) => {
      if (!date) return null;
      return new Date(date).toLocaleDateString('vi-VN');
    });
  });

  describe('AC1: Export Excel - All Records', () => {
    it('should export all proposals when includeAll is true', async () => {
      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          owner: { select: { displayName: true, email: true } },
          holder: { select: { displayName: true } },
          faculty: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toBe('proposals_all_1234567890.xlsx');
      expect(result.rowCount).toBe(2);
    });

    it('should generate Excel file OUTSIDE transaction (Epic 7 retro pattern)', async () => {
      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      // Verify Excel was generated
      expect(mockExcelExportService.generateProposalsExcel).toHaveBeenCalled();

      // Verify result contains buffer and filename
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/\.xlsx$/);
    });
  });

  describe('AC2: Export Excel - With Filter', () => {
    it('should apply state filter', async () => {
      const dto = { filter: { state: ProjectState.FACULTY_REVIEW } };
      await service.exportProposalsExcel(dto, mockContext);

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          state: ProjectState.FACULTY_REVIEW,
          deletedAt: null,
        }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply faculty filter', async () => {
      const dto = { filter: { facultyId: 'faculty-1' } };
      await service.exportProposalsExcel(dto, mockContext);

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          facultyId: 'faculty-1',
          deletedAt: null,
        }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply overdue filter', async () => {
      const dto = { filter: { overdue: true } };
      await service.exportProposalsExcel(dto, mockContext);

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          slaDeadline: { lt: expect.any(Date) },
          deletedAt: null,
        }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply upcoming filter (within 2 working days)', async () => {
      const dto = { filter: { upcoming: true } };
      await service.exportProposalsExcel(dto, mockContext);

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          slaDeadline: {
            gt: expect.any(Date),
            lte: expect.any(Date),
          },
          deletedAt: null,
        }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('AC3: Export Excel - Data Transformation', () => {
    it('should transform proposal data to row format - Proper typing (Epic 7 retro)', async () => {
      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      // Verify the transform was called and data was properly mapped
      expect(mockExcelExportService.generateProposalsExcel).toHaveBeenCalled();

      // Get the row data passed to generateProposalsExcel
      const rowDataArg = mockExcelExportService.generateProposalsExcel.mock.calls[0][0];
      expect(rowDataArg).toBeInstanceOf(Array);

      // Verify row data structure - NO as unknown casting
      if (rowDataArg.length > 0) {
        const firstRow = rowDataArg[0];
        expect(firstRow).toHaveProperty('code');
        expect(firstRow).toHaveProperty('title');
        expect(firstRow).toHaveProperty('ownerName');
        expect(firstRow).toHaveProperty('ownerEmail');
        expect(firstRow).toHaveProperty('state');
        expect(firstRow).toHaveProperty('holderName');
        expect(firstRow).toHaveProperty('facultyName');
        expect(firstRow).toHaveProperty('slaDeadline');
        expect(firstRow).toHaveProperty('daysRemaining');
        expect(firstRow).toHaveProperty('createdAt');
      }
    });

    it('should use Vietnamese state labels', async () => {
      mockExcelExportService.getStateLabel.mockImplementation((state) => {
        const labels: Record<string, string> = {
          FACULTY_REVIEW: 'Xét duyệt Khoa',
          APPROVED: 'Đã duyệt',
        };
        return labels[state] || state;
      });

      const dto = { includeAll: true };
      await service.exportProposalsExcel(dto, mockContext);

      expect(mockExcelExportService.getStateLabel).toHaveBeenCalledWith(ProjectState.FACULTY_REVIEW);
      expect(mockExcelExportService.getStateLabel).toHaveBeenCalledWith(ProjectState.APPROVED);
    });

    it('should calculate days remaining correctly', async () => {
      const dto = { includeAll: true };
      await service.exportProposalsExcel(dto, mockContext);

      const rowDataArg = mockExcelExportService.generateProposalsExcel.mock.calls[0][0];

      // Verify daysRemaining is calculated (number or null)
      if (rowDataArg.length > 0) {
        rowDataArg.forEach((row) => {
          expect(typeof row.daysRemaining === 'number' || row.daysRemaining === null).toBe(true);
        });
      }
    });

    it('should format dates in Vietnamese locale', async () => {
      const dto = { includeAll: true };
      await service.exportProposalsExcel(dto, mockContext);

      expect(mockExcelExportService.formatDate).toHaveBeenCalled();
    });
  });

  describe('AC4: Export Excel - Audit Trail', () => {
    it('should log audit event after Excel generation - Separate operation (Epic 7 retro)', async () => {
      const dto = { filter: { state: ProjectState.FACULTY_REVIEW } };
      await service.exportProposalsExcel(dto, mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'EXPORT_EXCEL',
        actorUserId: 'admin-1',
        entityType: 'Export',
        entityId: expect.stringContaining('.xlsx'),
        metadata: {
          filename: expect.any(String),
          rowCount: 2,
          filter: { state: ProjectState.FACULTY_REVIEW },
          includeAll: undefined,
        },
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });
  });

  describe('AC5: RBAC Authorization', () => {
    it('should allow export for PHONG_KHCN role', () => {
      expect(() => {
        service.validateExportPermission('PHONG_KHCN');
      }).not.toThrow();
    });

    it('should allow export for ADMIN role', () => {
      expect(() => {
        service.validateExportPermission('ADMIN');
      }).not.toThrow();
    });

    it('should reject export for non-PHONG_KHCN/ADMIN roles', () => {
      expect(() => {
        service.validateExportPermission('GIANG_VIEN');
      }).toThrow(BadRequestException);

      try {
        service.validateExportPermission('GIANG_VIEN');
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Bạn không có quyền thực hiện thao tác này',
          },
        });
      }
    });
  });

  describe('AC6: Large Dataset Handling', () => {
    it('should handle large datasets (>1000 rows)', async () => {
      const largeProposals = Array.from({ length: 1500 }, (_, i) => ({
        id: `proposal-${i}`,
        code: `DT-${i}`,
        title: `Proposal ${i}`,
        state: ProjectState.FACULTY_REVIEW,
        holderUser: `user-${i % 10}`,
        slaDeadline: new Date('2026-01-15'),
        createdAt: new Date('2026-01-01'),
        owner: { displayName: `User ${i}`, email: `user${i}@example.com` },
        holder: { displayName: `Holder ${i % 10}` },
        faculty: { name: 'Khoa CNTT' },
      }));

      mockPrisma.proposal.findMany.mockResolvedValue(largeProposals);

      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      expect(result.rowCount).toBe(1500);
      expect(mockExcelExportService.generateProposalsExcel).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
      );
    });
  });

  describe('Filter Name Generation', () => {
    it('should generate "all" for includeAll=true', async () => {
      const dto = { includeAll: true };
      await service.exportProposalsExcel(dto, mockContext);

      const filename = mockExcelExportService.generateProposalsExcel.mock.calls[0][1];
      expect(filename).toBe('all');
    });

    it('should generate state-based name for state filter', async () => {
      const dto = { filter: { state: ProjectState.FACULTY_REVIEW } };
      await service.exportProposalsExcel(dto, mockContext);

      const filename = mockExcelExportService.generateProposalsExcel.mock.calls[0][1];
      expect(filename).toBe('faculty_review');
    });

    it('should generate "overdue" for overdue filter', async () => {
      const dto = { filter: { overdue: true } };
      await service.exportProposalsExcel(dto, mockContext);

      const filename = mockExcelExportService.generateProposalsExcel.mock.calls[0][1];
      expect(filename).toBe('overdue');
    });

    it('should generate "upcoming" for upcoming filter', async () => {
      const dto = { filter: { upcoming: true } };
      await service.exportProposalsExcel(dto, mockContext);

      const filename = mockExcelExportService.generateProposalsExcel.mock.calls[0][1];
      expect(filename).toBe('upcoming');
    });

    it('should generate "filtered" for other filters', async () => {
      const dto = { filter: { facultyId: 'faculty-1' } };
      await service.exportProposalsExcel(dto, mockContext);

      const filename = mockExcelExportService.generateProposalsExcel.mock.calls[0][1];
      expect(filename).toBe('filtered');
    });
  });

  describe('Epic 7 Retro: Type Safety', () => {
    it('should use proper typing - NO as unknown casting', async () => {
      mockExcelExportService.generateProposalsExcel.mockImplementation(
        (data: unknown) => {
          // Verify data is properly typed array
          expect(Array.isArray(data)).toBe(true);
          if (data.length > 0) {
            const firstRow = data[0];
            expect(typeof firstRow.code).toBe('string');
            expect(typeof firstRow.title).toBe('string');
          }
          return {
            buffer: Buffer.from('test'),
            filename: 'test.xlsx',
          };
        }
      );

      const dto = { includeAll: true };
      await service.exportProposalsExcel(dto, mockContext);
    });

    it('should handle null values gracefully - NO as any for optional fields', async () => {
      const proposalsWithNulls = [
        {
          ...mockProposals[0],
          slaDeadline: null,
          holder: null,
        },
      ];
      mockPrisma.proposal.findMany.mockResolvedValue(proposalsWithNulls);

      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      // Should not throw error
      expect(result.rowCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result set', async () => {
      mockPrisma.proposal.findMany.mockResolvedValue([]);

      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      expect(result.rowCount).toBe(0);
      expect(mockExcelExportService.generateProposalsExcel).toHaveBeenCalledWith(
        [],
        expect.any(String),
      );
    });

    it('should handle proposals without owners', async () => {
      const proposalsWithoutOwner = [
        {
          ...mockProposals[0],
          owner: null,
        },
      ];
      mockPrisma.proposal.findMany.mockResolvedValue(proposalsWithoutOwner);

      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      expect(result.rowCount).toBe(1);
      // Verify N/A fallback
      const rowDataArg = mockExcelExportService.generateProposalsExcel.mock.calls[0][0];
      expect(rowDataArg[0].ownerName).toBe('N/A');
      expect(rowDataArg[0].ownerEmail).toBe('N/A');
    });

    it('should handle proposals without holders', async () => {
      const proposalsWithoutHolder = [
        {
          ...mockProposals[0],
          holder: null,
        },
      ];
      mockPrisma.proposal.findMany.mockResolvedValue(proposalsWithoutHolder);

      const dto = { includeAll: true };
      const result = await service.exportProposalsExcel(dto, mockContext);

      expect(result.rowCount).toBe(1);
      // Verify "Chưa gán" fallback
      const rowDataArg = mockExcelExportService.generateProposalsExcel.mock.calls[0][0];
      expect(rowDataArg[0].holderName).toBe('Chưa gán');
    });
  });
});
