import { WorkflowController } from './workflow.controller';
import { WorkflowAction, ProjectState, WorkflowLog } from '@prisma/client';

/**
 * Story 3.4: Tests for workflow logs endpoint
 */

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'GIANG_VIEN',
  facultyId: 'faculty-1',
};

const mockWorkflowLogs: WorkflowLog[] = [
  {
    id: 'log-2',
    proposalId: 'proposal-1',
    action: WorkflowAction.APPROVE,
    fromState: ProjectState.FACULTY_REVIEW,
    toState: ProjectState.SCHOOL_SELECTION_REVIEW,
    actorId: 'user-2',
    actorName: 'Trần Văn B',
    returnTargetState: null,
    returnTargetHolderUnit: null,
    reasonCode: null,
    comment: null,
    timestamp: new Date('2026-01-07T14:30:00.000Z'),
  },
  {
    id: 'log-1',
    proposalId: 'proposal-1',
    action: WorkflowAction.SUBMIT,
    fromState: ProjectState.DRAFT,
    toState: ProjectState.FACULTY_REVIEW,
    actorId: 'user-1',
    actorName: 'Nguyễn Văn A',
    returnTargetState: null,
    returnTargetHolderUnit: null,
    reasonCode: null,
    comment: null,
    timestamp: new Date('2026-01-06T10:00:00.000Z'),
  },
];

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let mockService: any;

  beforeEach(() => {
    // Create mock service
    mockService = {
      getWorkflowLogs: jest.fn(),
    };

    // Manually create controller with mock service - bypass DI
    controller = new WorkflowController(mockService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * AC2: getWorkflowLogs() returns entries sorted DESC
   */
  describe('getWorkflowLogs', () => {
    it('AC2.1: should return workflow logs sorted by timestamp DESC (newest first)', async () => {
      mockService.getWorkflowLogs.mockResolvedValue(mockWorkflowLogs);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('log-2'); // Newest first
      expect(result.data[1].id).toBe('log-1');
      expect(result.data[0].timestamp).toEqual(
        new Date('2026-01-07T14:30:00.000Z'),
      );
      expect(result.data[1].timestamp).toEqual(
        new Date('2026-01-06T10:00:00.000Z'),
      );
    });

    it('AC2.2: should include metadata with proposalId and total count', async () => {
      mockService.getWorkflowLogs.mockResolvedValue(mockWorkflowLogs);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      expect(result.meta).toEqual({
        proposalId: 'proposal-1',
        total: 2,
      });
    });

    it('AC2.3: should return empty array when proposal has no logs', async () => {
      mockService.getWorkflowLogs.mockResolvedValue([]);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  /**
   * AC3: All state transition log fields are included
   */
  describe('workflow log structure (AC3)', () => {
    it('AC3.1: should include all required fields in log entry', async () => {
      mockService.getWorkflowLogs.mockResolvedValue(mockWorkflowLogs);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      const log = result.data[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('proposalId');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('fromState');
      expect(log).toHaveProperty('toState');
      expect(log).toHaveProperty('actorId');
      expect(log).toHaveProperty('actorName');
      expect(log).toHaveProperty('timestamp');
    });

    it('AC3.2: should include return_target fields for RETURN actions', async () => {
      const returnLog: WorkflowLog = {
        id: 'log-3',
        proposalId: 'proposal-1',
        action: WorkflowAction.RETURN,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.CHANGES_REQUESTED,
        actorId: 'user-2',
        actorName: 'Trần Văn B',
        returnTargetState: ProjectState.FACULTY_REVIEW,
        returnTargetHolderUnit: 'KHOA.CNTT',
        reasonCode: 'MISSING_DOCUMENTS',
        comment: 'Cần bổ sung tài liệu',
        timestamp: new Date('2026-01-08T10:00:00.000Z'),
      };

      mockService.getWorkflowLogs.mockResolvedValue([returnLog]);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      const log = result.data[0];
      expect(log.action).toBe(WorkflowAction.RETURN);
      expect(log.returnTargetState).toBe(ProjectState.FACULTY_REVIEW);
      expect(log.returnTargetHolderUnit).toBe('KHOA.CNTT');
      expect(log.reasonCode).toBe('MISSING_DOCUMENTS');
      expect(log.comment).toBe('Cần bổ sung tài liệu');
    });
  });
});
