import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. First try Authorization header (for API testing with curl/Postman)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. Fallback to HttpOnly cookie (for browser)
        (request) => {
          return request?.cookies?.access_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException({
        success: false,
        error: {
          error_code: 'INVALID_TOKEN',
          message: 'Token không hợp lệ',
        },
      });
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      facultyId: payload.facultyId,
      actingAs: payload.actingAs, // Demo mode: acting as user ID
    };
  }
}
