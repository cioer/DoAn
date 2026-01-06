import { Module } from '@nestjs/common';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';
import { PrismaService } from '../auth/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService, PrismaService],
  exports: [FormTemplatesService],
})
export class FormTemplatesModule {}
