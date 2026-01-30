import { HolderAssignmentService } from './holder-assignment.service';
import { ProjectState, Proposal } from '@prisma/client';

describe('HolderAssignmentService', () => {
  let service: HolderAssignmentService;

  beforeEach(() => {
    service = new HolderAssignmentService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return service stats', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('service', 'HolderAssignmentService');
      expect(stats).toHaveProperty('terminalStates');
      expect(stats).toHaveProperty('specialUnitCodes');
    });
  });

  describe('getHolderForState', () => {
    const mockProposal: Pick<Proposal, 'ownerId' | 'facultyId' | 'holderUnit' | 'holderUser'> = {
      ownerId: 'user-owner',
      facultyId: 'KHOA.CNTT',
      holderUnit: null,
      holderUser: null,
    };

    describe('Phase A: Proposal States', () => {
      it('DRAFT should have no holder', () => {
        const result = service.getHolderForState(ProjectState.DRAFT, mockProposal);

        expect(result.holderUnit).toBeNull();
        expect(result.holderUser).toBeNull();
      });

      it('FACULTY_REVIEW should assign to faculty', () => {
        const result = service.getHolderForState(ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW, mockProposal);

        expect(result.holderUnit).toBe('KHOA.CNTT');
        expect(result.holderUser).toBeNull(); // Any QUAN_LY_KHOA can act
      });

      it('SCHOOL_SELECTION_REVIEW should assign to PHONG_KHCN', () => {
        const result = service.getHolderForState(ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW, mockProposal);

        expect(result.holderUnit).toBe('PHONG_KHCN');
        expect(result.holderUser).toBeNull();
      });

      it('OUTLINE_COUNCIL_REVIEW should keep existing holder if set', () => {
        const proposalWithCouncil = {
          ...mockProposal,
          holderUnit: 'COUNCIL-123',
          holderUser: 'council-secretary',
        };

        const result = service.getHolderForState(ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW, proposalWithCouncil);

        expect(result.holderUnit).toBe('COUNCIL-123');
        expect(result.holderUser).toBe('council-secretary');
      });
    });

    describe('Phase B: Changes & Approval', () => {
      it('CHANGES_REQUESTED should return to PI', () => {
        const result = service.getHolderForState(ProjectState.CHANGES_REQUESTED, mockProposal);

        expect(result.holderUnit).toBe('KHOA.CNTT');
        expect(result.holderUser).toBe('user-owner');
      });

      it('APPROVED should assign to PI', () => {
        const result = service.getHolderForState(ProjectState.APPROVED, mockProposal);

        expect(result.holderUnit).toBe('KHOA.CNTT');
        expect(result.holderUser).toBe('user-owner');
      });

      it('IN_PROGRESS should assign to PI', () => {
        const result = service.getHolderForState(ProjectState.IN_PROGRESS, mockProposal);

        expect(result.holderUnit).toBe('KHOA.CNTT');
        expect(result.holderUser).toBe('user-owner');
      });
    });

    describe('Phase C: Acceptance & Handover', () => {
      it('FACULTY_ACCEPTANCE_REVIEW should assign to faculty', () => {
        const result = service.getHolderForState(ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW, mockProposal);

        expect(result.holderUnit).toBe('KHOA.CNTT');
        expect(result.holderUser).toBeNull();
      });

      it('SCHOOL_ACCEPTANCE_REVIEW should assign to PHONG_KHCN', () => {
        const result = service.getHolderForState(ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW, mockProposal);

        expect(result.holderUnit).toBe('PHONG_KHCN');
        expect(result.holderUser).toBeNull();
      });

      it('HANDOVER should assign to PI', () => {
        const result = service.getHolderForState(ProjectState.HANDOVER, mockProposal);

        expect(result.holderUnit).toBe('KHOA.CNTT');
        expect(result.holderUser).toBe('user-owner');
      });

      it('COMPLETED should have no holder', () => {
        const result = service.getHolderForState(ProjectState.COMPLETED, mockProposal);

        expect(result.holderUnit).toBeNull();
        expect(result.holderUser).toBeNull();
      });
    });

    describe('Exception States', () => {
      it('PAUSED should assign to PHONG_KHCN', () => {
        const result = service.getHolderForState(ProjectState.PAUSED, mockProposal);

        expect(result.holderUnit).toBe('PHONG_KHCN');
        expect(result.holderUser).toBeNull();
      });

      it('CANCELLED should assign to decision maker', () => {
        const result = service.getHolderForState(
          ProjectState.CANCELLED,
          mockProposal,
          'actor-123',
          'KHOA.TOAN',
        );

        expect(result.holderUnit).toBe('KHOA.TOAN');
        expect(result.holderUser).toBe('actor-123');
      });

      it('REJECTED should assign to decision maker', () => {
        const result = service.getHolderForState(
          ProjectState.REJECTED,
          mockProposal,
          'actor-456',
          'KHOA.CNTT',
        );

        expect(result.holderUnit).toBe('KHOA.CNTT');
        expect(result.holderUser).toBe('actor-456');
      });

      it('WITHDRAWN should fallback to faculty if no actor faculty', () => {
        const result = service.getHolderForState(ProjectState.WITHDRAWN, mockProposal, 'actor-789');

        expect(result.holderUnit).toBe('KHOA.CNTT'); // Fallback to proposal faculty
        expect(result.holderUser).toBe('actor-789');
      });
    });
  });

  describe('canUserActOnProposal', () => {
    const mockProposal: Pick<Proposal, 'holderUnit' | 'holderUser' | 'state' | 'ownerId'> = {
      holderUnit: 'KHOA.CNTT',
      holderUser: null,
      state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      ownerId: 'owner-123',
    };

    it('should return false for terminal states', () => {
      const terminalStates = [
        ProjectState.COMPLETED,
        ProjectState.CANCELLED,
        ProjectState.REJECTED,
        ProjectState.WITHDRAWN,
      ];

      terminalStates.forEach((state) => {
        const proposal = { ...mockProposal, state };
        expect(service.canUserActOnProposal(proposal, 'user-1', 'KHOA.CNTT', 'GIANG_VIEN')).toBe(false);
      });
    });

    it('should return false for non-owner in DRAFT state', () => {
      const proposal = { ...mockProposal, state: ProjectState.DRAFT };

      expect(service.canUserActOnProposal(proposal, 'other-user', 'KHOA.CNTT', 'GIANG_VIEN')).toBe(false);
    });

    it('should return true for owner in DRAFT state', () => {
      const proposal = { ...mockProposal, state: ProjectState.DRAFT };

      expect(service.canUserActOnProposal(proposal, 'owner-123', 'KHOA.CNTT', 'GIANG_VIEN')).toBe(true);
    });

    it('should return true when holderUser matches', () => {
      const proposal = { ...mockProposal, holderUser: 'specific-user' };

      expect(service.canUserActOnProposal(proposal, 'specific-user', 'KHOA.CNTT', 'GIANG_VIEN')).toBe(true);
    });

    it('should return false when holderUser does not match', () => {
      const proposal = { ...mockProposal, holderUser: 'specific-user' };

      expect(service.canUserActOnProposal(proposal, 'other-user', 'KHOA.CNTT', 'GIANG_VIEN')).toBe(false);
    });

    it('should return true when user faculty matches holderUnit', () => {
      expect(service.canUserActOnProposal(mockProposal, 'user-1', 'KHOA.CNTT', 'GIANG_VIEN')).toBe(true);
    });

    it('should return false when user faculty does not match holderUnit', () => {
      expect(service.canUserActOnProposal(mockProposal, 'user-1', 'KHOA.TOAN', 'GIANG_VIEN')).toBe(false);
    });

    it('should return true for PHONG_KHCN role when holderUnit is PHONG_KHCN', () => {
      const proposal = { ...mockProposal, holderUnit: 'PHONG_KHCN' };

      expect(service.canUserActOnProposal(proposal, 'phong-khcn-user', null, 'PHONG_KHCN')).toBe(true);
    });

    it('should return false for non-PHONG_KHCN role when holderUnit is PHONG_KHCN', () => {
      const proposal = { ...mockProposal, holderUnit: 'PHONG_KHCN' };

      expect(service.canUserActOnProposal(proposal, 'regular-user', 'KHOA.CNTT', 'GIANG_VIEN')).toBe(false);
    });
  });

  describe('getHolderDisplayName', () => {
    it('should return specific user message when holderUser is set', () => {
      const result = service.getHolderDisplayName('KHOA.CNTT', 'user-123');

      expect(result).toBe('Người dùng được chỉ định');
    });

    it('should return Phòng KHCN for PHONG_KHCN unit', () => {
      const result = service.getHolderDisplayName('PHONG_KHCN', null);

      expect(result).toBe('Phòng KHCN');
    });

    it('should return faculty code for faculty unit', () => {
      const result = service.getHolderDisplayName('KHOA.CNTT', null);

      expect(result).toBe('Khoa (KHOA.CNTT)');
    });

    it('should return unassigned message when no holder', () => {
      const result = service.getHolderDisplayName(null, null);

      expect(result).toBe('Chưa phân công');
    });
  });

  describe('isTerminalQueueState', () => {
    it('should return true for terminal states', () => {
      const terminalStates = [
        ProjectState.COMPLETED,
        ProjectState.CANCELLED,
        ProjectState.REJECTED,
        ProjectState.WITHDRAWN,
      ];

      terminalStates.forEach((state) => {
        expect(service.isTerminalQueueState(state)).toBe(true);
      });
    });

    it('should return false for non-terminal states', () => {
      const nonTerminalStates = [
        ProjectState.DRAFT,
        ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
        ProjectState.APPROVED,
        ProjectState.IN_PROGRESS,
        ProjectState.PAUSED,
      ];

      nonTerminalStates.forEach((state) => {
        expect(service.isTerminalQueueState(state)).toBe(false);
      });
    });
  });

  describe('Queue Filters', () => {
    describe('getMyQueueProposalsFilter', () => {
      it('should include proposals where holderUser matches', () => {
        const filter = service.getMyQueueProposalsFilter('user-123', 'KHOA.CNTT', 'GIANG_VIEN');

        expect(filter.OR).toContainEqual({ holderUser: 'user-123' });
      });

      it('should include proposals where holderUnit matches user faculty', () => {
        const filter = service.getMyQueueProposalsFilter('user-123', 'KHOA.CNTT', 'GIANG_VIEN');

        expect(filter.OR).toContainEqual({ holderUnit: 'KHOA.CNTT' });
      });

      it('should include PHONG_KHCN proposals for PHONG_KHCN role', () => {
        const filter = service.getMyQueueProposalsFilter('user-123', null, 'PHONG_KHCN');

        expect(filter.OR).toContainEqual({ holderUnit: 'PHONG_KHCN' });
      });

      it('should exclude PHONG_KHCN proposals for non-PHONG_KHCN role', () => {
        const filter = service.getMyQueueProposalsFilter('user-123', null, 'GIANG_VIEN');

        expect(filter.OR).not.toContainEqual({ holderUnit: 'PHONG_KHCN' });
      });

      it('should exclude terminal states', () => {
        const filter = service.getMyQueueProposalsFilter('user-123', 'KHOA.CNTT', 'GIANG_VIEN');

        expect(filter.state).toHaveProperty('notIn');
        expect(filter.state.notIn).toEqual(
          expect.arrayContaining([
            ProjectState.COMPLETED,
            ProjectState.CANCELLED,
            ProjectState.REJECTED,
            ProjectState.WITHDRAWN,
          ]),
        );
      });
    });

    describe('getMyProposalsFilter', () => {
      it('should filter by ownerId', () => {
        const filter = service.getMyProposalsFilter('owner-123');

        expect(filter).toEqual({ ownerId: 'owner-123' });
      });
    });

    describe('getOverdueProposalsFilter', () => {
      it('should filter by slaDeadline and exclude terminal states', () => {
        const now = new Date('2026-01-10T12:00:00Z');
        const filter = service.getOverdueProposalsFilter(now);

        expect(filter.slaDeadline).toHaveProperty('lt', now);
        expect(filter.state.notIn).toEqual(
          expect.arrayContaining([
            ProjectState.COMPLETED,
            ProjectState.CANCELLED,
            ProjectState.REJECTED,
            ProjectState.WITHDRAWN,
            ProjectState.PAUSED,
          ]),
        );
      });

      it('should use current date by default', () => {
        const before = new Date();
        const filter = service.getOverdueProposalsFilter();
        const after = new Date();

        expect(filter.slaDeadline.lt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(filter.slaDeadline.lt.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('getUpcomingProposalsFilter', () => {
      it('should filter by slaDeadline range and exclude terminal states', () => {
        const startDate = new Date('2026-01-10T12:00:00Z');
        const endDate = new Date('2026-01-12T12:00:00Z');
        const filter = service.getUpcomingProposalsFilter(startDate, endDate);

        expect(filter.slaDeadline).toEqual({
          gte: startDate,
          lte: endDate,
        });
        expect(filter.state.notIn).toEqual(
          expect.arrayContaining([
            ProjectState.COMPLETED,
            ProjectState.CANCELLED,
            ProjectState.REJECTED,
            ProjectState.WITHDRAWN,
            ProjectState.PAUSED,
          ]),
        );
      });
    });
  });
});
