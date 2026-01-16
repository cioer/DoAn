import { Module } from '@nestjs/common';
import { ProposalDocumentsController } from './proposal-documents.controller';
import { ProposalDocumentsService } from './proposal-documents.service';
import { FormEngineModule } from '../form-engine/form-engine.module';
import { PrismaService } from '../auth/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * ProposalDocuments Module
 *
 * Quản lý các biểu mẫu NCKH cho proposals:
 * - CRUD operations cho ProposalDocument
 * - Generate form từ template thông qua FormEngine
 * - Workflow approval/rejection
 * - Status-Form mapping theo quy trình NCKH
 *
 * Forms được hỗ trợ:
 * - Phase 1 (Đăng ký): 1b, PL1
 * - Phase 2 (Xét duyệt Khoa): 2b, 3b, 4b
 * - Phase 3 (Tuyển chọn Trường): 5b, 6b, 7b, 8b, 9b
 * - Phase 4 (Triển khai): 10b, 11b, PL2
 * - Phase 5 (Nghiệm thu): 12b-18b, PL3
 */
@Module({
  imports: [AuthModule, RbacModule, FormEngineModule],
  controllers: [ProposalDocumentsController],
  providers: [ProposalDocumentsService, PrismaService],
  exports: [ProposalDocumentsService],
})
export class ProposalDocumentsModule {}
