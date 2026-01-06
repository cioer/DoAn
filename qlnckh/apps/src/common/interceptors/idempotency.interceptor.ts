import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { IdempotencyCacheService } from './idempotency-cache.service';
import { Reflector } from '@nestjs/core';

/**
 * Idempotency Interceptor
 *
 * Prevents duplicate state-changing actions by checking idempotency keys.
 *
 * **How it works:**
 * 1. Extract X-Idempotency-Key header from request
 * 2. Check cache: if key exists, return cached response (skip execution)
 * 3. If key not exists: execute action, cache result with TTL
 *
 * **Per Story 3.8 AC1-AC3:**
 * - Client generates UUID v4 idempotency key
 * - Send in header: X-Idempotency-Key
 * - Middleware intercepts POST/PUT requests with state changes
 * - Check Redis cache: return cached result if exists
 * - Store result with TTL = 5 minutes
 *
 * **Error Responses:**
 * - 400 Bad Request: Missing or invalid X-Idempotency-Key header
 * - 409 Conflict: Idempotency key already processed (returns cached result)
 *
 * @see {Story 3.8} Idempotency Keys (Anti Double-Submit)
 * @see {architecture.md} UX-6: Idempotency Requirement
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: IdempotencyCacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if this endpoint requires idempotency (decorator opt-out)
    const requireIdempotency = this.reflector.get<boolean>(
      'requireIdempotency',
      context.getHandler(),
    );

    // Skip idempotency check if explicitly disabled
    if (requireIdempotency === false) {
      return next.handle();
    }

    // Only check POST/PUT/DELETE/PATCH requests (state-changing methods)
    const method = request.method;
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return next.handle();
    }

    // Extract idempotency key from header
    const idempotencyKey = this.extractIdempotencyKey(request);

    if (!idempotencyKey) {
      return throwError(
        () =>
          new BadRequestException({
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_REQUIRED',
              message:
                'Thiếu X-Idempotency-Key header. Vui lòng tạo UUID v4 và gửi trong header.',
            },
          }),
      );
    }

    // Validate UUID v4 format
    if (!this.isValidUuidV4(idempotencyKey)) {
      return throwError(
        () =>
          new BadRequestException({
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_INVALID',
              message:
                'X-Idempotency-Key không hợp lệ. Phải là UUID v4 format.',
            },
          }),
      );
    }

    // Check cache for existing response
    const cached = this.cacheService.get(idempotencyKey);
    if (cached) {
      // Return cached response with original status code
      response.status(cached.statusCode);
      return of(cached.data);
    }

    // Execute action and cache result
    return next.handle().pipe(
      map((data) => {
        // Cache successful response
        this.cacheService.set(idempotencyKey, response.statusCode, data);
        return data;
      }),
      catchError((error) => {
        // Don't cache errors - let them propagate
        return throwError(() => error);
      }),
    );
  }

  /**
   * Extract idempotency key from request header
   *
   * Supports both X-Idempotency-Key and x-idempotency-key (case-insensitive)
   *
   * @param request - HTTP request object
   * @returns Idempotency key or null if not found
   */
  private extractIdempotencyKey(request: any): string | null {
    const headers = request.headers;

    // Try various header name formats
    const key =
      headers['x-idempotency-key'] ||
      headers['X-Idempotency-Key'] ||
      headers['Idempotency-Key'];

    return key || null;
  }

  /**
   * Validate UUID v4 format
   *
   * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * where x is any hexadecimal digit and y is 8, 9, a, or b
   *
   * @param key - Idempotency key to validate
   * @returns true if valid UUID v4, false otherwise
   */
  private isValidUuidV4(key: string): boolean {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(key);
  }
}

/**
 * Decorator to disable idempotency check for specific endpoints
 *
 * Usage:
 * @Idempotency(false)
 * @Get('public-data')
 * async getPublicData() { ... }
 *
 * @param require - Set to false to disable idempotency check
 */
export const Idempotency = (
  require: boolean = true,
): ParameterDecorator => {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      'requireIdempotency',
      require,
      descriptor.value,
    );
  };
};
