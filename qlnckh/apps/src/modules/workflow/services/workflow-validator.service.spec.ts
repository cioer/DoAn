import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkflowValidatorService } from './workflow-validator.service';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState, WorkflowAction, Proposal, User, UserRole } from '@prisma/client';

describe('WorkflowValidatorService', () => {
  let service: WorkflowValidatorService;
  let prisma: PrismaService;

  // Mock proposal
  const mockProposal: Proposal = {
    id: 'proposal-1',
    code: 'DT-001',
    state: ProjectState.DRAFT,
    ownerId: 'user-1',
    facultyId: 'KHOA.CNTT',
    holderUnit: null,
    holderUser: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    title: 'Test Proposal',
    slaStartDate: null,
    slaDeadline: null,
    projectId: null,
    templateId: null,
    workflowLogId: null,
  };

  // Mock user
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.GIANG_VIEN,
    facultyId: 'KHOA.CNTT',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowValidatorService,
        {
          provide: PrismaService,
          useValue: {
            proposal: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowValidatorService>(WorkflowValidatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProposalExists', () => {
    it('should pass when proposal exists', () => {
      expect(() => {
        service.validateProposalExists(mockProposal, 'proposal-1');
      }).not.toThrow();
    });

    it('should throw NotFoundException when proposal is null', () => {
      expect(() => {
        service.validateProposalExists(null, 'proposal-1');
      }).toThrow(NotFoundException);
      expect(() => {
        service.validateProposalExists(null, 'proposal-1');
      }).toThrow('Đề tài không tồn tại');
    });
  });

  describe('validateProposalOwnership', () => {
    it('should pass when owner performs SUBMIT', () => {
      expect(() => {
        service.validateProposalOwnership(
          mockProposal,
          { id: 'user-1', role: UserRole.GIANG_VIEN },
          WorkflowAction.SUBMIT,
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException when non-owner tries to SUBMIT', () => {
      expect(() => {
        service.validateProposalOwnership(
          mockProposal,
          { id: 'user-2', role: UserRole.GIANG_VIEN },
          WorkflowAction.SUBMIT,
        );
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateProposalOwnership(
          mockProposal,
          { id: 'user-2', role: UserRole.GIANG_VIEN },
          WorkflowAction.SUBMIT,
        );
      }).toThrow('Chỉ chủ nhiệm đề tài mới có thể nộp hồ sơ');
    });

    it('should throw BadRequestException when non-owner tries to WITHDRAW', () => {
      expect(() => {
        service.validateProposalOwnership(
          mockProposal,
          { id: 'user-2', role: UserRole.GIANG_VIEN },
          WorkflowAction.WITHDRAW,
        );
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateProposalOwnership(
          mockProposal,
          { id: 'user-2', role: UserRole.GIANG_VIEN },
          WorkflowAction.WITHDRAW,
        );
      }).toThrow('Chỉ chủ nhiệm đề tài mới có thể rút hồ sơ');
    });

    it('should allow non-owner to APPROVE (ownership not required)', () => {
      expect(() => {
        service.validateProposalOwnership(
          mockProposal,
          { id: 'user-2', role: UserRole.KHOA },
          WorkflowAction.APPROVE,
        );
      }).not.toThrow();
    });
  });

  describe('validateProposalState', () => {
    it('should pass when proposal is in expected state', () => {
      expect(() => {
        service.validateProposalState(
          mockProposal,
          ProjectState.DRAFT,
          WorkflowAction.SUBMIT,
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException when state does not match', () => {
      const proposalInReview = { ...mockProposal, state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW };

      expect(() => {
        service.validateProposalState(
          proposalInReview,
          ProjectState.DRAFT,
          WorkflowAction.SUBMIT,
        );
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateProposalState(
          proposalInReview,
          ProjectState.DRAFT,
          WorkflowAction.SUBMIT,
        );
      }).toThrow('Chỉ có thể thực hiện SUBMIT khi đề tài ở trạng thái DRAFT');
    });
  });

  describe('validateRevisionSections', () => {
    it('should pass with valid sections', () => {
      expect(() => {
        service.validateRevisionSections(['section-1', 'section-2', 'section-3']);
      }).not.toThrow();
    });

    it('should throw BadRequestException when sections array is empty', () => {
      expect(() => {
        service.validateRevisionSections([]);
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateRevisionSections([]);
      }).toThrow('Phải chỉ định các mục cần sửa đổi khi yêu cầu sửa lại');
    });

    it('should throw BadRequestException when sections is null', () => {
      expect(() => {
        service.validateRevisionSections(null as any);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when section ID is empty string', () => {
      expect(() => {
        service.validateRevisionSections(['section-1', '', 'section-2']);
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateRevisionSections(['section-1', '', 'section-2']);
      }).toThrow('ID mục không được để trống');
    });

    it('should throw BadRequestException when section ID is only whitespace', () => {
      expect(() => {
        service.validateRevisionSections(['section-1', '   ', 'section-2']);
      }).toThrow(BadRequestException);
    });
  });

  describe('validateReturnReason', () => {
    it('should pass with valid reason', () => {
      expect(() => {
        service.validateReturnReason('Cần bổ sung tính năng mới');
      }).not.toThrow();
    });

    it('should throw BadRequestException when reason is empty', () => {
      expect(() => {
        service.validateReturnReason('');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateReturnReason('');
      }).toThrow('Phải cung cấp lý do khi yêu cầu sửa lại');
    });

    it('should throw BadRequestException when reason is null', () => {
      expect(() => {
        service.validateReturnReason(null as any);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reason is only whitespace', () => {
      expect(() => {
        service.validateReturnReason('   ');
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reason is too short (< 10 chars)', () => {
      expect(() => {
        service.validateReturnReason('ngắn');
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateReturnReason('ngắn');
      }).toThrow('Lý do phải có ít nhất 10 ký tự');
    });
  });

  describe('validateExceptionAction', () => {
    it('should allow PKHCN to PAUSE proposal', () => {
      const pausedProposal = { ...mockProposal, state: ProjectState.IN_PROGRESS };

      expect(() => {
        service.validateExceptionAction(
          pausedProposal,
          WorkflowAction.PAUSE,
          'PKHCN',
        );
      }).not.toThrow();
    });

    it('should throw ForbiddenException when non-PKHCN tries to PAUSE', () => {
      const pausedProposal = { ...mockProposal, state: ProjectState.IN_PROGRESS };

      expect(() => {
        service.validateExceptionAction(
          pausedProposal,
          WorkflowAction.PAUSE,
          'KHOA',
        );
      }).toThrow(ForbiddenException);
      expect(() => {
        service.validateExceptionAction(
          pausedProposal,
          WorkflowAction.PAUSE,
          'KHOA',
        );
      }).toThrow('Chỉ PKHCN mới có thể tạm dừng đề tài');
    });

    it('should allow PKHCN to RESUME paused proposal', () => {
      const pausedProposal = { ...mockProposal, state: ProjectState.PAUSED };

      expect(() => {
        service.validateExceptionAction(
          pausedProposal,
          WorkflowAction.RESUME,
          'PKHCN',
        );
      }).not.toThrow();
    });

    it('should throw ForbiddenException when non-PKHCN tries to RESUME', () => {
      const pausedProposal = { ...mockProposal, state: ProjectState.PAUSED };

      expect(() => {
        service.validateExceptionAction(
          pausedProposal,
          WorkflowAction.RESUME,
          'KHOA',
        );
      }).toThrow(ForbiddenException);
      expect(() => {
        service.validateExceptionAction(
          pausedProposal,
          WorkflowAction.RESUME,
          'KHOA',
        );
      }).toThrow('Chỉ PKHCN mới có thể tiếp tục đề tài đã tạm dừng');
    });

    it('should allow owner to CANCEL DRAFT proposal', () => {
      expect(() => {
        service.validateExceptionAction(
          mockProposal,
          WorkflowAction.CANCEL,
          UserRole.GIANG_VIEN,
        );
      }).not.toThrow();
    });

    it('should allow owner to CANCEL PAUSED proposal', () => {
      const pausedProposal = { ...mockProposal, state: ProjectState.PAUSED };

      expect(() => {
        service.validateExceptionAction(
          pausedProposal,
          WorkflowAction.CANCEL,
          UserRole.GIANG_VIEN,
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException when trying to CANCEL non-DRAFT/PAUSED proposal', () => {
      const inProgressProposal = { ...mockProposal, state: ProjectState.IN_PROGRESS };

      expect(() => {
        service.validateExceptionAction(
          inProgressProposal,
          WorkflowAction.CANCEL,
          UserRole.GIANG_VIEN,
        );
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateExceptionAction(
          inProgressProposal,
          WorkflowAction.CANCEL,
          UserRole.GIANG_VIEN,
        );
      }).toThrow('Chỉ có thể hủy đề tài ở trạng thái NHÁP hoặc ĐÃ TẠM DỪNG');
    });
  });

  describe('validateApprovalAction', () => {
    it('should allow KHOA to approve FACULTY_REVIEW proposal', () => {
      const facultyReviewProposal = { ...mockProposal, state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW };

      expect(() => {
        service.validateApprovalAction(
          facultyReviewProposal,
          WorkflowAction.APPROVE,
          'KHOA',
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException when KHOA tries to approve non-FACULTY_REVIEW', () => {
      expect(() => {
        service.validateApprovalAction(
          mockProposal, // DRAFT state
          WorkflowAction.APPROVE,
          'KHOA',
        );
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateApprovalAction(
          mockProposal,
          WorkflowAction.APPROVE,
          'KHOA',
        );
      }).toThrow('Chỉ có thể duyệt khi đề tài đang được Khoa xem xét');
    });

    it('should allow PHONG_KHCN to approve SCHOOL_SELECTION_REVIEW', () => {
      const schoolReviewProposal = { ...mockProposal, state: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW };

      expect(() => {
        service.validateApprovalAction(
          schoolReviewProposal,
          WorkflowAction.APPROVE,
          'PHONG_KHCN',
        );
      }).not.toThrow();
    });

    it('should allow PHONG_KHCN to approve OUTLINE_COUNCIL_REVIEW', () => {
      const councilReviewProposal = { ...mockProposal, state: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW };

      expect(() => {
        service.validateApprovalAction(
          councilReviewProposal,
          WorkflowAction.APPROVE,
          'PHONG_KHCN',
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException when PHONG_KHCN tries to approve wrong state', () => {
      expect(() => {
        service.validateApprovalAction(
          mockProposal, // DRAFT state
          WorkflowAction.APPROVE,
          'PHONG_KHCN',
        );
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateApprovalAction(
          mockProposal,
          WorkflowAction.APPROVE,
          'PHONG_KHCN',
        );
      }).toThrow('Chỉ có thể duyệt khi đề tài đang được Phòng KHCN xem xét');
    });
  });

  describe('validateTerminalState', () => {
    it('should throw BadRequestException when trying to APPROVE terminal state', () => {
      const completedProposal = { ...mockProposal, state: ProjectState.COMPLETED };

      expect(() => {
        service.validateTerminalState(
          completedProposal,
          WorkflowAction.APPROVE,
        );
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateTerminalState(
          completedProposal,
          WorkflowAction.APPROVE,
        );
      }).toThrow('Không thể thực hiện hành động APPROVE khi đề tài ở trạng thái cuối');
    });

    it('should throw BadRequestException when trying to SUBMIT terminal state', () => {
      const rejectedProposal = { ...mockProposal, state: ProjectState.REJECTED };

      expect(() => {
        service.validateTerminalState(
          rejectedProposal,
          WorkflowAction.SUBMIT,
        );
      }).toThrow(BadRequestException);
    });

    it('should pass when action is not blocked for terminal state', () => {
      const withdrawnProposal = { ...mockProposal, state: ProjectState.WITHDRAWN };

      expect(() => {
        service.validateTerminalState(
          withdrawnProposal,
          WorkflowAction.WITHDRAW, // Already withdrawn, not blocked
        );
      }).not.toThrow();
    });
  });
});
