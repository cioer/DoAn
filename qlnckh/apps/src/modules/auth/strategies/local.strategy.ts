import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService, AuditContext } from '../auth.service';
import { Request } from 'express';

/**
 * LocalStrategy for passport-local authentication.
 * Extracts audit context (IP, userAgent, requestId) from the request
 * and passes it to validateUser for proper audit logging of failed attempts.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(req: Request, email: string, password: string): Promise<any> {
    // Extract audit context from request for failed login tracking
    const auditContext: AuditContext = {
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent'],
      requestId: (req.headers['x-request-id'] as string) || this.generateRequestId(),
    };

    const user = await this.authService.validateUser(email, password, auditContext);
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: {
          error_code: 'INVALID_CREDENTIALS',
          message: 'Email hoặc mật khẩu không đúng',
        },
      });
    }
    return user;
  }

  /**
   * Extract IP address from request, handling proxy headers
   */
  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Generate request ID if not provided
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
