import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ProposalDocumentsService } from './proposal-documents.service';
import {
  CreateProposalDocumentDto,
  UpdateProposalDocumentDto,
  ApproveRejectDocumentDto,
  GenerateFormDto,
  GenerateMultipleFormsDto,
  QueryProposalDocumentsDto,
  GenerateTestDto,
} from './dto';
import { FormEngineService } from '../form-engine/form-engine.service';

@Controller('proposal-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProposalDocumentsController {
  constructor(
    private readonly proposalDocumentsService: ProposalDocumentsService,
    private readonly formEngineService: FormEngineService,
  ) {}

  /**
   * Lấy danh sách documents với filters và pagination
   */
  @Get()
  async query(@Query() query: QueryProposalDocumentsDto) {
    return this.proposalDocumentsService.query(query);
  }

  /**
   * Lấy tất cả form types và metadata
   */
  @Get('form-types')
  async getAllFormTypes() {
    return {
      success: true,
      data: this.proposalDocumentsService.getAllFormTypes(),
    };
  }

  /**
   * Kiểm tra FormEngine service health
   */
  @Get('health')
  async checkHealth() {
    const isAvailable = await this.proposalDocumentsService.checkFormEngineHealth();
    return {
      success: true,
      data: {
        available: isAvailable,
        service: 'FormEngine',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Lấy thông tin chi tiết của một form type
   */
  @Get('form-info/:formType')
  async getFormInfo(@Param('formType') formType: string) {
    return this.proposalDocumentsService.getFormInfo(formType as any);
  }

  /**
   * Lấy danh sách forms mà user có thể tạo cho proposal
   * Dựa trên: role của user + state hiện tại của proposal
   */
  @Get('proposal/:proposalId/available-forms')
  async getAvailableForms(
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.proposalDocumentsService.getAvailableFormsForUser(
      proposalId,
      user.id,
      user.role,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Lấy documents của một proposal cụ thể
   */
  @Get('proposal/:proposalId')
  async getByProposal(@Param('proposalId') proposalId: string) {
    return this.proposalDocumentsService.getByProposal(proposalId);
  }

  /**
   * Kiểm tra proposal có thể chuyển trạng thái không
   */
  @Get('proposal/:proposalId/can-transition')
  async canTransition(@Param('proposalId') proposalId: string) {
    return this.proposalDocumentsService.canTransition(proposalId);
  }

  /**
   * Lấy danh sách templates từ Form Engine service
   * Chỉ ADMIN và PHONG_KHCN có quyền truy cập
   */
  @Get('engine-templates')
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  async getEngineTemplates() {
    const templates = await this.formEngineService.getTemplates();
    return { success: true, data: templates };
  }

  /**
   * Generate test document với sample data
   * Chỉ ADMIN có quyền (để tránh abuse)
   */
  @Post('generate-test')
  @RequireRoles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async generateTest(
    @Body() dto: GenerateTestDto,
    @CurrentUser() user: any,
  ) {
    // Get sample data from Form Engine
    const sampleData = await this.formEngineService.getSampleData(
      dto.formId,
      dto.isApproved ?? true,
    );

    // Render form with sample data
    const result = await this.formEngineService.renderForm({
      templateName: `${dto.formId}.docx`,
      context: sampleData,
      userId: user.id,
    });

    return {
      success: true,
      data: {
        formId: dto.formId,
        isApproved: dto.isApproved ?? true,
        ...result,
      },
    };
  }

  /**
   * Lấy document theo ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.proposalDocumentsService.getById(id);
  }

  /**
   * Tạo mới proposal document
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateProposalDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.proposalDocumentsService.create(dto, user.id);
  }

  /**
   * Generate form từ template
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateForm(@Body() dto: GenerateFormDto, @CurrentUser() user: any) {
    const result = await this.proposalDocumentsService.generateForm(dto, user.id);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Generate nhiều forms cùng lúc
   */
  @Post('generate-multiple')
  @HttpCode(HttpStatus.OK)
  async generateMultipleForms(
    @Body() dto: GenerateMultipleFormsDto,
    @CurrentUser() user: any,
  ) {
    const results = [];
    for (const formType of dto.formTypes) {
      const result = await this.proposalDocumentsService.generateForm(
        {
          proposalId: dto.proposalId,
          formType,
          additionalData: dto.additionalData,
        },
        user.id,
      );
      results.push(result);
    }
    return { results };
  }

  /**
   * Cập nhật document
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProposalDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.proposalDocumentsService.update(id, dto, user.id);
  }

  /**
   * Approve hoặc reject document
   * Chỉ admin, faculty_admin, department_head có quyền
   */
  @Patch(':id/approve')
  @RequireRoles(UserRole.ADMIN, UserRole.QUAN_LY_KHOA, UserRole.PHONG_KHCN)
  async approveReject(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.proposalDocumentsService.approveReject(id, dto, user.id);
  }

  /**
   * Download document file (DOCX)
   */
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const document = await this.proposalDocumentsService.getById(id);

    if (!document.filePath) {
      throw new NotFoundException('File chưa được tạo');
    }

    const fullPath = this.resolveFilePath(document.filePath);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`File không tồn tại: ${fullPath}`);
    }

    const fileName = document.fileName || 'document.docx';
    const contentType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    const stream = createReadStream(fullPath);
    return new StreamableFile(stream);
  }

  /**
   * Download document file (PDF)
   */
  @Get(':id/download-pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const document = await this.proposalDocumentsService.getById(id);

    if (!document.filePath) {
      throw new NotFoundException('File chưa được tạo');
    }

    // Convert .docx path to .pdf
    const pdfPath = document.filePath.replace('.docx', '.pdf');
    const fullPath = this.resolveFilePath(pdfPath);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`File PDF không tồn tại. Vui lòng tạo lại tài liệu.`);
    }

    const fileName = (document.fileName || 'document.docx').replace('.docx', '.pdf');
    const contentType = 'application/pdf';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    const stream = createReadStream(fullPath);
    return new StreamableFile(stream);
  }

  /**
   * Helper: Resolve file path from relative to absolute
   */
  private resolveFilePath(filePath: string): string {
    const formEngineBaseDir =
      process.env.FORM_ENGINE_OUTPUT_BASE || '/mnt/dulieu/DoAn/form-engine-service';
    let fullPath = filePath;

    // Handle legacy absolute paths from form-engine container
    // Convert /app/output/... to the mapped volume path
    if (fullPath.startsWith('/app/output/')) {
      fullPath = fullPath.replace('/app/output/', `${formEngineBaseDir}/`);
    }
    // Convert relative path to absolute
    else if (fullPath.startsWith('./')) {
      fullPath = fullPath.replace('./', `${formEngineBaseDir}/`);
    } else if (!fullPath.startsWith('/')) {
      fullPath = `${formEngineBaseDir}/${fullPath}`;
    }

    return fullPath;
  }

  /**
   * Xóa document (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.proposalDocumentsService.delete(id, user.id);
  }
}
