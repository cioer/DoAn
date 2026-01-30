/**
 * ProposalsCrudService Unit Tests
 *
 * Tests for faculty isolation feature (QUAN_LY_KHOA role filtering)
 */
import { ProposalsCrudService } from './proposals-crud.service';
import { PrismaService } from '../../auth/prisma.service';
import { UserRole, ProjectState } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * RequestUser interface for tests
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

// Manual mock for PrismaService
const mockPrisma = {
  proposal: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
};

describe('ProposalsCrudService - Faculty Isolation', () => {
  let service: ProposalsCrudService;

  // Mock users
  const quanLyKhoaUser: RequestUser = {
    id: 'qlk-user-1',
    email: 'quanlykhoa@faculty.edu.vn',
    role: UserRole.QUAN_LY_KHOA,
    facultyId: 'faculty-cntt',
  };

  const quanLyKhoaUserNoFaculty: RequestUser = {
    id: 'qlk-user-2',
    email: 'quanlykhoa-no-faculty@faculty.edu.vn',
    role: UserRole.QUAN_LY_KHOA,
    facultyId: null,
  };

  const adminUser: RequestUser = {
    id: 'admin-user-1',
    email: 'admin@university.edu.vn',
    role: UserRole.ADMIN,
    facultyId: null,
  };

  const giangVienUser: RequestUser = {
    id: 'gv-user-1',
    email: 'giangvien@university.edu.vn',
    role: UserRole.GIANG_VIEN,
    facultyId: 'faculty-cntt',
  };

  beforeEach(() => {
    service = new ProposalsCrudService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('findAll - Faculty Isolation for QUAN_LY_KHOA', () => {
    it('should auto-filter by facultyId when user is QUAN_LY_KHOA', async () => {
      const mockProposals = [
        { id: 'prop-1', title: 'Proposal 1', facultyId: 'faculty-cntt' },
        { id: 'prop-2', title: 'Proposal 2', facultyId: 'faculty-cntt' },
      ];

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(2);

      const result = await service.findAll({
        skip: 0,
        take: 20,
        user: quanLyKhoaUser,
      });

      // Should auto-filter by user's faculty
      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facultyId: 'faculty-cntt',
          }),
        })
      );
    });

    it('should return 403 when QUAN_LY_KHOA tries to access other faculty proposals', async () => {
      await expect(
        service.findAll({
          skip: 0,
          take: 20,
          facultyId: 'faculty-other', // Different faculty
          user: quanLyKhoaUser,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return 400 when QUAN_LY_KHOA has no facultyId', async () => {
      await expect(
        service.findAll({
          skip: 0,
          take: 20,
          user: quanLyKhoaUserNoFaculty,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow QUAN_LY_KHOA to query own faculty without explicit facultyId', async () => {
      const mockProposals = [
        { id: 'prop-1', title: 'Proposal 1', facultyId: 'faculty-cntt' },
      ];

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(1);

      const result = await service.findAll({
        skip: 0,
        take: 20,
        user: quanLyKhoaUser,
      });

      // Should use user's facultyId automatically
      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facultyId: 'faculty-cntt',
          }),
        })
      );
    });

    it('should not apply faculty filter for ADMIN users', async () => {
      const mockProposals = [
        { id: 'prop-1', title: 'Proposal 1', facultyId: 'faculty-cntt' },
        { id: 'prop-2', title: 'Proposal 2', facultyId: 'faculty-other' },
      ];

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(2);

      const result = await service.findAll({
        skip: 0,
        take: 20,
        facultyId: 'faculty-cntt', // Explicit filter
        user: adminUser,
      });

      // ADMIN can use explicit faculty filter
      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facultyId: 'faculty-cntt',
          }),
        })
      );
    });

    it('should not apply faculty filter for GIANG_VIEN users', async () => {
      const mockProposals = [
        { id: 'prop-1', title: 'Proposal 1', facultyId: 'faculty-cntt' },
      ];

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(1);

      const result = await service.findAll({
        skip: 0,
        take: 20,
        facultyId: 'faculty-cntt',
        user: giangVienUser,
      });

      // GIANG_VIEN can use explicit faculty filter
      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facultyId: 'faculty-cntt',
          }),
        })
      );
    });

    it('should apply search filter along with faculty filter for QUAN_LY_KHOA', async () => {
      const mockProposals = [
        { id: 'prop-1', title: 'AI Research', facultyId: 'faculty-cntt' },
      ];

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(1);

      const result = await service.findAll({
        skip: 0,
        take: 20,
        search: 'AI',
        user: quanLyKhoaUser,
      });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facultyId: 'faculty-cntt',
            OR: [
              { title: { contains: 'AI', mode: 'insensitive' } },
              { code: { contains: 'AI', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should apply state filter along with faculty filter for QUAN_LY_KHOA', async () => {
      const mockProposals = [
        { id: 'prop-1', title: 'Proposal 1', state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW, facultyId: 'faculty-cntt' },
      ];

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(1);

      const result = await service.findAll({
        skip: 0,
        take: 20,
        state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
        user: quanLyKhoaUser,
      });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facultyId: 'faculty-cntt',
            state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
          }),
        })
      );
    });
  });

  describe('findAll - Pagination and Metadata', () => {
    it('should return correct pagination metadata', async () => {
      const mockProposals = Array.from({ length: 10 }, (_, i) => ({
        id: `prop-${i}`,
        title: `Proposal ${i}`,
        facultyId: 'faculty-cntt',
      }));

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(25); // 25 total proposals

      const result = await service.findAll({
        skip: 0,
        take: 10,
        user: quanLyKhoaUser,
      });

      expect(result.meta).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should calculate correct page number', async () => {
      mockPrisma.proposal.findMany.mockResolvedValue([]);
      mockPrisma.proposal.count.mockResolvedValue(0);

      const result = await service.findAll({
        skip: 20,
        take: 10,
        user: quanLyKhoaUser,
      });

      expect(result.meta.page).toBe(3); // (20 / 10) + 1
    });
  });

  describe('findAll - Owner Filter', () => {
    it('should apply ownerId filter for QUAN_LY_KHOA within same faculty', async () => {
      const mockProposals = [
        { id: 'prop-1', title: 'Proposal 1', ownerId: 'owner-1', facultyId: 'faculty-cntt' },
      ];

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.count.mockResolvedValue(1);

      const result = await service.findAll({
        skip: 0,
        take: 20,
        ownerId: 'owner-1',
        user: quanLyKhoaUser,
      });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facultyId: 'faculty-cntt',
            ownerId: 'owner-1',
          }),
        })
      );
    });
  });
});
