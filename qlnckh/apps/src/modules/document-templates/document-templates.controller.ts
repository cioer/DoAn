import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, DocumentTemplateType } from '@prisma/client';
import { DocumentTemplatesService } from './document-templates.service';
import { UploadTemplateDto } from './dto';

/**
 * Request user interface
 */
interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  facultyId?: string | null;
}

/**
 * Document Templates Controller
 *
 * Manages DOCX template uploads, downloads, and activation.
 * RBAC: Only ADMIN and PHONG_KHCN can manage templates.
 *
 * Epic 7 Story 7.2: Template Upload & Registry
 *
 * Epic 6 Retro Learnings Applied:
 * 1. RBAC guards using @RequireRoles decorator
 * 2. Proper DTO mapping (no `as unknown`)
 * 3. WorkflowAction enum for audit logging
 *
 * @example
 * // Upload template
 * POST /templates/upload
 * {
 *   "name": "Mẫu đề cương 2024",
 *   "description": "Mẫu đề cương đề tài chuẩn",
 *   "templateType": "PROPOSAL_OUTLINE"
 * }
 */
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentTemplatesController {
  constructor(
    private readonly templatesService: DocumentTemplatesService,
  ) {}

  /**
   * Get all templates
   *
   * RBAC: ADMIN, PHONG_KHCN
   */
  @Get()
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  async findAll() {
    const templates = await this.templatesService.findAll();
    return {
      success: true,
      data: templates.map((t) => this.templatesService.toResponseDto(t)),
    };
  }

  /**
   * Get active template by type
   *
   * RBAC: All authenticated users
   */
  @Get('active/:type')
  async getActiveTemplate(@Param('type') type: string) {
    // Validate template type (Epic 6 pattern - no `as any`)
    if (!Object.values(DocumentTemplateType).includes(type as DocumentTemplateType)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_TYPE',
          message: 'Loại template không hợp lệ',
        },
      });
    }

    const template = await this.templatesService.getActiveTemplate(type as DocumentTemplateType);
    if (!template) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'NO_ACTIVE_TEMPLATE',
          message: 'Không có template nào đang hoạt động cho loại này',
        },
      });
    }
    return {
      success: true,
      data: this.templatesService.toResponseDto(template),
    };
  }

  /**
   * Get template by ID
   *
   * RBAC: ADMIN, PHONG_KHCN
   */
  @Get(':id')
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  async findOne(@Param('id') id: string) {
    const template = await this.templatesService.findOne(id);
    return {
      success: true,
      data: template,
    };
  }

  /**
   * Upload new template
   *
   * RBAC: ADMIN, PHONG_KHCN
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  async uploadTemplate(
    @UploadedFile() file: any,
    @Body() dto: UploadTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'Vui lòng chọn file template',
        },
      });
    }

    // Proper DTO mapping - following Epic 6 pattern
    const result = await this.templatesService.uploadTemplate(
      file,
      dto.name,
      dto.description,
      dto.templateType,
      dto.isActive ?? false,
      user.id,
      {}, // Context will be populated by middleware
    );

    return {
      success: true,
      data: {
        template: this.templatesService.toResponseDto(result.template),
        validation: result.validation,
      },
      message: 'Upload template thành công',
    };
  }

  /**
   * Activate template
   *
   * Deactivates other templates of the same type.
   *
   * RBAC: ADMIN, PHONG_KHCN
   */
  @Post(':id/activate')
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  async activate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const template = await this.templatesService.activate(id, user.id, {});

    return {
      success: true,
      data: this.templatesService.toResponseDto(template),
      message: 'Kích hoạt template thành công',
    };
  }

  /**
   * Delete template (soft delete)
   *
   * RBAC: ADMIN, PHONG_KHCN
   */
  @Delete(':id')
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.templatesService.delete(id, user.id, {});

    return {
      success: true,
      message: 'Xóa template thành công',
    };
  }

  /**
   * Download template file
   *
   * RBAC: ADMIN, PHONG_KHCN
   */
  @Get(':id/download')
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  async download(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName, mimeType } = await this.templatesService.downloadFile(id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  /**
   * Get known placeholders for reference
   *
   * RBAC: All authenticated users
   */
  @Get('placeholders/reference')
  async getPlaceholders() {
    const placeholders = this.templatesService.getKnownPlaceholders();
    return {
      success: true,
      data: placeholders,
    };
  }
}
