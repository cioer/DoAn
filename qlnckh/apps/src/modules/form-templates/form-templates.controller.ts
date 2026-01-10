import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FormTemplatesService } from './form-templates.service';
import { WordParserService } from './word-parser.service';
import {
  FormTemplateDto,
  FormTemplateWithSectionsDto,
  CreateFormTemplateDto,
  UpdateFormTemplateDto,
  FormSectionDto,
} from './dto';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';

@ApiTags('form-templates')
@Controller('form-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormTemplatesController {
  constructor(
    private readonly formTemplatesService: FormTemplatesService,
    private readonly wordParserService: WordParserService,
  ) {}

  /**
   * GET /api/form-templates - List all active form templates
   * Authenticated users can read
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all form templates',
    description: 'Returns all active form templates with their sections',
  })
  @ApiResponse({
    status: 200,
    description: 'List of form templates',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            code: 'MAU_01B',
            name: 'Đề tài Nghiên cứu Khoa học cấp trường',
            description: 'Mẫu đề tài NCKH cấp trường đầy đủ',
            version: 'v1.0',
            isActive: true,
            sections: [],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll() {
    const data = await this.formTemplatesService.findAll();
    return { success: true, data };
  }

  /**
   * GET /api/form-templates/:id - Get single template by ID or code
   * Authenticated users can read
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get form template by ID or code',
    description: 'Returns a single form template with sections by ID or code (e.g., MAU_01B)',
  })
  @ApiResponse({
    status: 200,
    description: 'Form template details',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          code: 'MAU_01B',
          name: 'Đề tài Nghiên cứu Khoa học cấp trường',
          description: 'Mẫu đề tài NCKH cấp trường đầy đủ',
          version: 'v1.0',
          isActive: true,
          sections: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findOne(@Param('id') id: string) {
    const data = await this.formTemplatesService.findOne(id);
    return { success: true, data };
  }

  /**
   * GET /api/form-templates/:id/sections - Get sections only
   * Used for revision references in Epic 4
   * Authenticated users can read
   */
  @Get(':id/sections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get form template sections',
    description: 'Returns sections of a form template (for revision references)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of form sections',
    type: [FormSectionDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findSections(@Param('id') id: string): Promise<FormSectionDto[]> {
    return this.formTemplatesService.findSections(id);
  }

  /**
   * POST /api/form-templates - Create new form template
   * Admin only
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create form template',
    description: 'Creates a new form template (admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: FormTemplateWithSectionsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  async create(@Body() dto: CreateFormTemplateDto): Promise<FormTemplateWithSectionsDto> {
    return this.formTemplatesService.create(dto);
  }

  /**
   * POST /api/form-templates/import - Import form templates from Word document
   * Admin only
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Import form templates from Word',
    description: 'Import form templates from a Word .docx document (admin only). The document should contain form templates with structure like "Mẫu X: Template Name"',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates imported successfully',
    schema: {
      example: {
        success: true,
        message: 'Đã nhập 5 biểu mẫu thành công',
        data: {
          imported: 5,
          failed: 0,
          templates: [
            { code: 'MAU_1A', name: 'Đề tài NCKH', sectionsCount: 8 },
          ],
          errors: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file or document format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  async importFromWord(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Vui lòng tải lên file Word (.docx)',
        },
      });
    }

    // Validate file extension
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Chỉ chấp nhận file Word (.docx)',
        },
      });
    }

    // Parse Word document
    const parsedTemplates = await this.wordParserService.parseFormTemplates(file.buffer);

    // Import templates to database
    const result = await this.formTemplatesService.importFromWord(parsedTemplates);

    return {
      success: true,
      message: `Đã nhập ${result.imported} biểu mẫu thành công${result.failed > 0 ? ` (${result.failed} thất bại)` : ''}`,
      data: result,
    };
  }

  /**
   * PUT /api/form-templates/:id - Update form template
   * Admin only
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update form template',
    description: 'Updates a form template (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: FormTemplateWithSectionsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFormTemplateDto,
  ): Promise<FormTemplateWithSectionsDto> {
    return this.formTemplatesService.update(id, dto);
  }

  /**
   * DELETE /api/form-templates/:id - Delete form template
   * Admin only
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete form template',
    description: 'Deletes a form template (admin only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.formTemplatesService.remove(id);
  }
}
