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
  HttpCode,
  HttpStatus,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FacultiesService } from './faculties.service';
import { CreateFacultyDto, UpdateFacultyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../rbac/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

/**
 * Current User Interface from JWT
 */
interface CurrentUserData {
  id: string;
  email: string;
  role: string;
  facultyId?: string | null;
}

/**
 * Faculties Controller
 *
 * Handles all faculty management endpoints:
 * - POST /api/faculties - Create faculty
 * - GET /api/faculties - List faculties with pagination
 * - GET /api/faculties/select - Get all faculties for dropdown
 * - GET /api/faculties/:id - Get faculty by ID
 * - PATCH /api/faculties/:id - Update faculty
 * - DELETE /api/faculties/:id - Delete faculty
 *
 * All endpoints require USER_MANAGE permission
 */
@Controller('faculties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.USER_MANAGE)
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  /**
   * POST /api/faculties
   * Create a new faculty
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFaculty(
    @Body() createFacultyDto: CreateFacultyDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const faculty = await this.facultiesService.create(
      createFacultyDto,
      currentUser.id,
    );

    return {
      success: true,
      data: faculty,
    };
  }

  /**
   * GET /api/faculties
   * List faculties with pagination and filtering
   *
   * Query params:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50)
   * - type: Filter by type (FACULTY/DEPARTMENT)
   * - search: Search by code or name
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getFaculties(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.facultiesService.findAll({
      page,
      limit,
      type,
      search,
    });

    return {
      success: true,
      data: result.faculties,
      meta: result.meta,
    };
  }

  /**
   * GET /api/faculties/select
   * Get all faculties for dropdown/select (simplified format)
   * No pagination, returns all faculties
   */
  @Get('select')
  @HttpCode(HttpStatus.OK)
  async getFacultiesForSelect() {
    const faculties = await this.facultiesService.getAllForSelect();

    return {
      success: true,
      data: faculties,
    };
  }

  /**
   * GET /api/faculties/:id
   * Get a single faculty by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getFaculty(@Param('id') id: string) {
    const faculty = await this.facultiesService.findOne(id);

    if (!faculty) {
      return {
        success: false,
        error: {
          message: 'Không tìm thấy khoa',
          error_code: 'FACULTY_NOT_FOUND',
        },
      };
    }

    return {
      success: true,
      data: faculty,
    };
  }

  /**
   * PATCH /api/faculties/:id
   * Update a faculty
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateFaculty(
    @Param('id') id: string,
    @Body() updateFacultyDto: UpdateFacultyDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const faculty = await this.facultiesService.update(
      id,
      updateFacultyDto,
      currentUser.id,
    );

    return {
      success: true,
      data: faculty,
    };
  }

  /**
   * DELETE /api/faculties/:id
   * Delete a faculty
   * Only allowed if faculty has no users or proposals
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteFaculty(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const faculty = await this.facultiesService.remove(id, currentUser.id);

    return {
      success: true,
      data: faculty,
    };
  }
}
