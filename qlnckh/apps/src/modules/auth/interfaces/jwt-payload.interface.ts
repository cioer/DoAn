import { UserRole } from '@prisma/client';
import { Permission } from '../../../modules/rbac/permissions.enum';

export interface JwtPayload {
  sub: string;      // User ID
  email: string;
  role: UserRole;
  facultyId?: string | null;
  actingAs?: string; // Demo mode: acting as this user ID
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
  actingAs?: TokenResponseUser; // Demo mode: acting as user
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
