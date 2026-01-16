import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { GenerateDocDto, GenerateFormDto } from './dto/generate-doc.dto';

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
 * Documents Controller
 *
 * Manages DOCX document generation and downloads.
 * RBAC: GIANG_VIEN, QUAN_LY_KHOA, PHONG_KHCN, ADMIN
 *
 * Epic 7 Story 7.3: DOCX Generation + RBAC Download
 *
 * Epic 6 Retro Learnings Applied:
 * 1. RBAC guards using @RequireRoles decorator
 * 2. Proper DTO mapping (no `as unknown`)
 * 3. WorkflowAction enum for audit logging
 */
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Generate DOCX document for a proposal
   *
   * RBAC: Owner, QUAN_LY_KHOA (same faculty), PHONG_KHCN, ADMIN
   */
  @Post('proposals/:id/generate')
  @RequireRoles(
    UserRole.GIANG_VIEN,
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.ADMIN,
  )
  async generateDocument(
    @Param('id') proposalId: string,
    @Body() dto: GenerateDocDto,
    @CurrentUser() user: RequestUser,
  ) {
    // Proper DTO mapping - following Epic 6 pattern
    const document = await this.documentsService.generateDocument(
      proposalId,
      dto,
      user,
    );

    return {
      success: true,
      data: this.documentsService.toResponseDto(document),
      message: 'Tạo tài liệu thành công',
    };
  }

  /**
   * Get documents for a proposal
   *
   * RBAC: Owner, QUAN_LY_KHOA (same faculty), PHONG_KHCN, ADMIN
   */
  @Get('proposals/:id')
  @RequireRoles(
    UserRole.GIANG_VIEN,
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.ADMIN,
  )
  async getProposalDocuments(
    @Param('id') proposalId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const documents = await this.documentsService.getProposalDocuments(
      proposalId,
      user,
    );

    return {
      success: true,
      data: documents.map((doc) =>
        this.documentsService.toResponseDto(doc),
      ),
    };
  }

  /**
   * Download document
   *
   * RBAC: Owner, QUAN_LY_KHOA (same faculty), PHONG_KHCN, ADMIN
   */
  @Get(':id/download')
  @RequireRoles(
    UserRole.GIANG_VIEN,
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.ADMIN,
  )
  async download(
    @Param('id') documentId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } =
      await this.documentsService.downloadDocument(documentId, user);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  /**
   * Verify document integrity
   *
   * RBAC: ADMIN only
   */
  @Post(':id/verify')
  @RequireRoles(UserRole.ADMIN)
  async verifyIntegrity(
    @Param('id') documentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.documentsService.verifyIntegrity(documentId, user.id);

    return {
      success: true,
      data: result,
      message: result.valid ? 'Tài liệu hợp lệ' : 'Tài liệu không khớp',
    };
  }

  // ============================================================
  // FormEngine Integration Endpoints
  // ============================================================

  /**
   * Generate document using FormEngine (Python microservice)
   *
   * Supports all 18 form templates (1b-18b) with:
   * - Smart variable replacement
   * - PDF conversion via LibreOffice
   * - Dynamic table generation
   *
   * RBAC: GIANG_VIEN, QUAN_LY_KHOA, PHONG_KHCN, ADMIN
   */
  @Post('proposals/:id/generate-form')
  @RequireRoles(
    UserRole.GIANG_VIEN,
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.ADMIN,
  )
  async generateFormDocument(
    @Param('id') proposalId: string,
    @Body() dto: GenerateFormDto,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.documentsService.generateFormDocument(
      proposalId,
      dto,
      user,
    );

    return {
      success: true,
      data: result,
      message: `Tạo biểu mẫu ${dto.templateType} thành công`,
    };
  }

  /**
   * Get available form templates from FormEngine
   *
   * Returns list of all 18 templates with descriptions
   * RBAC: Any authenticated user
   */
  @Get('form-templates')
  @RequireRoles(
    UserRole.GIANG_VIEN,
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.ADMIN,
  )
  async getFormTemplates() {
    const templates = await this.documentsService.getAvailableFormTemplates();

    return {
      success: true,
      data: templates,
    };
  }

  /**
   * Check FormEngine health status
   *
   * Returns availability, version, templates count, and LibreOffice status
   * RBAC: ADMIN only
   */
  @Get('form-engine/health')
  @RequireRoles(UserRole.ADMIN)
  async checkFormEngineHealth() {
    const health = await this.documentsService.checkFormEngineHealth();

    return {
      success: true,
      data: health,
      message: health.available
        ? 'FormEngine hoạt động bình thường'
        : 'FormEngine không khả dụng',
    };
  }

  /**
   * Download form document (DOCX)
   *
   * Downloads the DOCX file generated by FormEngine
   * RBAC: Owner, QUAN_LY_KHOA (same faculty), PHONG_KHCN, ADMIN
   */
  @Get('forms/:id/download/docx')
  @RequireRoles(
    UserRole.GIANG_VIEN,
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.ADMIN,
  )
  async downloadFormDocx(
    @Param('id') documentId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } =
      await this.documentsService.downloadDocument(documentId, user);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  /**
   * Download form document (PDF)
   *
   * Downloads the PDF file generated by FormEngine
   * RBAC: Owner, QUAN_LY_KHOA (same faculty), PHONG_KHCN, ADMIN
   */
  @Get('forms/:id/download/pdf')
  @RequireRoles(
    UserRole.GIANG_VIEN,
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.ADMIN,
  )
  async downloadFormPdf(
    @Param('id') documentId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const { buffer, fileName } =
      await this.documentsService.downloadFormPdf(documentId, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }
}
