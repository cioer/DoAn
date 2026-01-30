import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService, AuditContext } from './auth.service';
import { LoginDto } from './dto';
import { JwtRefreshGuard, JwtAuthGuard } from './guards';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    facultyId?: string | null;
    refreshToken?: string;
    actingAs?: string; // Demo mode: acting as this user ID
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  @Post('login')
  @ApiOperation({
    summary: 'Đăng nhập',
    description: 'Đăng nhập bằng email và mật khẩu. Trả về thông tin user và set cookies chứa JWT tokens.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: 'uuid',
            email: 'user@example.com',
            name: 'Nguyễn Văn A',
            role: 'GIANG_VIEN',
          },
          permissions: ['PROPOSAL_CREATE', 'PROPOSAL_EDIT'],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  @ApiResponse({ status: 429, description: 'Quá nhiều lần thử, vui lòng đợi' })
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    // LocalStrategy already validated user, get from req.user
    const user = req.user as Omit<User, 'passwordHash'>;

    // Extract audit context from request
    const auditContext = this.extractAuditContext(req);

    // Generate tokens
    const tokens = await this.authService.generateTokens(user);

    // Store refresh token and log successful login via service layer
    await this.authService.recordSuccessfulLogin(user, tokens.refreshToken, auditContext);

    // Set HttpOnly cookies
    this.setAuthCookies(res, tokens);

    // Get login response with permissions
    const loginResponse = await this.authService.generateLoginResponse(user);

    // Return user object WITH permissions
    // Dev/test environment: include accessToken for API testing (curl, Postman)
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        ...loginResponse,
        ...(isDev && { accessToken: tokens.accessToken }),
      },
    });
  }

  /**
   * POST /api/auth/logout
   * Logout and revoke refresh token
   */
  @Post('logout')
  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Đăng xuất và hủy refresh token. Xóa cookies chứa JWT tokens.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token;

    // Extract audit context
    const auditContext = this.extractAuditContext(req);

    if (refreshToken) {
      await this.authService.logout(refreshToken, {
        ...auditContext,
        userId: req.user?.id,
      });
    }

    // Clear cookies
    this.clearAuthCookies(res);

    res.status(HttpStatus.OK).json({
      success: true,
      data: { message: 'Đăng xuất thành công' },
    });
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @ApiOperation({
    summary: 'Làm mới token',
    description: 'Sử dụng refresh token để lấy access token mới.',
  })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Token đã được làm mới' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc hết hạn' })
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    const result = await this.authService.refresh(req.user!.refreshToken!);

    // Generate new access token
    // Note: generateTokens only needs id, email, role, facultyId which are all in TokenResponseUser
    const tokens = await this.authService.generateTokens(
      result.user as unknown as Omit<User, 'passwordHash'>,
    );

    // Set new access cookie
    const isSecure = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  }

  /**
   * GET /api/auth/me
   * Get current user info
   * In demo mode, includes actingAs user when user is impersonating a persona
   */
  @Get('me')
  @ApiOperation({
    summary: 'Lấy thông tin người dùng hiện tại',
    description: 'Trả về thông tin user đang đăng nhập. Trong demo mode, bao gồm cả thông tin persona đang giả lập.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth()
  @ApiResponse({
    status: 200,
    description: 'Thông tin người dùng',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: 'uuid',
            email: 'user@example.com',
            name: 'Nguyễn Văn A',
            role: 'GIANG_VIEN',
            facultyId: 'faculty-uuid',
            permissions: ['PROPOSAL_CREATE', 'PROPOSAL_EDIT'],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    const userId = req.user?.id;
    const actingAsUserId = req.user?.actingAs;

    if (!userId) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: {
          error_code: 'UNAUTHORIZED',
          message: 'Chưa đăng nhập',
        },
      });
      return;
    }

    const user = await this.authService.getMe(userId);

    // If in demo mode and actingAs is set, get acting as user info
    if (actingAsUserId) {
      const actingAsUser = await this.authService.getMe(actingAsUserId);

      res.status(HttpStatus.OK).json({
        success: true,
        data: {
          user,
          actingAs: actingAsUser,
        },
      });
      return;
    }

    res.status(HttpStatus.OK).json({
      success: true,
      data: { user },
    });
  }

  /**
   * Helper: Set auth cookies on response
   */
  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
    const isSecure = this.configService.get<string>('NODE_ENV') === 'production';
    const cookieSecure = this.configService.get<string>('COOKIE_SECURE') === 'true' || isSecure;
    const cookieSameSite = (this.configService.get<string>('COOKIE_SAME_SITE') as 'strict' | 'lax' | 'none') || 'lax';

    // Access token cookie (15 minutes)
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Refresh token cookie (7 days)
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  /**
   * Helper: Clear auth cookies
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  /**
   * Helper: Extract audit context from request
   */
  private extractAuditContext(req: Request): AuditContext {
    return {
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string || this.generateRequestId(),
    };
  }

  /**
   * Helper: Extract IP address from request
   * Handles proxy headers (X-Forwarded-For)
   */
  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Helper: Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
