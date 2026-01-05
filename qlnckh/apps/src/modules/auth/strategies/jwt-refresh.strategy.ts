import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          // Extract refresh token from HttpOnly cookie
          return request?.cookies?.refresh_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: JwtPayload) {
    const refreshToken = request.cookies?.refresh_token;

    if (!refreshToken || !payload.sub) {
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REVOKED',
          message: 'Vui lòng đăng nhập lại',
        },
      });
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      facultyId: payload.facultyId,
      refreshToken,
    };
  }
}
