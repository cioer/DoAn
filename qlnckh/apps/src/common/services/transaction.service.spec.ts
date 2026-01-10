import { TransactionService } from './transaction.service';
import { ProjectState, WorkflowAction } from '@prisma/client';
import { PrismaService } from '../../modules/auth/prisma.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let mockPrisma: PrismaService;

  beforeEach(() => {
    // Create a complete mock PrismaService
    mockPrisma = {
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $use: jest.fn(),
      $on: jest.fn(),
      proposal: {
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      workflowLog: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
    } as unknown as PrismaService;

    // Create service instance manually with mock Prisma
    service = new TransactionService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should execute simple transaction', async () => {
      const mockResult = { id: '1', data: 'test' };
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(mockResult);

      const transactionFn = jest.fn().mockResolvedValue(mockResult);
      const result = await service.execute(transactionFn);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Note: transactionFn is passed to $transaction, so it won't be called directly
      // The mock $transaction resolves without calling the passed function
    });

    it('should rollback on error', async () => {
      const error = new Error('Transaction failed');
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(error);

      const transactionFn = jest.fn().mockRejectedValue(error);

      await expect(service.execute(transactionFn)).rejects.toThrow('Transaction failed');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should execute workflow transition', async () => {
      const mockProposal = {
        id: 'prop-1',
        state: ProjectState.FACULTY_REVIEW,
      };
      const mockLog = {
        id: 'log-1',
        proposalId: 'prop-1',
        action: WorkflowAction.APPROVE,
      };

      const mockTx = {
        proposal: {
          update: jest.fn().mockResolvedValue(mockProposal),
        },
        workflowLog: {
          create: jest.fn().mockResolvedValue(mockLog),
        },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        return await fn(mockTx as any);
      });

      const context = {
        proposalId: 'prop-1',
        userId: 'user-1',
        action: 'APPROVE',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
      };

      const transactionFn = jest.fn().mockResolvedValue({
        proposal: mockProposal,
        workflowLog: mockLog,
      });

      const result = await service.executeWorkflowTransition(context, transactionFn);

      expect(result.proposal).toEqual(mockProposal);
      expect(result.workflowLog).toEqual(mockLog);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should update proposal with log', async () => {
      const mockProposal = {
        id: 'prop-1',
        state: ProjectState.FACULTY_REVIEW,
        holderUnit: 'KHOA.CNTT',
      };
      const mockLog = {
        id: 'log-1',
        proposalId: 'prop-1',
      };

      const mockTx = {
        proposal: {
          update: jest.fn().mockResolvedValue(mockProposal),
        },
        workflowLog: {
          create: jest.fn().mockResolvedValue(mockLog),
        },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        return await fn(mockTx as any);
      });

      const context = {
        proposalId: 'prop-1',
        userId: 'user-1',
        userDisplayName: 'Test User',
        action: WorkflowAction.APPROVE,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        holderUnit: 'KHOA.CNTT',
      };

      const result = await service.updateProposalWithLog(context);

      expect(result.proposal).toEqual(mockProposal);
      expect(result.workflowLog).toEqual(mockLog);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should execute with retry on serialization failure', async () => {
      const mockResult = { id: '1' };
      const serializationError = { code: 'P2034', message: 'Serialization failure' };

      // First two attempts fail, third succeeds
      (mockPrisma.$transaction as jest.Mock)
        .mockRejectedValueOnce(serializationError)
        .mockRejectedValueOnce(serializationError)
        .mockResolvedValueOnce(mockResult);

      const transactionFn = jest.fn().mockResolvedValue(mockResult);
      const result = await service.executeWithRetry(transactionFn, 3);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exhausted', async () => {
      const serializationError = { code: 'P2034', message: 'Serialization failure' };
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(serializationError);

      const transactionFn = jest.fn().mockRejectedValue(serializationError);

      await expect(service.executeWithRetry(transactionFn, 3)).rejects.toMatchObject({
        code: 'P2034',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-serialization errors', async () => {
      const otherError = new Error('Some other error');
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(otherError);

      const transactionFn = jest.fn().mockRejectedValue(otherError);

      await expect(service.executeWithRetry(transactionFn, 3)).rejects.toThrow('Some other error');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('Health Check', () => {
    it('should return true when database is healthy', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return false when database is unhealthy', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Get Stats', () => {
    it('should return service stats', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('prismaClient');
      // Since we're using a mock object, the constructor name will be 'Object'
      expect(stats.prismaClient).toBe('Object');
    });
  });

  describe('updateProposalSections', () => {
    it('should update proposal sections', async () => {
      const mockProposal = {
        id: 'prop-1',
        sections: { section1: 'data1' },
      };

      const mockTx = {
        proposal: {
          update: jest.fn().mockResolvedValue(mockProposal),
        },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        return await fn(mockTx as any);
      });

      const sections = { section1: 'data1', section2: 'data2' };
      const result = await service.updateProposalSections('prop-1', sections);

      expect(result.proposal).toEqual(mockProposal);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should execute additional transaction logic', async () => {
      const mockProposal = {
        id: 'prop-1',
        sections: { section1: 'data1' },
      };
      const mockAdditional = { logId: 'log-1' };

      const mockTx = {
        proposal: {
          update: jest.fn().mockResolvedValue(mockProposal),
        },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        return await fn(mockTx as any);
      });

      const sections = { section1: 'data1' };
      const additionalFn = jest.fn().mockResolvedValue(mockAdditional);

      const result = await service.updateProposalSections('prop-1', sections, additionalFn);

      expect(result.proposal).toEqual(mockProposal);
      expect(result.additional).toEqual(mockAdditional);
      expect(additionalFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('batchUpdateProposals', () => {
    it('should batch update multiple proposals', async () => {
      const mockProposals = [
        { id: 'prop-1', state: ProjectState.FACULTY_REVIEW },
        { id: 'prop-2', state: ProjectState.FACULTY_REVIEW },
      ];
      const mockLogs = [
        { id: 'log-1', proposalId: 'prop-1' },
        { id: 'log-2', proposalId: 'prop-2' },
      ];

      const mockTx = {
        proposal: {
          update: jest.fn().mockImplementation(({ where }: any) =>
            Promise.resolve(mockProposals.find((p) => p.id === where.id)),
          ),
        },
        workflowLog: {
          create: jest.fn().mockImplementation(({ data }: any) =>
            Promise.resolve(mockLogs.find((l) => l.proposalId === data.proposalId)),
          ),
        },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        return await fn(mockTx as any);
      });

      const proposalIds = ['prop-1', 'prop-2'];
      const updateData = { state: ProjectState.FACULTY_REVIEW };
      const createLogFn = jest.fn((proposalId: string) => ({ proposalId, action: 'APPROVE' }));

      const result = await service.batchUpdateProposals(proposalIds, updateData, createLogFn);

      expect(result.proposals).toHaveLength(2);
      expect(result.workflowLogs).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle transaction errors gracefully', async () => {
      const error = new Error('DB error');
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(error);

      const transactionFn = jest.fn().mockResolvedValue({ id: '1' });

      await expect(
        service.executeWorkflowTransition(
          {
            proposalId: 'prop-1',
            userId: 'user-1',
            action: 'APPROVE',
            fromState: ProjectState.DRAFT,
            toState: ProjectState.FACULTY_REVIEW,
          },
          transactionFn,
        ),
      ).rejects.toThrow('DB error');
    });

    it('should log health check failures', async () => {
      const error = new Error('Connection failed');
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(error);
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await service.healthCheck();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Transaction service health check failed',
        error,
      );

      loggerSpy.mockRestore();
    });
  });
});
