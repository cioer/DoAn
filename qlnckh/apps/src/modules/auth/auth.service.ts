import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, compare } from 'bcrypt';
import { PrismaService } from './prisma.service';
import { User, UserRole } from '@prisma/client';
import { JwtPayload, TokenResponse, Tokens } from './interfaces';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private rbacService: RbacService,
  ) {}

  /**
   * Validate user credentials for LocalStrategy
   */
  async validateUser(email: string, password: string): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return null;
      }

      const isPasswordValid = await compare(password, user.passwordHash);
      if (!isPasswordValid) {
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
          code: 'AUTH_VALIDATION_ERROR',
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
   * Login - Generate access and refresh tokens
   */
  async login(email: string, password: string): Promise<TokenResponse> {
    try {
      const user = await this.validateUser(email, password);

      if (!user) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
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
          code: 'LOGIN_ERROR',
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
            code: 'REFRESH_TOKEN_REVOKED',
            message: 'Vui lòng đăng nhập lại',
          },
        });
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
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
          code: 'REFRESH_ERROR',
          message: 'Lỗi làm mới token',
        },
      });
    }
  }

  /**
   * Logout - Revoke refresh token
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      const result = await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });

      if (result.count === 0) {
        this.logger.warn(`Logout attempted with non-existent token`);
        return false;
      }

      this.logger.log(`User logged out (token revoked)`);
      return true;
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
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
            code: 'USER_NOT_FOUND',
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
          code: 'GET_USER_ERROR',
          message: 'Lỗi lấy thông tin người dùng',
        },
      });
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  async generateTokens(user: Omit<User, 'passwordHash'>): Promise<Tokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      facultyId: user.facultyId,
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
