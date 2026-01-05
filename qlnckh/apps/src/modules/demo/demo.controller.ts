import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DemoService, AuditContext } from './demo.service';
import { AuthService } from '../auth/auth.service';
import { SwitchPersonaDto, ResetDemoDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    facultyId?: string | null;
  };
}

/**
 * Demo Controller
 *
 * Handles demo mode endpoints:
 * - GET /api/demo/config - Get demo mode configuration
 * - POST /api/demo/switch-persona - Switch to a different persona
 * - POST /api/demo/reset - Reset demo data (APP_MODE=demo only)
 *
 * All endpoints require authentication and demo mode to be enabled
 */
@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(
    private demoService: DemoService,
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * GET /api/demo/config
   * Get demo mode configuration including available personas
   */
  @Get('config')
  @HttpCode(HttpStatus.OK)
  async getDemoConfig(@Res() res: Response): Promise<void> {
    const config = await this.demoService.getDemoModeConfig();

    res.status(HttpStatus.OK).json({
      success: true,
      data: config,
    });
  }

  /**
   * POST /api/demo/switch-persona
   * Switch to a different persona in demo mode
   *
   * Returns both the original user and the acting-as user
   * Issues new JWT with actingAs claim to persist across page refreshes
   * Frontend should use actingAs.permissions for RBAC checks
   */
  @Post('switch-persona')
  @HttpCode(HttpStatus.OK)
  async switchPersona(
    @Req() req: AuthRequest,
    @Body() switchPersonaDto: SwitchPersonaDto,
    @Res() res: Response,
  ): Promise<void> {
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

    // Extract audit context from request
    const auditContext = this.extractAuditContext(req);

    // Switch persona - returns both user and actingAs with permissions
    const result = await this.demoService.switchPersona(
      userId,
      switchPersonaDto.targetUserId,
      auditContext,
      switchPersonaDto.idempotencyKey,
    );

    // Generate NEW JWT with actingAs claim to persist across page refreshes
    // This fixes the "actingAs lost on page refresh" issue
    const actorUserForToken = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
      facultyId: result.user.facultyId,
      displayName: result.user.displayName || result.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as const;

    const actingAsUserForToken = {
      id: result.actingAs.id,
      email: result.actingAs.email,
      role: result.actingAs.role as UserRole,
      facultyId: result.actingAs.facultyId,
      displayName: result.actingAs.displayName || result.actingAs.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as const;

    const tokens = await this.authService.generateTokens(
      actorUserForToken,
      actingAsUserForToken,
    );

    // Set new auth cookies with actingAs in JWT payload
    this.setAuthCookies(res, tokens);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  }

  /**
   * POST /api/demo/reset
   * Reset demo data and reseed
   * Only available when APP_MODE=demo AND DEMO_MODE=true
   * Requires explicit confirmation to prevent accidental resets
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDemo(
    @Req() req: AuthRequest,
    @Body() resetDto: ResetDemoDto,
    @Res() res: Response,
  ): Promise<void> {
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

    // Check demo mode
    const demoModeEnabled = this.demoService.isDemoModeEnabled();
    if (!demoModeEnabled) {
      res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Chức năng chỉ available ở demo mode',
        },
      });
      return;
    }

    // Validate confirmation
    if (!resetDto.confirmed) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'NOT_CONFIRMED',
          message: 'Vui lòng xác nhận reset demo',
        },
      });
      return;
    }

    // Extract audit context
    const auditContext = this.extractAuditContext(req);

    // Execute reset
    const result = await this.demoService.resetDemo(userId, auditContext);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  }

  /**
   * Helper: Set auth cookies on response (matches AuthController pattern)
   */
  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
    const isSecure = this.configService.get<string>('NODE_ENV') === 'production';
    const cookieSecure = this.configService.get<string>('COOKIE_SECURE') === 'true' || isSecure;
    const cookieSameSite = (this.configService.get<string>('COOKIE_SAME_SITE') as 'strict' | 'lax' | 'none') || 'lax';
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN') || 'localhost';

    // Access token cookie (15 minutes)
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      domain: cookieDomain,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Refresh token cookie (7 days)
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      domain: cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
