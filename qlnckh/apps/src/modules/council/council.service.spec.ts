import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CouncilService } from './council.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@prisma/client';

describe('CouncilService - Faculty Council', () => {
  let service: CouncilService;
  let mockPrisma: any;
  let mockAuditService: any;

  const mockFacultyId = 'KHOA.CNTT';
  const mockSecretaryId = 'user-secretary';
  const mockOwnerId = 'user-owner';

  // Mock users for faculty council
  const mockFacultyMembers = [
    { id: 'user-1', displayName: 'User 1', facultyId: mockFacultyId, role: UserRole.GIANG_VIEN },
    { id: 'user-2', displayName: 'User 2', facultyId: mockFacultyId, role: UserRole.GIANG_VIEN },
    { id: 'user-3', displayName: 'User 3', facultyId: mockFacultyId, role: UserRole.GIANG_VIEN },
    { id: 'user-4', displayName: 'User 4', facultyId: mockFacultyId, role: UserRole.GIANG_VIEN },
    { id: mockSecretaryId, displayName: 'Secretary', facultyId: mockFacultyId, role: UserRole.GIANG_VIEN },
    { id: mockOwnerId, displayName: 'Owner', facultyId: mockFacultyId, role: UserRole.GIANG_VIEN },
  ];

  // Mock user from different faculty
  const mockOtherFacultyUser = {
    id: 'user-other-faculty',
    displayName: 'Other Faculty User',
    facultyId: 'KHOA.DIEN',
    role: UserRole.GIANG_VIEN,
  };

  // Mock non-lecturer user
  const mockNonLecturer = {
    id: 'user-admin',
    displayName: 'Admin User',
    facultyId: mockFacultyId,
    role: UserRole.QUAN_LY_KHOA,
  };

  beforeEach(() => {
    // Create mock Prisma with user alias
    mockPrisma = {
      user: {
        findMany: vi.fn(),
      },
      council: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      councilMember: {
        findMany: vi.fn(),
        createMany: vi.fn(),
      },
      proposal: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    // Create service instance directly with mocks
    service = new CouncilService(
      mockPrisma as unknown as PrismaService,
      mockAuditService as unknown as AuditService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFacultyCouncilMembers', () => {
    describe('Faculty Constraint', () => {
      it('should pass when all members belong to the same faculty', async () => {
        const memberIds = ['user-1', 'user-2', 'user-3', mockSecretaryId];
        mockPrisma.user.findMany.mockResolvedValue(
          mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
        );

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject when a member is from a different faculty', async () => {
        const memberIds = ['user-1', 'user-2', 'user-3', mockSecretaryId, 'user-other-faculty'];
        mockPrisma.user.findMany.mockResolvedValue([
          ...mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
          mockOtherFacultyUser,
        ]);

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Other Faculty User không thuộc khoa này');
      });

      it('should reject when a member is not a lecturer', async () => {
        const memberIds = ['user-1', 'user-2', 'user-3', mockSecretaryId, 'user-admin'];
        mockPrisma.user.findMany.mockResolvedValue([
          ...mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
          mockNonLecturer,
        ]);

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Admin User không phải giảng viên');
      });

      it('should reject when a member is not found', async () => {
        const memberIds = ['user-1', 'user-2', 'user-3', mockSecretaryId, 'non-existent-user'];
        mockPrisma.user.findMany.mockResolvedValue(
          mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
        );

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Không tìm thấy người dùng với ID: non-existent-user');
      });
    });

    describe('Odd Member Validation', () => {
      it('should pass with 3 voting members (odd)', async () => {
        // 4 members total: 3 voters + 1 secretary
        const memberIds = ['user-1', 'user-2', 'user-3', mockSecretaryId];
        mockPrisma.user.findMany.mockResolvedValue(
          mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
        );

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass with 5 voting members (odd)', async () => {
        // 6 members total: 5 voters + 1 secretary
        const memberIds = ['user-1', 'user-2', 'user-3', 'user-4', mockOwnerId, mockSecretaryId];
        mockPrisma.user.findMany.mockResolvedValue(
          mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
        );

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject with 4 voting members (even)', async () => {
        // 5 members total: 4 voters + 1 secretary
        const memberIds = ['user-1', 'user-2', 'user-3', 'user-4', mockSecretaryId];
        mockPrisma.user.findMany.mockResolvedValue(
          mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
        );

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Số thành viên bỏ phiếu phải là số lẻ (hiện tại: 4)');
      });

      it('should reject with fewer than 3 voting members', async () => {
        // 3 members total: 2 voters + 1 secretary
        const memberIds = ['user-1', 'user-2', mockSecretaryId];
        mockPrisma.user.findMany.mockResolvedValue(
          mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
        );

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Hội đồng phải có tối thiểu 3 thành viên bỏ phiếu (không tính thư ký). Hiện tại: 2',
        );
      });
    });

    describe('Secretary Validation', () => {
      it('should reject when secretary is not in member list', async () => {
        const memberIds = ['user-1', 'user-2', 'user-3', 'user-4']; // No secretary
        mockPrisma.user.findMany.mockResolvedValue(
          mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
        );

        const result = await service.validateFacultyCouncilMembers(
          mockFacultyId,
          memberIds,
          mockSecretaryId,
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Thư ký phải là thành viên của hội đồng');
      });
    });
  });

  describe('getEligibleVotersForProposal', () => {
    describe('Secretary Exclusion', () => {
      it('should exclude secretary from eligible voters', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          'some-other-owner',
        );

        expect(result.eligibleVoters).not.toContain(mockSecretaryId);
        expect(result.excludedMembers).toContainEqual({
          id: mockSecretaryId,
          reason: 'Thư ký (chỉ tổng hợp)',
        });
      });

      it('should not have secretary in eligible voters even when proposal owner is different', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', 'user-4', mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          'external-owner', // Owner not in council
        );

        expect(result.eligibleVoters).toEqual(['user-1', 'user-2', 'user-3', 'user-4']);
        expect(result.totalEligible).toBe(4);
      });
    });

    describe('Owner Exclusion', () => {
      it('should exclude proposal owner from eligible voters', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', mockSecretaryId, mockOwnerId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          mockOwnerId,
        );

        expect(result.eligibleVoters).not.toContain(mockOwnerId);
        expect(result.excludedMembers).toContainEqual({
          id: mockOwnerId,
          reason: 'Chủ nhiệm đề tài (không tự đánh giá)',
        });
      });

      it('should exclude both secretary and owner when owner is a council member', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', 'user-4', mockSecretaryId, mockOwnerId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          mockOwnerId,
        );

        expect(result.eligibleVoters).toEqual(['user-1', 'user-2', 'user-3', 'user-4']);
        expect(result.excludedMembers).toHaveLength(2);
        expect(result.totalEligible).toBe(4);
      });

      it('should not exclude owner when owner is not in council', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          'external-owner',
        );

        // Only secretary excluded
        expect(result.excludedMembers).toHaveLength(1);
        expect(result.eligibleVoters).toEqual(['user-1', 'user-2', 'user-3']);
      });
    });

    describe('Eligible Voter Count', () => {
      it('should return correct count of eligible voters', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', 'user-4', mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          'external-owner',
        );

        expect(result.totalEligible).toBe(4);
        expect(result.eligibleVoters).toHaveLength(4);
      });

      it('should handle case where owner is secretary (double exclusion)', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', 'user-4', mockSecretaryId];

        // Secretary is also the proposal owner (edge case)
        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          mockSecretaryId, // Same person is both secretary and owner
        );

        // Should have 2 exclusion entries but only exclude 1 person
        expect(result.excludedMembers).toHaveLength(2);
        expect(result.eligibleVoters).toEqual(['user-1', 'user-2', 'user-3', 'user-4']);
        expect(result.totalEligible).toBe(4);
      });
    });

    describe('Warnings', () => {
      it('should warn when eligible voters is less than 3', () => {
        const councilMembers = ['user-1', 'user-2', mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          'external-owner',
        );

        expect(result.warning).toBe('Không đủ thành viên bỏ phiếu (cần tối thiểu 3, có 2)');
      });

      it('should warn when eligible voters is even', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', 'user-4', mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          'external-owner',
        );

        expect(result.warning).toBe('Số thành viên bỏ phiếu là số chẵn (4). Có thể xảy ra hòa.');
      });

      it('should not warn when eligible voters is odd and at least 3', () => {
        const councilMembers = ['user-1', 'user-2', 'user-3', mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          'external-owner',
        );

        expect(result.warning).toBeUndefined();
      });

      it('should warn about insufficient voters even when owner excluded', () => {
        // 3 members + secretary, but owner is one of the voters
        const councilMembers = ['user-1', 'user-2', mockOwnerId, mockSecretaryId];

        const result = service.getEligibleVotersForProposal(
          councilMembers,
          mockSecretaryId,
          mockOwnerId,
        );

        // Only 2 eligible: user-1, user-2 (secretary and owner excluded)
        expect(result.totalEligible).toBe(2);
        expect(result.warning).toBe('Không đủ thành viên bỏ phiếu (cần tối thiểu 3, có 2)');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete faculty council workflow', async () => {
      // Scenario: Create council with 5 voting members (odd) + 1 secretary
      const memberIds = ['user-1', 'user-2', 'user-3', 'user-4', mockOwnerId, mockSecretaryId];

      mockPrisma.user.findMany.mockResolvedValue(
        mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
      );

      // Step 1: Validate council creation
      const validationResult = await service.validateFacultyCouncilMembers(
        mockFacultyId,
        memberIds,
        mockSecretaryId,
      );

      expect(validationResult.valid).toBe(true);

      // Step 2: Get eligible voters for a proposal owned by one of the members
      const votersResult = service.getEligibleVotersForProposal(
        memberIds,
        mockSecretaryId,
        mockOwnerId, // Owner is in the council
      );

      // Should have 4 eligible voters (5 voting - 1 owner = 4)
      expect(votersResult.totalEligible).toBe(4);
      expect(votersResult.warning).toBe('Số thành viên bỏ phiếu là số chẵn (4). Có thể xảy ra hòa.');
    });

    it('should handle council where owner is external', async () => {
      // Scenario: Create council with 5 voting members (odd) + 1 secretary
      // Owner is NOT in the council
      const memberIds = ['user-1', 'user-2', 'user-3', 'user-4', mockOwnerId, mockSecretaryId];

      mockPrisma.user.findMany.mockResolvedValue(
        mockFacultyMembers.filter((u) => memberIds.includes(u.id)),
      );

      // Step 1: Validate council creation
      const validationResult = await service.validateFacultyCouncilMembers(
        mockFacultyId,
        memberIds,
        mockSecretaryId,
      );

      expect(validationResult.valid).toBe(true);

      // Step 2: Get eligible voters for a proposal owned by external user
      const votersResult = service.getEligibleVotersForProposal(
        memberIds,
        mockSecretaryId,
        'external-owner', // Owner not in council
      );

      // Should have 5 eligible voters (all voting members)
      expect(votersResult.totalEligible).toBe(5);
      expect(votersResult.warning).toBeUndefined(); // 5 is odd, >= 3
    });
  });
});
