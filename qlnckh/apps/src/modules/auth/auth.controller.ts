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
import { AuthService } from './auth.service';
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
  };
}

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
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    // LocalStrategy already validated user, get from req.user
    const user = req.user as Omit<User, 'passwordHash'>;

    // Generate tokens
    const tokens = await this.authService.generateTokens(user);

    // Store refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await this.authService['prisma'].refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Set HttpOnly cookies
    this.setAuthCookies(res, tokens);

    // Get login response with permissions
    const loginResponse = await this.authService.generateLoginResponse(user);

    // Return user object WITH permissions
    res.status(HttpStatus.OK).json({
      success: true,
      data: loginResponse,
    });
  }

  /**
   * POST /api/auth/logout
   * Logout and revoke refresh token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
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
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Chưa đăng nhập',
        },
      });
      return;
    }

    const user = await this.authService.getMe(userId);

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
}
