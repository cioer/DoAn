import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RbacService } from './rbac.service';
import { PrismaService } from '../auth/prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [RbacService, PrismaService],
  exports: [RbacService, PrismaService],
})
export class RbacModule {}
