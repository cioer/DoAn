import { Module, Global } from '@nestjs/common';
import {
  IdempotencyInterceptor,
  IdempotencyCacheService,
} from './index';

/**
 * Idempotency Module
 *
 * Provides idempotency interceptor and cache service for preventing
 * duplicate state-changing actions (Story 3.8).
 *
 * This is a global module - once imported, the interceptor and service
 * are available throughout the application.
 *
 * Usage:
 * 1. Import this module in app.module.ts or feature modules
 * 2. Use @UseInterceptors(IdempotencyInterceptor) on controllers or endpoints
 * 3. Client sends X-Idempotency-Key header with UUID v4
 *
 * @see {Story 3.8} Idempotency Keys (Anti Double-Submit)
 */
@Global()
@Module({
  providers: [IdempotencyInterceptor, IdempotencyCacheService],
  exports: [IdempotencyInterceptor, IdempotencyCacheService],
})
export class IdempotencyModule {}
