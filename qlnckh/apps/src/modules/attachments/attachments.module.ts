import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../auth/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { ProposalsModule } from '../proposals/proposals.module';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    AuditModule,
    ProposalsModule,
    // Serve static files from /uploads directory (Story 2.4 - Fix for download button)
    ServeStaticModule.forRoot({
      rootPath: process.env.UPLOAD_DIR || '/app/uploads',
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrismaService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
