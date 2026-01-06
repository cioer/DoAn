import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { SectionId } from '@prisma/client';

/**
 * Validation error detail
 */
export interface ValidationError {
  sectionId: SectionId;
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  missingRequiredSections: SectionId[];
}

/**
 * Form Data Validation Service
 *
 * Validates form data against form template requirements.
 * Checks required fields and validates data types.
 */
@Injectable()
export class FormDataValidationService {
  private readonly logger = new Logger(FormDataValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate form data against template requirements
   *
   * @param templateId - Form template ID
   * @param formData - Form data to validate
   * @returns Validation result with errors if any
   */
  async validate(
    templateId: string,
    formData: Record<string, unknown> | null | undefined,
  ): Promise<ValidationResult> {
    // If no form data, it's valid (user hasn't started filling)
    if (!formData || Object.keys(formData).length === 0) {
      return {
        isValid: true,
        errors: [],
        missingRequiredSections: [],
      };
    }

    // Get template sections
    const template = await this.prisma.formTemplate.findFirst({
      where: {
        OR: [{ id: templateId }, { code: templateId }],
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!template) {
      this.logger.warn(`Template ${templateId} not found for validation`);
      return {
        isValid: false,
        errors: [],
        missingRequiredSections: [],
      };
    }

    const errors: ValidationError[] = [];
    const missingRequiredSections: SectionId[] = [];

    // Check each required section
    for (const section of template.sections) {
      if (section.isRequired) {
        const sectionData = formData[section.sectionId];

        // Check if section exists in form data
        if (!sectionData || typeof sectionData !== 'object') {
          missingRequiredSections.push(section.sectionId);
          continue;
        }

        // Validate section data based on section type
        const sectionErrors = this.validateSection(
          section.sectionId,
          sectionData as Record<string, unknown>,
          section.config as Record<string, unknown> | null,
        );
        errors.push(...sectionErrors);
      }
    }

    const isValid = errors.length === 0 && missingRequiredSections.length === 0;

    return {
      isValid,
      errors,
      missingRequiredSections,
    };
  }

  /**
   * Validate a single section's data
   *
   * @param sectionId - Section ID
   * @param sectionData - Section data
   * @param config - Section config from template
   * @returns Array of validation errors
   */
  private validateSection(
    sectionId: SectionId,
    sectionData: Record<string, unknown>,
    config: Record<string, unknown> | null,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (sectionId) {
      case SectionId.SEC_INFO_GENERAL:
        errors.push(...this.validateInfoGeneral(sectionData));
        break;
      case SectionId.SEC_BUDGET:
        errors.push(...this.validateBudget(sectionData));
        break;
      case SectionId.SEC_TIMELINE:
        errors.push(...this.validateTimeline(sectionData));
        break;
      // Other sections have basic validation
      default:
        // Check if section has at least some data
        if (Object.keys(sectionData).length === 0) {
          errors.push({
            sectionId,
            field: '_section',
            message: `Phần ${sectionId} không có dữ liệu`,
          });
        }
    }

    return errors;
  }

  /**
   * Validate SEC_INFO_GENERAL section
   * Required fields: title, objective, field, duration, startDate
   */
  private validateInfoGeneral(data: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredFields = [
      'title',
      'objective',
      'field',
      'duration',
      'startDate',
    ];

    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && !data[field]?.trim())) {
        errors.push({
          sectionId: SectionId.SEC_INFO_GENERAL,
          field,
          message: `Trường ${field} là bắt buộc`,
        });
      }
    }

    // Validate duration is positive number
    if (data.duration !== undefined) {
      const duration = Number(data.duration);
      if (isNaN(duration) || duration <= 0) {
        errors.push({
          sectionId: SectionId.SEC_INFO_GENERAL,
          field: 'duration',
          message: 'Thời gian thực hiện phải là số dương',
        });
      }
    }

    return errors;
  }

  /**
   * Validate SEC_BUDGET section
   * Required fields: total, sources
   */
  private validateBudget(data: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate total
    if (!data.total || isNaN(Number(data.total)) || Number(data.total) <= 0) {
      errors.push({
        sectionId: SectionId.SEC_BUDGET,
        field: 'total',
        message: 'Tổng kinh phí phải là số dương',
      });
    }

    // Validate sources array
    if (!Array.isArray(data.sources) || data.sources.length === 0) {
      errors.push({
        sectionId: SectionId.SEC_BUDGET,
        field: 'sources',
        message: 'Phải có ít nhất một nguồn kinh phí',
      });
    } else {
      // Validate each source has name and amount
      const sources = data.sources as Array<Record<string, unknown>>;
      sources.forEach((source, index) => {
        if (!source.name || typeof source.name !== 'string') {
          errors.push({
            sectionId: SectionId.SEC_BUDGET,
            field: `sources[${index}].name`,
            message: 'Tên nguồn kinh phí là bắt buộc',
          });
        }
        if (!source.amount || isNaN(Number(source.amount))) {
          errors.push({
            sectionId: SectionId.SEC_BUDGET,
            field: `sources[${index}].amount`,
            message: 'Số tiền phải là số hợp lệ',
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate SEC_TIMELINE section
   * Required fields: phases (array)
   */
  private validateTimeline(data: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(data.phases) || data.phases.length === 0) {
      errors.push({
        sectionId: SectionId.SEC_TIMELINE,
        field: 'phases',
        message: 'Phải có ít nhất một giai đoạn',
      });
    } else {
      const phases = data.phases as Array<Record<string, unknown>>;
      phases.forEach((phase, index) => {
        if (!phase.name || typeof phase.name !== 'string') {
          errors.push({
            sectionId: SectionId.SEC_TIMELINE,
            field: `phases[${index}].name`,
            message: 'Tên giai đoạn là bắt buộc',
          });
        }
        if (!phase.startDate || !phase.endDate) {
          errors.push({
            sectionId: SectionId.SEC_TIMELINE,
            field: `phases[${index}].dates`,
            message: 'Ngày bắt đầu và kết thúc là bắt buộc',
          });
        }
      });
    }

    return errors;
  }

  /**
   * Get required sections for a template
   *
   * @param templateId - Form template ID
   * @returns Array of required section IDs
   */
  async getRequiredSections(templateId: string): Promise<SectionId[]> {
    const sections = await this.prisma.formSection.findMany({
      where: {
        templateId,
        isRequired: true,
      },
      select: {
        sectionId: true,
      },
    });

    return sections.map((s) => s.sectionId);
  }
}
