import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  RenderFormDto,
  RenderFormResult,
  TemplateInfo,
  FormEngineHealth,
  FormEngineApiResponse,
} from './dto';

/**
 * Form Engine Service
 *
 * Client for the Python FormEngine microservice.
 * Provides advanced document generation capabilities:
 * - Smart variable replacement (handles split XML runs)
 * - PDF conversion via LibreOffice
 * - Dynamic table generation
 * - List alignment preservation
 * - Non-breaking spaces for dates
 *
 * Epic 7 Integration: Enhanced document generation for qlNCKH
 */
@Injectable()
export class FormEngineService {
  private readonly logger = new Logger(FormEngineService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.FORM_ENGINE_URL || 'http://localhost:8080';
    const timeout = parseInt(process.env.FORM_ENGINE_TIMEOUT || '30000', 10);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`FormEngine client initialized: ${this.baseUrl}`);
  }

  /**
   * Render a form template with provided context
   *
   * @param dto - Render request with template name and context
   * @returns Generated document paths and metadata
   * @throws BadRequestException if template not found
   * @throws ServiceUnavailableException if service unavailable
   */
  async renderForm(dto: RenderFormDto): Promise<RenderFormResult> {
    try {
      const response = await this.client.post<FormEngineApiResponse<RenderFormResult>>(
        '/api/v1/forms/render',
        {
          template_name: dto.templateName,
          context: dto.context,
          userId: dto.userId,
          proposalId: dto.proposalId,
        },
      );

      if (!response.data.success) {
        const error = response.data.error;
        this.logger.error(`FormEngine render failed: ${error?.code} - ${error?.message}`);

        if (error?.code === 'TEMPLATE_NOT_FOUND') {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: error.message || `Template '${dto.templateName}' không tồn tại`,
            },
          });
        }

        throw new BadRequestException({
          success: false,
          error: {
            code: error?.code || 'RENDER_ERROR',
            message: error?.message || 'Lỗi tạo tài liệu',
          },
        });
      }

      this.logger.log(
        `Document rendered: ${dto.templateName} -> ${response.data.data?.docx_path}`,
      );

      return response.data.data!;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
        this.logger.error(`FormEngine service unavailable: ${axiosError.message}`);
        throw new ServiceUnavailableException({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Form Engine service không khả dụng. Vui lòng thử lại sau.',
          },
        });
      }

      this.logger.error(`FormEngine error: ${axiosError.message}`);
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FORM_ENGINE_ERROR',
          message: axiosError.message || 'Lỗi không xác định từ Form Engine',
        },
      });
    }
  }

  /**
   * Get list of available templates
   *
   * @returns Array of template info
   */
  async getTemplates(): Promise<TemplateInfo[]> {
    try {
      const response = await this.client.get<FormEngineApiResponse<TemplateInfo[]>>(
        '/api/v1/forms/templates',
      );

      if (!response.data.success) {
        this.logger.error('Failed to fetch templates list');
        return [];
      }

      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Failed to fetch templates: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get info about a specific template
   *
   * @param templateName - Name of the template file
   * @returns Template info or null if not found
   */
  async getTemplateInfo(templateName: string): Promise<TemplateInfo | null> {
    try {
      const response = await this.client.get<FormEngineApiResponse<TemplateInfo>>(
        `/api/v1/forms/templates/${encodeURIComponent(templateName)}`,
      );

      if (!response.data.success) {
        return null;
      }

      return response.data.data || null;
    } catch (error) {
      this.logger.error(`Failed to fetch template info: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Check if FormEngine service is healthy
   *
   * @returns Health status or null if unavailable
   */
  async healthCheck(): Promise<FormEngineHealth | null> {
    try {
      const response = await this.client.get<FormEngineHealth>('/api/v1/health', {
        timeout: 5000, // Short timeout for health checks
      });

      return response.data;
    } catch (error) {
      this.logger.warn(`FormEngine health check failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Check if FormEngine service is available
   *
   * @returns true if service is healthy
   */
  async isAvailable(): Promise<boolean> {
    const health = await this.healthCheck();
    return health?.status === 'healthy';
  }

  /**
   * Get the base URL of the FormEngine service
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get sample data for a specific form template
   *
   * @param formId - Form identifier (e.g., "1b", "2b", "pl1")
   * @param isApproved - Whether to generate "approved" variant (default: true)
   * @returns Sample context data that can be used to render the form
   * @throws BadRequestException if form_id is invalid or service error
   */
  async getSampleData(formId: string, isApproved: boolean = true): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.get<FormEngineApiResponse<Record<string, unknown>>>(
        `/api/v1/forms/sample-data/${encodeURIComponent(formId)}`,
        {
          params: { is_approved: isApproved },
        },
      );

      if (!response.data.success) {
        const error = response.data.error;
        this.logger.error(`Failed to fetch sample data for ${formId}: ${error?.code}`);

        throw new BadRequestException({
          success: false,
          error: {
            code: error?.code || 'SAMPLE_DATA_ERROR',
            message: error?.message || `Không thể lấy dữ liệu mẫu cho form '${formId}'`,
          },
        });
      }

      return response.data.data || {};
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
        this.logger.error(`FormEngine service unavailable: ${axiosError.message}`);
        throw new ServiceUnavailableException({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Form Engine service không khả dụng. Vui lòng thử lại sau.',
          },
        });
      }

      this.logger.error(`Failed to fetch sample data: ${(error as Error).message}`);
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FORM_ENGINE_ERROR',
          message: 'Lỗi khi lấy dữ liệu mẫu từ Form Engine',
        },
      });
    }
  }
}
