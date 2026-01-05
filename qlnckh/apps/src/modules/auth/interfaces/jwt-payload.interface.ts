import { UserRole } from '@prisma/client';
import { Permission } from '../../modules/rbac/permissions.enum';

export interface JwtPayload {
  sub: string;      // User ID
  email: string;
  role: UserRole;
  facultyId?: string | null;
  iat?: number;
  exp?: number;
}

export interface TokenResponseUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  facultyId?: string | null;
  permissions: Permission[];
}

export interface TokenResponse {
  user: TokenResponseUser;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
