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
    vi.clearAllMocks();
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
      status: vi.fn().mockReturnThis(),
    };

    const mockHandler = () => {};
    mockHandler.toString = () => 'testHandler';

    return {
      switchToHttp: vi.fn().mockReturnValue({
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
    it('should accept valid UUID v4 in X-Idempotency-Key header', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const context = createMockContext('POST', {
        'x-idempotency-key': validUuid,
      });
      const next = createMockCallHandler();

      const result = await firstValueFrom(interceptor.intercept(context, next));
      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should accept UUID with different letter case', async () => {
      const validUuid = '550E8400-E29B-41D4-A716-446655440000'; // Uppercase
      const context = createMockContext('POST', {
        'x-idempotency-key': validUuid,
      });
      const next = createMockCallHandler();

      const result = await firstValueFrom(interceptor.intercept(context, next));
      expect(result).toEqual({ success: true, data: 'test' });
    });
  });

  describe('AC2: Middleware stores result when key not in cache', () => {
    it('should execute action and cache result when key is new', async () => {
      const newKey = '550e8400-e29b-41d4-a716-446655440001';
      const context = createMockContext('POST', {
        'x-idempotency-key': newKey,
      });
      const next = createMockCallHandler();

      const handleSpy = vi.spyOn(next, 'handle');

      const result = await firstValueFrom(interceptor.intercept(context, next));

      expect(handleSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, data: 'test' });

      // Verify result is cached
      const cached = cacheService.get(newKey);
      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual({ success: true, data: 'test' });
    });

    it('should set TTL = 5 minutes (300 seconds)', async () => {
      const newKey = '550e8400-e29b-41d4-a716-446655440002';
      const context = createMockContext('POST', {
        'x-idempotency-key': newKey,
      });
      const next = createMockCallHandler();

      await firstValueFrom(interceptor.intercept(context, next));

      const cached = cacheService.get(newKey);
      expect(cached?.ttl).toBe(300);
    });
  });

  describe('AC3: Middleware returns cached result when key exists', () => {
    it('should return cached result and skip execution', async () => {
      const existingKey = '550e8400-e29b-41d4-a716-446655440003';
      const cachedData = { success: true, data: 'cached-result' };

      // Pre-populate cache
      cacheService.set(existingKey, 200, cachedData);

      const context = createMockContext('POST', {
        'x-idempotency-key': existingKey,
      });
      const next = createMockCallHandler();

      const handleSpy = vi.spyOn(next, 'handle');

      const result = await firstValueFrom(interceptor.intercept(context, next));

      // Action should NOT be executed again
      expect(handleSpy).not.toHaveBeenCalled();

      // Should return cached result
      expect(result).toEqual(cachedData);
    });

    it('should return cached result with original status code', async () => {
      const existingKey = '550e8400-e29b-41d4-a716-446655440004';
      const cachedData = { success: true, data: 'created' };

      cacheService.set(existingKey, 201, cachedData);

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
      };

      const mockHandler = () => {};
      mockHandler.toString = () => 'testHandler';

      const context = {
        switchToHttp: vi.fn().mockReturnValue({
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

      await firstValueFrom(interceptor.intercept(context, next));

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Error handling: Missing or invalid idempotency key', () => {
    it('should return 400 when X-Idempotency-Key header is missing', async () => {
      const context = createMockContext('POST', {}); // No idempotency key
      const next = createMockCallHandler();

      await expect(firstValueFrom(interceptor.intercept(context, next)))
        .rejects.toThrow(BadRequestException);
    });

    it('should return 400 when idempotency key is not valid UUID v4', async () => {
      const invalidKey = 'not-a-uuid';
      const context = createMockContext('POST', {
        'x-idempotency-key': invalidKey,
      });
      const next = createMockCallHandler();

      await expect(firstValueFrom(interceptor.intercept(context, next)))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject UUID v1 format', async () => {
      const uuidV1 = '00000000-0000-0000-0000-000000000001';
      const context = createMockContext('POST', {
        'x-idempotency-key': uuidV1,
      });
      const next = createMockCallHandler();

      await expect(firstValueFrom(interceptor.intercept(context, next)))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Method filtering', () => {
    it('should skip idempotency check for GET requests', async () => {
      const context = createMockContext('GET', {}); // No idempotency key
      const next = createMockCallHandler();

      const result = await firstValueFrom(interceptor.intercept(context, next));

      // Should proceed without error
      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should skip idempotency check for GET requests even with key present', async () => {
      const context = createMockContext('GET', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const result = await firstValueFrom(interceptor.intercept(context, next));

      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should apply idempotency to POST requests', async () => {
      const context = createMockContext('POST', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = vi.spyOn(next, 'handle');

      await firstValueFrom(interceptor.intercept(context, next));

      expect(handleSpy).toHaveBeenCalled();
    });

    it('should apply idempotency to PUT requests', async () => {
      const context = createMockContext('PUT', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = vi.spyOn(next, 'handle');

      await firstValueFrom(interceptor.intercept(context, next));

      expect(handleSpy).toHaveBeenCalled();
    });

    it('should apply idempotency to DELETE requests', async () => {
      const context = createMockContext('DELETE', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = vi.spyOn(next, 'handle');

      await firstValueFrom(interceptor.intercept(context, next));

      expect(handleSpy).toHaveBeenCalled();
    });

    it('should apply idempotency to PATCH requests', async () => {
      const context = createMockContext('PATCH', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const handleSpy = vi.spyOn(next, 'handle');

      await firstValueFrom(interceptor.intercept(context, next));

      expect(handleSpy).toHaveBeenCalled();
    });
  });

  describe('@Idempotency decorator', () => {
    it('should skip idempotency when decorator is set to false', async () => {
      vi.spyOn(reflector, 'get').mockReturnValue(false);

      const context = createMockContext('POST', {}); // No key but disabled
      const next = createMockCallHandler();

      const result = await firstValueFrom(interceptor.intercept(context, next));

      expect(result).toEqual({ success: true, data: 'test' });
    });
  });

  describe('Error handling in action execution', () => {
    it('should not cache error responses', async () => {
      const newKey = '550e8400-e29b-41d4-a716-446655440005';
      const context = createMockContext('POST', {
        'x-idempotency-key': newKey,
      });

      const errorResponse = new BadRequestException('Validation failed');
      const next: CallHandler = {
        handle: () => throwError(() => errorResponse),
      } as CallHandler;

      await expect(firstValueFrom(interceptor.intercept(context, next)))
        .rejects.toEqual(errorResponse);

      // Verify error was NOT cached
      const cached = cacheService.get(newKey);
      expect(cached).toBeNull();
    });
  });

  describe('AC4-AC7: Double-click prevention scenarios', () => {
    it('should handle double-click "Nộp hồ sơ" (Submit) - second request gets cached result', async () => {
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

      const result1 = await firstValueFrom(interceptor.intercept(context1, next1));
      expect(result1).toEqual(submitResult);

      // Verify cached
      expect(cacheService.get(submitKey)).not.toBeNull();

      // Second request (simulating double-click)
      const context2 = createMockContext('POST', {
        'x-idempotency-key': submitKey,
      });
      const next2 = createMockCallHandler();

      const handleSpy2 = vi.spyOn(next2, 'handle');

      const result2 = await firstValueFrom(interceptor.intercept(context2, next2));

      // Second request should NOT execute action
      expect(handleSpy2).not.toHaveBeenCalled();

      // Should return cached result
      expect(result2).toEqual(submitResult);
    });

    it('should handle double-click "Duyệt hồ sơ" (Approve)', async () => {
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

      await firstValueFrom(interceptor.intercept(context1, next1));

      // Second request
      const context2 = createMockContext('POST', {
        'x-idempotency-key': approveKey,
      });
      const next2 = createMockCallHandler();
      const handleSpy = vi.spyOn(next2, 'handle');

      const result2 = await firstValueFrom(interceptor.intercept(context2, next2));

      expect(handleSpy).not.toHaveBeenCalled();
      expect(result2).toEqual(approveResult);
    });

    it('should handle double-click "Yêu cầu sửa" (Return)', async () => {
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

      await firstValueFrom(interceptor.intercept(context1, next1));

      // Second request
      const context2 = createMockContext('POST', {
        'x-idempotency-key': returnKey,
      });
      const next2 = createMockCallHandler();
      const handleSpy = vi.spyOn(next2, 'handle');

      const result2 = await firstValueFrom(interceptor.intercept(context2, next2));

      expect(handleSpy).not.toHaveBeenCalled();
      expect(result2).toEqual(returnResult);
    });

    it('should handle double-click "Nộp lại" (Resubmit)', async () => {
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

      await firstValueFrom(interceptor.intercept(context1, next1));

      // Second request
      const context2 = createMockContext('POST', {
        'x-idempotency-key': resubmitKey,
      });
      const next2 = createMockCallHandler();
      const handleSpy = vi.spyOn(next2, 'handle');

      const result2 = await firstValueFrom(interceptor.intercept(context2, next2));

      expect(handleSpy).not.toHaveBeenCalled();
      expect(result2).toEqual(resubmitResult);
    });
  });

  describe('Header format variations', () => {
    it('should accept lowercase x-idempotency-key', async () => {
      const context = createMockContext('POST', {
        'x-idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const result = await firstValueFrom(interceptor.intercept(context, next));

      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should accept mixed-case X-Idempotency-Key', async () => {
      const context = createMockContext('POST', {
        'X-Idempotency-Key': '550e8400-e29b-41d4-a716-446655440000',
      });
      const next = createMockCallHandler();

      const result = await firstValueFrom(interceptor.intercept(context, next));

      expect(result).toEqual({ success: true, data: 'test' });
    });
  });
});
