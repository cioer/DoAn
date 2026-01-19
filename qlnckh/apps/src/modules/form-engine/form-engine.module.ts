import { Module } from '@nestjs/common';
import { FormEngineService } from './form-engine.service';
import { FormContextService } from './form-context.service';
import { FormEngineController } from './form-engine.controller';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Form Engine Module
 *
 * Provides integration with the Python FormEngine microservice
 * for advanced document generation with:
 * - Smart variable replacement
 * - PDF conversion via LibreOffice
 * - Dynamic table generation
 * - List alignment preservation
 * - Context builders for all 18 form templates
 *
 * Configuration:
 * - FORM_ENGINE_URL: Base URL of the FormEngine service (default: http://localhost:8080)
 * - FORM_ENGINE_TIMEOUT: Request timeout in ms (default: 30000)
 */
@Module({
  imports: [RbacModule],
  controllers: [FormEngineController],
  providers: [FormEngineService, FormContextService],
  exports: [FormEngineService, FormContextService],
})
export class FormEngineModule {}
