import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, compare } from 'bcrypt';
import { PrismaService } from './prisma.service';
import { User, UserRole } from '@prisma/client';
import { JwtPayload, TokenResponse, Tokens } from './interfaces';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Audit context interface
 * Passed from controller to service for audit logging
 */
export interface AuditContext {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private rbacService: RbacService,
    @Optional() private auditService?: AuditService,
  ) {}

  /**
   * Validate user credentials for LocalStrategy
   * Rejects soft-deleted users (deletedAt != null)
   */
  async validateUser(
    email: string,
    password: string,
    auditContext?: AuditContext,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Log failed login attempt - user not found
        if (this.auditService) {
          await this.auditService.logEvent({
            action: AuditAction.LOGIN_FAIL,
            actorUserId: 'anonymous',
            entityType: 'users',
            entityId: email,
            metadata: { email, reason: 'USER_NOT_FOUND' },
            ...auditContext,
          });
        }
        return null;
      }

      // Check if user is soft-deleted
      if (user.deletedAt) {
        this.logger.warn(`Login attempt for soft-deleted user: ${email}`);
        // Log failed login attempt - soft-deleted user
        if (this.auditService) {
          await this.auditService.logEvent({
            action: AuditAction.LOGIN_FAIL,
            actorUserId: 'anonymous',
            entityType: 'users',
            entityId: email,
            metadata: { email, reason: 'USER_DELETED' },
            ...auditContext,
          });
        }
        return null;
      }

      const isPasswordValid = await compare(password, user.passwordHash);
      if (!isPasswordValid) {
        // Log failed login attempt - invalid password
        if (this.auditService) {
          await this.auditService.logEvent({
            action: AuditAction.LOGIN_FAIL,
            actorUserId: 'anonymous',
            entityType: 'users',
            entityId: email,
            metadata: { email, userId: user.id, reason: 'INVALID_PASSWORD' },
            ...auditContext,
          });
        }
        return null;
      }

      // Return user without password
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      throw new UnauthorizedException({
        success: false,
        error: {
          error_code: 'AUTH_VALIDATION_ERROR',
          message: 'Lỗi xác thực người dùng',
        },
      });
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS') || 12;
    return hash(password, saltRounds);
  }

  /**
   * Generate login response for already validated user
   * Used by AuthController after LocalStrategy validation
   * @param user - Validated user without password
   * @returns TokenResponse with user including permissions
   */
  async generateLoginResponse(user: Omit<User, 'passwordHash'>): Promise<TokenResponse> {
    // Get user permissions
    const permissions = await this.rbacService.getUserPermissions(user.role);

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        facultyId: user.facultyId,
        permissions,
      },
    };
  }

  /**
   * Store refresh token and log successful login event.
   * This method encapsulates the post-login operations to maintain service layer abstraction.
   *
   * @param user - Validated user without password
   * @param refreshToken - Refresh token to store
   * @param auditContext - Audit context (IP, userAgent, requestId)
   */
  async recordSuccessfulLogin(
    user: Omit<User, 'passwordHash'>,
    refreshToken: string,
    auditContext?: AuditContext,
  ): Promise<void> {
    // Store refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Log successful login
    if (this.auditService) {
      await this.auditService.logEvent({
        action: AuditAction.LOGIN_SUCCESS,
        actorUserId: user.id,
        entityType: 'users',
        entityId: user.id,
        metadata: { email: user.email },
        ...auditContext,
      });
    }

    this.logger.log(`User logged in: ${user.email}`);
  }

  /**
   * Login - Generate access and refresh tokens
   */
  async login(
    email: string,
    password: string,
    auditContext?: AuditContext,
  ): Promise<TokenResponse> {
    try {
      const user = await this.validateUser(email, password, auditContext);

      if (!user) {
        // Failed login is already logged in validateUser
        throw new UnauthorizedException({
          success: false,
          error: {
            error_code: 'INVALID_CREDENTIALS',
            message: 'Email hoặc mật khẩu không đúng',
          },
        });
      }

      // Get user permissions
      const permissions = await this.rbacService.getUserPermissions(user.role);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Store refresh token in database
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(
        refreshTokenExpiry.getDate() + 7, // 7 days
      );

      await this.prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiry,
        },
      });

      // Log successful login
      if (this.auditService) {
        await this.auditService.logEvent({
          action: AuditAction.LOGIN_SUCCESS,
          actorUserId: user.id,
          entityType: 'users',
          entityId: user.id,
          metadata: { email: user.email },
          ...auditContext,
        });
      }

      this.logger.log(`User logged in: ${user.email}`);

      return {
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          facultyId: user.facultyId,
          permissions,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error during login: ${error.message}`, error.stack);
      throw new UnauthorizedException({
        success: false,
        error: {
          error_code: 'LOGIN_ERROR',
          message: 'Đăng nhập thất bại',
        },
      });
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify refresh token exists and is not revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.revokedAt) {
        throw new UnauthorizedException({
          success: false,
          error: {
            error_code: 'REFRESH_TOKEN_REVOKED',
            message: 'Vui lòng đăng nhập lại',
          },
        });
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException({
          success: false,
          error: {
            error_code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Phiên đăng nhập đã hết hạn',
          },
        });
      }

      const { passwordHash, ...user } = storedToken.user;

      // Get user permissions
      const permissions = await this.rbacService.getUserPermissions(user.role);

      this.logger.log(`Token refreshed for user: ${user.email}`);

      return {
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          facultyId: user.facultyId,
          permissions,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error during refresh: ${error.message}`, error.stack);
      throw new UnauthorizedException({
        success: false,
        error: {
          error_code: 'REFRESH_ERROR',
          message: 'Lỗi làm mới token',
        },
      });
    }
  }

  /**
   * Logout - Revoke refresh token
   */
  async logout(
    refreshToken: string,
    auditContext?: AuditContext & { userId?: string },
  ): Promise<boolean> {
    try {
      // Get the token info to find the user ID
      const tokenInfo = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        select: { userId: true },
      });

      const result = await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });

      if (result.count === 0) {
        this.logger.warn(`Logout attempted with non-existent token`);
        return false;
      }

      // Log logout event
      if (this.auditService && tokenInfo?.userId) {
        await this.auditService.logEvent({
          action: AuditAction.LOGOUT,
          actorUserId: tokenInfo.userId,
          entityType: 'users',
          entityId: tokenInfo.userId,
          ...auditContext,
        });
      }

      this.logger.log(`User logged out (token revoked)`);
      return true;
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error: {
          error_code: 'LOGOUT_ERROR',
          message: 'Lỗi đăng xuất',
        },
      });
    }
  }

  /**
   * Get current user info
   */
  async getMe(userId: string): Promise<TokenResponse['user']> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException({
          success: false,
          error: {
            error_code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng',
          },
        });
      }

      // Get user permissions
      const permissions = await this.rbacService.getUserPermissions(user.role);

      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        facultyId: user.facultyId,
        permissions,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error getting user info: ${error.message}`, error.stack);
      throw new UnauthorizedException({
        success: false,
        error: {
          error_code: 'GET_USER_ERROR',
          message: 'Lỗi lấy thông tin người dùng',
        },
      });
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  async generateTokens(
    user: Omit<User, 'passwordHash'>,
    actingAs?: Omit<User, 'passwordHash'>,
  ): Promise<Tokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      facultyId: user.facultyId,
      actingAs: actingAs?.id, // Include actingAs in JWT for demo mode
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
