import { Test, TestingModule } from '@nestjs/testing';
import {
  IdempotencyInterceptor,
  Idempotency,
} from './idempotency.interceptor';
import { IdempotencyCacheService } from './idempotency-cache.service';
import {
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { Reflector } from '@nestjs/core';

// Mock Reflector class
class MockReflector {
  get = jest.fn(() => undefined);
  getAllAndOverride = jest.fn(() => undefined);
}

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let cacheService: IdempotencyCacheService;
  let reflector: MockReflector;

  beforeEach(async () => {
    reflector = new MockReflector();
    cacheService = new IdempotencyCacheService();

    // Directly instantiate interceptor with mocks
    interceptor = new IdempotencyInterceptor(cacheService, reflector as any);

    // Clear cache before each test
    cacheService.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cacheService.clear();
  });

  const createMockContext = (
    method: string = 'POST',
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    const mockRequest = {
      method,
      headers,
    };

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
    };

    const mockHandler = () => {};
    mockHandler.toString = () => 'testHandler';

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => mockHandler,
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (
    response: any = { success: true, data: 'test' },
  ): CallHandler => {
    return {
      handle: () => of(response),
    } as CallHandler;
  };

  describe('AC1: Client generates UUID v4 idempotency key', () => {
    it('should accept valid UUID v4 in X-Idempotency-Key header', (done) => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const context = createMockContext('POST', {
        'x-idempotency-key': validUuid,
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        expect(result).toEqual({ success: true, data: 'test' });
        done();
      });
    });

    it('should accept UUID with different letter case', (done) => {
      const validUuid = '550E8400-E29B-41D4-A716-446655440000'; // Uppercase
      const context = createMockContext('POST', {
        'x-idempotency-key': validUuid,
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        expect(result).toEqual({ success: true, data: 'test' });
        done();
      });
    });
  });

  describe('AC2: Middleware stores result when key not in cache', () => {
    it('should execute action and cache result when key is new', (done) => {
      const newKey = '550e8400-e29b-41d4-a716-446655440001';
      const context = createMockContext('POST', {
        'x-idempotency-key': newKey,
      });
      const next = createMockCallHandler();

      const handleSpy = jest.spyOn(next, 'handle');

      interceptor.intercept(context, next).subscribe((result) => {
        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ success: true, data: 'test' });

        // Verify result is cached
        const cached = cacheService.get(newKey);
        expect(cached).not.toBeNull();
        expect(cached?.data).toEqual({ success: true, data: 'test' });

        done();
      });
    });

    it('should set TTL = 5 minutes (300 seconds)', (done) => {
      const newKey = '550e8400-e29b-41d4-a716-446655440002';
      const context = createMockContext('POST', {
        'x-idempotency-key': newKey,
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        const cached = cacheService.get(newKey);
        expect(cached?.ttl).toBe(300);
        done();
      });
    });
  });

  describe('AC3: Middleware returns cached result when key exists', () => {
    it('should return cached result and skip execution', (done) => {
      const existingKey = '550e8400-e29b-41d4-a716-446655440003';
      const cachedData = { success: true, data: 'cached-result' };

      // Pre-populate cache
      cacheService.set(existingKey, 200, cachedData);

      const context = createMockContext('POST', {
        'x-idempotency-key': existingKey,
      });
      const next = createMockCallHandler();

      const handleSpy = jest.spyOn(next, 'handle');

      interceptor.intercept(context, next).subscribe((result) => {
        // Action should NOT be executed again
        expect(handleSpy).not.toHaveBeenCalled();

        // Should return cached result
        expect(result).toEqual(cachedData);
        done();
      });
    });

    it('should return cached result with original status code', (done) => {
      const existingKey = '550e8400-e29b-41d4-a716-446655440004';
      const cachedData = { success: true, data: 'created' };

      cacheService.set(existingKey, 201, cachedData);

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
      };

      const mockHandler = () => {};
      mockHandler.toString = () => 'testHandler';

      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => ({
            method: 'POST',
            headers: { 'x-idempotency-key': existingKey },
          }),
          getResponse: () => mockResponse,
        }),
        getHandler: () => mockHandler,
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        done();
      });
    });
  });

  describe('Error handling: Missing or invalid idempotency key', () => {
    it('should return 400 when X-Idempotency-Key header is missing', (done) => {
      const context = createMockContext('POST', {}); // No idempotency key
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(BadRequestException);
          expect(err.response.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
          done();
        },
      });
    });

    it('should return 400 when idempotency key is not valid UUID v4', (done) => {
      const invalidKey = 'not-a-uuid';
      const context = createMockContext('POST', {
        'x-idempotency-key': invalidKey,
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(BadRequestException);
          expect(err.response.error.code).toBe('IDEMPOTENCY_KEY_INVALID');
          done();
        },
      });
    });

    it('should reject UUID v1 format', (done) => {
      const uuidV1 = '00000000-0000-0000-0000-000000000001';
      const context = createMockContext('POST', {
        'x-idempotency-key': uuidV1,
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(BadRequestException);
          done();
        },
      });
    });
  });

  describe('Method filtering', () => {
    it('should skip idempotency check for GET requests', (done) => {
      const context = createMockContext('GET', {}); // No idempotency key
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        // Should proceed without error
        expect(result).toEqual({ success: true, data: 'test' });
        done();
      });
    });

    it('should skip idempotency check for GET requests even with key present', (done) => {
      const context = createMockContext('GET', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        expect(result).toEqual({ success: true, data: 'test' });
        done();
      });
    });

    it('should apply idempotency to POST requests', (done) => {
      const context = createMockContext('POST', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = jest.spyOn(next, 'handle');

      interceptor.intercept(context, next).subscribe(() => {
        expect(handleSpy).toHaveBeenCalled();
        done();
      });
    });

    it('should apply idempotency to PUT requests', (done) => {
      const context = createMockContext('PUT', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = jest.spyOn(next, 'handle');

      interceptor.intercept(context, next).subscribe(() => {
        expect(handleSpy).toHaveBeenCalled();
        done();
      });
    });

    it('should apply idempotency to DELETE requests', (done) => {
      const context = createMockContext('DELETE', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = jest.spyOn(next, 'handle');

      interceptor.intercept(context, next).subscribe(() => {
        expect(handleSpy).toHaveBeenCalled();
        done();
      });
    });

    it('should apply idempotency to PATCH requests', (done) => {
      const context = createMockContext('PATCH', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = jest.spyOn(next, 'handle');

      interceptor.intercept(context, next).subscribe(() => {
        expect(handleSpy).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('@Idempotency decorator', () => {
    it('should skip idempotency when decorator is set to false', (done) => {
      jest.spyOn(reflector, 'get').mockReturnValue(false);

      const context = createMockContext('POST', {}); // No key but disabled
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        expect(result).toEqual({ success: true, data: 'test' });
        done();
      });
    });
  });

  describe('Error handling in action execution', () => {
    it('should not cache error responses', (done) => {
      const newKey = '550e8400-e29b-41d4-a716-446655440005';
      const context = createMockContext('POST', {
        'x-idempotency-key': newKey,
      });

      const errorResponse = new BadRequestException('Validation failed');
      const next: CallHandler = {
        handle: () => throwError(() => errorResponse),
      } as CallHandler;

      interceptor.intercept(context, next).subscribe({
        error: (err) => {
          expect(err).toEqual(errorResponse);

          // Verify error was NOT cached
          const cached = cacheService.get(newKey);
          expect(cached).toBeNull();

          done();
        },
      });
    });
  });

  describe('AC4-AC7: Double-click prevention scenarios', () => {
    it('should handle double-click "Nộp hồ sơ" (Submit) - second request gets cached result', (done) => {
      const submitKey = '550e8400-e29b-41d4-a716-446655440006';
      const submitResult = {
        success: true,
        data: { state: 'FACULTY_REVIEW', message: 'Đã nộp hồ sơ' },
      };

      // First request
      const context1 = createMockContext('POST', {
        'x-idempotency-key': submitKey,
      });
      const next1 = createMockCallHandler(submitResult);

      interceptor.intercept(context1, next1).subscribe((result1) => {
        expect(result1).toEqual(submitResult);

        // Verify cached
        expect(cacheService.get(submitKey)).not.toBeNull();

        // Second request (simulating double-click)
        const context2 = createMockContext('POST', {
          'x-idempotency-key': submitKey,
        });
        const next2 = createMockCallHandler();

        const handleSpy2 = jest.spyOn(next2, 'handle');

        interceptor.intercept(context2, next2).subscribe((result2) => {
          // Second request should NOT execute action
          expect(handleSpy2).not.toHaveBeenCalled();

          // Should return cached result
          expect(result2).toEqual(submitResult);

          done();
        });
      });
    });

    it('should handle double-click "Duyệt hồ sơ" (Approve)', (done) => {
      const approveKey = '550e8400-e29b-41d4-a716-446655440007';
      const approveResult = {
        success: true,
        data: { state: 'SCHOOL_SELECTION_REVIEW', message: 'Đã duyệt' },
      };

      // First request
      const context1 = createMockContext('POST', {
        'x-idempotency-key': approveKey,
      });
      const next1 = createMockCallHandler(approveResult);

      interceptor.intercept(context1, next1).subscribe(() => {
        // Second request
        const context2 = createMockContext('POST', {
          'x-idempotency-key': approveKey,
        });
        const next2 = createMockCallHandler();
        const handleSpy = jest.spyOn(next2, 'handle');

        interceptor.intercept(context2, next2).subscribe((result2) => {
          expect(handleSpy).not.toHaveBeenCalled();
          expect(result2).toEqual(approveResult);
          done();
        });
      });
    });

    it('should handle double-click "Yêu cầu sửa" (Return)', (done) => {
      const returnKey = '550e8400-e29b-41d4-a716-446655440008';
      const returnResult = {
        success: true,
        data: { state: 'CHANGES_REQUESTED', reasonCode: 'THIEU_TAI_LIEU' },
      };

      // First request
      const context1 = createMockContext('POST', {
        'x-idempotency-key': returnKey,
      });
      const next1 = createMockCallHandler(returnResult);

      interceptor.intercept(context1, next1).subscribe(() => {
        // Second request
        const context2 = createMockContext('POST', {
          'x-idempotency-key': returnKey,
        });
        const next2 = createMockCallHandler();
        const handleSpy = jest.spyOn(next2, 'handle');

        interceptor.intercept(context2, next2).subscribe((result2) => {
          expect(handleSpy).not.toHaveBeenCalled();
          expect(result2).toEqual(returnResult);
          done();
        });
      });
    });

    it('should handle double-click "Nộp lại" (Resubmit)', (done) => {
      const resubmitKey = '550e8400-e29b-41d4-a716-446655440009';
      const resubmitResult = {
        success: true,
        data: { state: 'FACULTY_REVIEW', message: 'Đã nộp lại' },
      };

      // First request
      const context1 = createMockContext('POST', {
        'x-idempotency-key': resubmitKey,
      });
      const next1 = createMockCallHandler(resubmitResult);

      interceptor.intercept(context1, next1).subscribe(() => {
        // Second request
        const context2 = createMockContext('POST', {
          'x-idempotency-key': resubmitKey,
        });
        const next2 = createMockCallHandler();
        const handleSpy = jest.spyOn(next2, 'handle');

        interceptor.intercept(context2, next2).subscribe((result2) => {
          expect(handleSpy).not.toHaveBeenCalled();
          expect(result2).toEqual(resubmitResult);
          done();
        });
      });
    });
  });

  describe('Header format variations', () => {
    it('should accept lowercase x-idempotency-key', (done) => {
      const context = createMockContext('POST', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        expect(result).toEqual({ success: true, data: 'test' });
        done();
      });
    });

    it('should accept mixed-case X-Idempotency-Key', (done) => {
      const context = createMockContext('POST', {
        'X-Idempotency-Key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe((result) => {
        expect(result).toEqual({ success: true, data: 'test' });
        done();
      });
    });
  });
});
