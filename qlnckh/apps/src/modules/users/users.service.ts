import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { UserRole, User } from '@prisma/client';
import { PrismaService } from '../auth/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Temporary password response
 * Only returned once when user is created
 */
interface TempPasswordResponse {
  user: Omit<User, 'passwordHash' | 'deletedAt'>;
  temporaryPassword: string;
}

/**
 * User list response with pagination
 */
interface UserListResponse {
  users: Omit<User, 'passwordHash' | 'deletedAt'>[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Users Service
 *
 * Handles all user management operations including:
 * - Create user with temporary password generation
 * - Update user with audit logging
 * - Soft delete user
 * - List users with filtering and pagination
 *
 * Follows red-green-refactor cycle with TDD
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly TEMP_PASSWORD_LENGTH = 12;
  private readonly TEMP_PASSWORD_CHARSET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  constructor(
    private prisma: PrismaService,
    @Optional() private auditService?: AuditService,
  ) {}

  /**
   * Generate a secure temporary password
   * 12 characters with uppercase, lowercase, and numbers
   * Uses Fisher-Yates shuffle for proper randomization
   * @returns Secure random temporary password
   */
  private generateTempPassword(): string {
    const passwordLength = this.TEMP_PASSWORD_LENGTH;
    const charset = this.TEMP_PASSWORD_CHARSET;
    const randomValues = randomBytes(passwordLength);
    const passwordArray: string[] = [];

    // Ensure at least one uppercase, one lowercase, and one number
    passwordArray.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[randomValues[0] % 26]);
    passwordArray.push('abcdefghijklmnopqrstuvwxyz'[randomValues[1] % 26]);
    passwordArray.push('0123456789'[randomValues[2] % 10]);

    // Fill the rest with random characters from the full charset
    for (let i = 3; i < passwordLength; i++) {
      passwordArray.push(charset[randomValues[i] % charset.length]);
    }

    // Fisher-Yates shuffle for uniform random distribution
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = randomValues[i] % (i + 1);
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    return passwordArray.join('');
  }

