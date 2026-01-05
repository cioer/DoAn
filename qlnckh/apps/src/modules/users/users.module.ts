import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
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
 * - Audit logging for admin actions
 *
 * Requires USER_MANAGE permission for all operations
 */
@Module({
  imports: [RbacModule, AuditModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
