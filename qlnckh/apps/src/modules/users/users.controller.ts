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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
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
 * Users Controller
 *
 * Handles all user management endpoints:
 * - POST /api/users - Create user with temp password
 * - GET /api/users - List users with pagination
 * - GET /api/users/:id - Get user by ID
 * - PATCH /api/users/:id - Update user
 * - DELETE /api/users/:id - Soft delete user
 *
 * All endpoints require USER_MANAGE permission
 */
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.USER_MANAGE)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/users
   * Create a new user with temporary password
   *
   * Temporary password is only returned once in the response
   * Admin must copy and share it securely with the user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: CurrentUserData,
    @Req() req: Request,
  ) {
    const result = await this.usersService.createUser(
      createUserDto,
      currentUser.id,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/users
   * List users with pagination and filtering
   *
   * Query params:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20)
   * - role: Filter by role
   * - facultyId: Filter by faculty
   * - search: Search by email/displayName
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('role') role?: string,
    @Query('facultyId') facultyId?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.getUsers(
      page,
      limit,
      role as any,
      facultyId,
      search,
    );

    return {
      success: true,
      data: result.users,
      meta: result.meta,
    };
  }

  /**
   * GET /api/users/:id
   * Get user by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);

    return {
      success: true,
      data: user,
    };
  }

  /**
   * PATCH /api/users/:id
   * Update user (role, facultyId, displayName)
   * Creates audit log entry for changes
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: CurrentUserData,
    @Req() req: Request,
  ) {
    const user = await this.usersService.updateUser(
      id,
      updateUserDto,
      currentUser.id,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: user,
    };
  }

  /**
   * DELETE /api/users/:id
   * Soft delete user (sets deletedAt timestamp)
   * User will not be able to login after soft delete
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDeleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserData,
    @Req() req: Request,
  ) {
    const user = await this.usersService.softDeleteUser(
      id,
      currentUser.id,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: {
        message: 'Đã xóa người dùng thành công',
        user,
      },
    };
  }
}