  /**
   * Validate faculty ID exists in database
   * @param facultyId - Faculty ID to validate
   * @returns true if valid, false if not found
   */
  private async validateFacultyId(facultyId?: string): Promise<boolean> {
    if (!facultyId) {
      return true; // null/undefined is valid (optional field)
    }

    const faculty = await this.prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { id: true },
    });

    return faculty !== null;
  }

  /**
   * Create audit event log for user actions
   * @param action - Action type (e.g., USER_CREATE, USER_UPDATE, USER_DELETE)
   * @param actorUserId - ID of user performing the action
   * @param entityId - ID of the entity being acted upon
   * @param metadata - Additional metadata about the action
   * @param ip - IP address of the request
   * @param userAgent - User agent string
   * @param requestId - Request ID for tracing
   */
  private async createAuditEvent(
    action: string,
    actorUserId: string,
    entityId: string,
    metadata: Record<string, unknown>,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ): Promise<void> {
    if (this.auditService) {
      await this.auditService.logEvent({
        action,
        actorUserId,
        entityType: 'users',
        entityId,
        metadata,
        ip,
        userAgent,
        requestId,
      });
    } else {
      // Fallback to console logging if audit service is not available
      this.logger.log(
        `AUDIT: ${action} by ${actorUserId} on user ${entityId}: ${JSON.stringify(metadata)}`,
      );
    }
  }

  /**
   * Create a new user with temporary password
   *
   * @param createUserDto - User creation data
   * @param actorUserId - ID of admin creating the user
   * @param ip - Request IP address
   * @param userAgent - Request user agent
   * @returns User object with temporary password (ONE TIME ONLY)
   * @throws ConflictException if email already exists
   */
  async createUser(
    createUserDto: CreateUserDto,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<TempPasswordResponse> {
    try {
      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException({
          success: false,
          error: {
            error_code: 'EMAIL_EXISTS',
            message: 'Email đã được sử dụng',
          },
        });
      }

      // Validate faculty ID if provided
      if (createUserDto.facultyId) {
        const facultyValid = await this.validateFacultyId(createUserDto.facultyId);
        if (!facultyValid) {
          throw new BadRequestException({
            success: false,
            error: {
              error_code: 'FACULTY_NOT_FOUND',
              message: 'Đơn vị không tồn tại trong hệ thống',
            },
          });
        }
      }

      // Generate temporary password
      const temporaryPassword = this.generateTempPassword();

      // Hash the password
      const passwordHash = await this.hashPassword(temporaryPassword);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          displayName: createUserDto.displayName,
          role: createUserDto.role,
          facultyId: createUserDto.facultyId || null,
          passwordHash,
        },
      });

      // Create audit event
      await this.createAuditEvent(
        AuditAction.USER_CREATE,
        actorUserId,
        user.id,
        {
          email: user.email,
          role: user.role,
          facultyId: user.facultyId,
        },
        ip,
        userAgent,
      );

      this.logger.log(`User created: ${user.email} by ${actorUserId}`);

      // Return user without password hash, but WITH temporary password (ONE TIME ONLY)
      const { passwordHash: _, deletedAt: __, ...userWithoutSensitive } = user;

      return {
        user: userWithoutSensitive,
        temporaryPassword, // ONLY returned in CREATE response
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error: {
          error_code: 'USER_CREATE_ERROR',
          message: 'Lỗi tạo người dùng',
        },
      });
    }
  }

  /**
   * Get list of users with filtering and pagination
   *
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @param role - Filter by role (optional)
   * @param facultyId - Filter by faculty (optional)
   * @param search - Search by email/displayName (optional)
   * @returns Paginated user list
   */
  async getUsers(
    page = 1,
    limit = 20,
    role?: UserRole,
    facultyId?: string,
    search?: string,
  ): Promise<UserListResponse> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null, // Exclude soft-deleted users
    };

    if (role) {
      where.role = role;
    }

    if (facultyId) {
      where.facultyId = facultyId;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and users in parallel
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          facultyId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   *
   * @param id - User ID
   * @returns User object without password hash
   * @throws NotFoundException if user not found
   */
  async getUserById(id: string): Promise<Omit<User, 'passwordHash' | 'deletedAt'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        facultyId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({
        success: false,
        error: {
          error_code: 'USER_NOT_FOUND',
          message: 'Không tìm thấy người dùng',
        },
      });
    }

    const { deletedAt: _, ...userWithoutDeleted } = user;
    return userWithoutDeleted;
  }

  /**
   * Update user with audit logging
   *
   * @param id - User ID to update
   * @param updateUserDto - Fields to update
   * @param actorUserId - ID of admin performing update
   * @param ip - Request IP address
   * @param userAgent - Request user agent
   * @returns Updated user
   * @throws NotFoundException if user not found
   */
  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<Omit<User, 'passwordHash' | 'deletedAt'>> {
    try {
      // Get existing user
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser || existingUser.deletedAt) {
        throw new NotFoundException({
          success: false,
          error: {
            error_code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng',
          },
        });
      }

      // Validate faculty ID if being changed
      if (updateUserDto.facultyId !== undefined) {
        const facultyValid = await this.validateFacultyId(updateUserDto.facultyId);
        if (!facultyValid) {
          throw new BadRequestException({
            success: false,
            error: {
              error_code: 'FACULTY_NOT_FOUND',
              message: 'Đơn vị không tồn tại trong hệ thống',
            },
          });
        }
      }

      // Track changes for audit log
      const changes: Record<string, any> = {};

      if (updateUserDto.role && updateUserDto.role !== existingUser.role) {
        changes.role = [existingUser.role, updateUserDto.role];
      }

      if (
        updateUserDto.facultyId !== undefined &&
        updateUserDto.facultyId !== existingUser.facultyId
      ) {
        changes.facultyId = [existingUser.facultyId, updateUserDto.facultyId];
      }

      if (updateUserDto.displayName && updateUserDto.displayName !== existingUser.displayName) {
        changes.displayName = [existingUser.displayName, updateUserDto.displayName];
      }

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });

      // Create audit event if there were changes
      if (Object.keys(changes).length > 0) {
        await this.createAuditEvent(
          AuditAction.USER_UPDATE,
          actorUserId,
          id,
          { changes },
          ip,
          userAgent,
        );
      }

      this.logger.log(`User updated: ${updatedUser.email} by ${actorUserId}`);

      const { passwordHash: _, deletedAt: __, ...userWithoutSensitive } = updatedUser;
      return userWithoutSensitive;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error: {
          error_code: 'USER_UPDATE_ERROR',
          message: 'Lỗi cập nhật người dùng',
        },
      });
    }
  }

  /**
   * Soft delete user (sets deletedAt timestamp)
   * User will not be able to login after soft delete
   *
   * @param id - User ID to delete
   * @param actorUserId - ID of admin performing deletion
   * @param ip - Request IP address
   * @param userAgent - Request user agent
   * @returns Deleted user info
   * @throws NotFoundException if user not found
   */
  async softDeleteUser(
    id: string,
    actorUserId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<Omit<User, 'passwordHash' | 'deletedAt'>> {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser || existingUser.deletedAt) {
        throw new NotFoundException({
          success: false,
          error: {
            error_code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng',
          },
        });
      }

      // Prevent self-deletion
      if (id === actorUserId) {
        throw new BadRequestException({
          success: false,
          error: {
            error_code: 'CANNOT_DELETE_SELF',
            message: 'Không thể xóa tài khoản của chính mình',
          },
        });
      }

      // Soft delete by setting deletedAt
      const deletedUser = await this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Revoke all refresh tokens
      await this.prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { revokedAt: new Date() },
      });

      // Create audit event
      await this.createAuditEvent(
        AuditAction.USER_DELETE,
        actorUserId,
        id,
        {
          email: deletedUser.email,
          role: deletedUser.role,
        },
        ip,
        userAgent,
      );

      this.logger.log(`User soft-deleted: ${deletedUser.email} by ${actorUserId}`);

      const { passwordHash: _, deletedAt: __, ...userWithoutSensitive } = deletedUser;
      return userWithoutSensitive;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error deleting user: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error: {
          error_code: 'USER_DELETE_ERROR',
          message: 'Lỗi xóa người dùng',
        },
      });
    }
  }
}
