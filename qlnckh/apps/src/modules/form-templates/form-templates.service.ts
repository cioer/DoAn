import { Injectable, NotFoundException, Logger } from '@nestjs/common';
// PrismaService is exported from AuthModule - consider moving to shared module in future refactor
import { PrismaService } from '../auth/prisma.service';
import { SectionId } from '@prisma/client';
import {
  FormTemplateDto,
  FormTemplateWithSectionsDto,
  CreateFormTemplateDto,
  UpdateFormTemplateDto,
  FormSectionDto,
} from './dto';

@Injectable()
export class FormTemplatesService {
  private readonly logger = new Logger(FormTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active form templates
   */
  async findAll(includeInactive = false): Promise<FormTemplateWithSectionsDto[]> {
    const templates = await this.prisma.formTemplate.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    return templates.map(t => this.mapToDtoWithSections(t));
  }

  /**
   * Get form template by ID or code
   */
  async findOne(idOrCode: string): Promise<FormTemplateWithSectionsDto> {
    const template = await this.prisma.formTemplate.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Form template '${idOrCode}' not found`);
    }

    return this.mapToDtoWithSections(template);
  }

  /**
   * Get sections of a form template (for revision references)
   */
  async findSections(templateIdOrCode: string): Promise<FormSectionDto[]> {
    const template = await this.prisma.formTemplate.findFirst({
      where: {
        OR: [{ id: templateIdOrCode }, { code: templateIdOrCode }],
      },
      select: {
        id: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Form template '${templateIdOrCode}' not found`);
    }

    const sections = await this.prisma.formSection.findMany({
      where: { templateId: template.id },
      orderBy: { displayOrder: 'asc' },
    });

    return sections.map(s => this.mapSectionToDto(s));
  }

  /**
   * Create new form template (admin only)
   */
  async create(dto: CreateFormTemplateDto): Promise<FormTemplateWithSectionsDto> {
    const template = await this.prisma.formTemplate.create({
      data: {
        code: dto.code,
        name: dto.name,
        version: dto.version || 'v1.0',
        description: dto.description,
        isActive: dto.isActive ?? true,
        projectType: dto.projectType || 'CAP_TRUONG',
        sections: dto.sections
          ? {
              create: dto.sections.map(section => ({
                sectionId: section.sectionId as SectionId,
                label: section.label,
                component: section.component,
                displayOrder: section.displayOrder,
                isRequired: section.isRequired ?? false,
                config: section.config ?? null,
              })),
            }
          : undefined,
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Created form template: ${template.code}`);

    return this.mapToDtoWithSections(template);
  }

  /**
   * Update form template (admin only)
   */
  async update(id: string, dto: UpdateFormTemplateDto): Promise<FormTemplateWithSectionsDto> {
    const existing = await this.prisma.formTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Form template '${id}' not found`);
    }

    const template = await this.prisma.formTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Updated form template: ${template.code}`);

    return this.mapToDtoWithSections(template);
  }

  /**
   * Delete form template (admin only)
   */
  async remove(id: string): Promise<void> {
    const existing = await this.prisma.formTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Form template '${id}' not found`);
    }

    await this.prisma.formTemplate.delete({
      where: { id },
    });

    this.logger.log(`Deleted form template: ${existing.code}`);
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDtoWithSections(template: any): FormTemplateWithSectionsDto {
    return {
      id: template.id,
      code: template.code,
      name: template.name,
      version: template.version,
      description: template.description,
      isActive: template.isActive,
      projectType: template.projectType,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      sections: template.sections?.map(s => this.mapSectionToDto(s)) || [],
    };
  }

  /**
   * Map Prisma section model to DTO
   */
  private mapSectionToDto(section: any): FormSectionDto {
    return {
      id: section.id,
      templateId: section.templateId,
      sectionId: section.sectionId,
      label: section.label,
      component: section.component,
      displayOrder: section.displayOrder,
      isRequired: section.isRequired,
      config: section.config,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };
  }
}
