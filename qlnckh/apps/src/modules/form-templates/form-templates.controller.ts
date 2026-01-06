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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FormTemplatesService } from './form-templates.service';
import {
  FormTemplateDto,
  FormTemplateWithSectionsDto,
  CreateFormTemplateDto,
  UpdateFormTemplateDto,
  FormSectionDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';

@ApiTags('form-templates')
@Controller('form-templates')
@UseGuards(AuthGuard, RolesGuard)
export class FormTemplatesController {
  constructor(private readonly formTemplatesService: FormTemplatesService) {}

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
    type: [FormTemplateWithSectionsDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(): Promise<FormTemplateWithSectionsDto[]> {
    return this.formTemplatesService.findAll();
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
    type: FormTemplateWithSectionsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findOne(@Param('id') id: string): Promise<FormTemplateWithSectionsDto> {
    return this.formTemplatesService.findOne(id);
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
  @Roles(UserRole.ADMIN)
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
   * PUT /api/form-templates/:id - Update form template
   * Admin only
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
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
