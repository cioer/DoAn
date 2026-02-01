import { Test, TestingModule } from '@nestjs/testing';
import { FormEngineService } from './form-engine.service';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    post: vi.fn(),
    get: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
    __mockAxiosInstance: mockAxiosInstance,
  };
});

describe('FormEngineService', () => {
  let service: FormEngineService;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    // Get the mock axios instance
    const axiosMock = await import('axios');
    mockAxiosInstance = (axiosMock as any).__mockAxiosInstance;

    // Reset mocks
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.get.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FormEngineService],
    }).compile();

    service = module.get<FormEngineService>(FormEngineService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('renderForm', () => {
    it('should render form successfully', async () => {
      const mockResult = {
        docx_path: '/output/2026-01-16/1b_123456.docx',
        pdf_path: '/output/2026-01-16/1b_123456.pdf',
        docx_url: 'http://localhost:8080/files/2026-01-16/1b_123456.docx',
        pdf_url: 'http://localhost:8080/files/2026-01-16/1b_123456.pdf',
        template: '1b.docx',
        timestamp: '2026-01-16T12:34:56.789',
        userId: 'test_user',
        proposalId: 'test_proposal',
        sha256_docx: 'abc123',
        sha256_pdf: 'def456',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          success: true,
          data: mockResult,
        },
      });

      const result = await service.renderForm({
        templateName: '1b.docx',
        context: { ten_de_tai: 'Test' },
        userId: 'test_user',
        proposalId: 'test_proposal',
      });

      expect(result).toEqual(mockResult);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/forms/render', {
        template_name: '1b.docx',
        context: { ten_de_tai: 'Test' },
        userId: 'test_user',
        proposalId: 'test_proposal',
      });
    });

    it('should throw BadRequestException for invalid template', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: "Template 'invalid.docx' không tồn tại",
          },
        },
      });

      await expect(
        service.renderForm({
          templateName: 'invalid.docx',
          context: {},
          userId: 'test_user',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ServiceUnavailableException when service is down', async () => {
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';
      mockAxiosInstance.post.mockRejectedValue(connectionError);

      await expect(
        service.renderForm({
          templateName: '1b.docx',
          context: {},
          userId: 'test_user',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getTemplates', () => {
    it('should return list of templates', async () => {
      const mockTemplates = [
        { name: '1b.docx', path: '/templates/1b.docx', size: 14712, modified: '2026-01-16T00:00:00' },
        { name: '2b.docx', path: '/templates/2b.docx', size: 21079, modified: '2026-01-16T00:00:00' },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          data: mockTemplates,
        },
      });

      const result = await service.getTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/forms/templates');
    });

    it('should return empty array on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await service.getTemplates();

      expect(result).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return health status when healthy', async () => {
      const mockHealth = {
        status: 'healthy',
        version: '1.0.0',
        templates_available: 19,
        libreoffice_available: true,
        timestamp: '2026-01-16T12:00:00',
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: mockHealth,
      });

      const result = await service.healthCheck();

      expect(result).toEqual(mockHealth);
    });

    it('should return null when service unavailable', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is healthy', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { status: 'healthy' },
      });

      const result = await service.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { status: 'unhealthy' },
      });

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false when service is unavailable', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });
  });
});
