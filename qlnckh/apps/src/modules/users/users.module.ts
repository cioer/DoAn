import { Module } from '@nestjs/common';
import { UsersController, MyAccountController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../auth/prisma.service';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Users Module
 *
 * Handles user management operations:
 * - Create, read, update, delete users
 * - Temporary password generation
 * - Password change and reset
 * - Audit logging for admin actions
 *
 * Controllers:
 * - UsersController: Admin user management (requires USER_MANAGE)
 * - MyAccountController: Self-service endpoints (any authenticated user)
 */
@Module({
  imports: [RbacModule, AuditModule, AuthModule],
  controllers: [UsersController, MyAccountController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
