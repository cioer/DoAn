import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyService],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  afterEach(() => {
    service.clear();
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should compute and cache value on first call', async () => {
      const mockFn = jest.fn().mockResolvedValue('result-1');
      const result = await service.setIfAbsent('key-1', mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result.data).toBe('result-1');
      expect(result.isCached).toBe(false);
      expect(result.key).toBe('key-1');
    });

    it('should return cached value on second call', async () => {
      const mockFn = jest.fn().mockResolvedValue('result-1');

      // First call - compute
      const result1 = await service.setIfAbsent('key-1', mockFn);
      expect(result1.isCached).toBe(false);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Second call - cached
      const result2 = await service.setIfAbsent('key-1', mockFn);
      expect(result2.isCached).toBe(true);
      expect(result2.data).toBe('result-1');
      expect(mockFn).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should return undefined for non-existent key', () => {
      expect(service.get('non-existent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      expect(service.has('key-1')).toBe(false);

      service.set('key-1', 'value');
      expect(service.has('key-1')).toBe(true);
    });

    it('should set value manually', () => {
      service.set('key-1', 'manual-value');
      expect(service.get('key-1')).toBe('manual-value');
    });

    it('should delete value', () => {
      service.set('key-1', 'value');
      expect(service.has('key-1')).toBe(true);

      service.delete('key-1');
      expect(service.has('key-1')).toBe(false);
    });

    it('should clear all values', () => {
      service.set('key-1', 'value-1');
      service.set('key-2', 'value-2');
      expect(service.getStats().cacheSize).toBe(2);

      service.clear();
      expect(service.getStats().cacheSize).toBe(0);
    });

    it('should return cache stats', () => {
      service.set('key-1', 'value-1');
      service.set('key-2', 'value-2');

      const stats = service.getStats();
      expect(stats.cacheSize).toBe(2);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.cacheKeys).toContain('key-1');
      expect(stats.cacheKeys).toContain('key-2');
    });
  });

  describe('Concurrent Access (CRITICAL - Race Condition Fix)', () => {
    it('should prevent race condition - only ONE request computes value', async () => {
      let computeCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        computeCount++;
        // Simulate slow operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        return `result-${computeCount}`;
      });

      // Launch 10 concurrent requests with SAME key
      const promises = Array.from({ length: 10 }, () =>
        service.setIfAbsent('race-key', mockFn),
      );

      const results = await Promise.all(promises);

      // CRITICAL ASSERTION: Only ONE request should compute
      expect(computeCount).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // All requests should get the same result
      results.forEach((result) => {
        expect(result.data).toBe('result-1');
        expect(result.key).toBe('race-key');
      });

      // First request is NOT cached, rest ARE cached
      const nonCachedCount = results.filter((r) => !r.isCached).length;
      const cachedCount = results.filter((r) => r.isCached).length;
      expect(nonCachedCount).toBe(1);
      expect(cachedCount).toBe(9);
    });

    it('should handle concurrent requests with DIFFERENT keys', async () => {
      const mockFn = jest.fn().mockImplementation(async (key: string) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return `result-${key}`;
      });

      // Launch 5 concurrent requests with DIFFERENT keys
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.setIfAbsent(`key-${i}`, () => mockFn(`key-${i}`)),
      );

      const results = await Promise.all(promises);

      // Each key should be computed separately
      expect(mockFn).toHaveBeenCalledTimes(5);

      // All should be non-cached (first time for each key)
      results.forEach((result) => {
        expect(result.isCached).toBe(false);
      });
    });

    it('should handle errors in concurrent requests gracefully', async () => {
      let shouldFail = true;
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (shouldFail) {
          throw new Error('Compute failed');
        }
        return 'success';
      });

      // Launch 10 concurrent requests - all will fail
      const promises1 = Array.from({ length: 10 }, () =>
        service.setIfAbsent('fail-key', mockFn).catch((e) => ({ error: e.message })),
      );

      const results1 = await Promise.all(promises1);
      results1.forEach((result: any) => {
        expect(result.error).toBe('Compute failed');
      });

      // Now retry - should succeed
      shouldFail = false;
      const result2 = await service.setIfAbsent('fail-key', mockFn);
      expect(result2.data).toBe('success');
      expect(result2.isCached).toBe(false);
    });

    it('should handle rapid-fire requests (stress test)', async () => {
      let computeCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        computeCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `result-${computeCount}`;
      });

      // Launch 100 rapid concurrent requests
      const promises = Array.from({ length: 100 }, () =>
        service.setIfAbsent('stress-key', mockFn),
      );

      const results = await Promise.all(promises);

      // CRITICAL: Only ONE computation
      expect(computeCount).toBe(1);

      // All results identical
      const firstResult = results[0].data;
      results.forEach((result) => {
        expect(result.data).toBe(firstResult);
      });
    });

    it('should allow retry after first computation completes', async () => {
      let computeCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        computeCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return `result-${computeCount}`;
      });

      // First batch - 5 concurrent requests
      const batch1 = await Promise.all(
        Array.from({ length: 5 }, () => service.setIfAbsent('key-1', mockFn)),
      );

      expect(computeCount).toBe(1);
      expect(batch1[0].isCached).toBe(false);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second batch - should all be cached
      const batch2 = await Promise.all(
        Array.from({ length: 5 }, () => service.setIfAbsent('key-1', mockFn)),
      );

      expect(computeCount).toBe(1); // No new computations
      batch2.forEach((result) => {
        expect(result.isCached).toBe(true);
        expect(result.data).toBe('result-1');
      });
    });
  });

  describe('Pending Request Tracking', () => {
    it('should track pending requests during computation', async () => {
      let computeCount = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        computeCount++;
        // Small delay to ensure promise is set before checking
        await new Promise((resolve) => setTimeout(resolve, 10));
        // Check pending stats during computation
        const stats = service.getStats();
        expect(stats.pendingRequests).toBeGreaterThan(0);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'result';
      });

      // Launch concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        service.setIfAbsent('pending-key', mockFn),
      );

      await Promise.all(promises);

      // After completion, no pending requests
      const finalStats = service.getStats();
      expect(finalStats.pendingRequests).toBe(0);
    });

    it('should remove pending request on error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      try {
        await service.setIfAbsent('error-key', mockFn);
      } catch (e) {
        // Expected error
      }

      // Pending should be cleaned up
      const stats = service.getStats();
      expect(stats.pendingRequests).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from compute function', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Compute error'));

      await expect(
        service.setIfAbsent('error-key', mockFn),
      ).rejects.toThrow('Compute error');
    });

    it('should allow retry after error', async () => {
      let shouldFail = true;
      const mockFn = jest.fn().mockImplementation(async () => {
        if (shouldFail) {
          throw new Error('Temporary error');
        }
        return 'success';
      });

      // First call fails
      await expect(
        service.setIfAbsent('retry-key', mockFn),
      ).rejects.toThrow('Temporary error');

      // Retry succeeds
      shouldFail = false;
      const result = await service.setIfAbsent('retry-key', mockFn);
      expect(result.data).toBe('success');
    });

    it('should not cache failed computations', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      try {
        await service.setIfAbsent('no-cache-key', mockFn);
      } catch (e) {
        // Expected
      }

      // Key should not be in cache
      expect(service.has('no-cache-key')).toBe(false);
    });
  });

  describe('Module Lifecycle', () => {
    it('should cleanup cache on module destroy', async () => {
      service.set('key-1', 'value-1');
      service.set('key-2', 'value-2');

      expect(service.getStats().cacheSize).toBe(2);

      await service.onModuleDestroy();

      expect(service.getStats().cacheSize).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string keys', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const result = await service.setIfAbsent('', mockFn);

      expect(result.data).toBe('result');
      expect(result.key).toBe('');
    });

    it('should handle null and undefined values', async () => {
      const mockFn1 = jest.fn().mockResolvedValue(null);
      const result1 = await service.setIfAbsent('null-key', mockFn1);

      expect(result1.data).toBeNull();
      expect(service.get('null-key')).toBeNull();

      const mockFn2 = jest.fn().mockResolvedValue(undefined);
      const result2 = await service.setIfAbsent('undefined-key', mockFn2);

      expect(result2.data).toBeUndefined();
      expect(service.get('undefined-key')).toBeUndefined();
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(10000);
      const mockFn = jest.fn().mockResolvedValue('result');

      const result = await service.setIfAbsent(longKey, mockFn);

      expect(result.data).toBe('result');
      expect(service.has(longKey)).toBe(true);
    });

    it('should handle synchronous functions', async () => {
      const mockFn = jest.fn().mockReturnValue('sync-result');
      const result = await service.setIfAbsent('sync-key', mockFn);

      expect(result.data).toBe('sync-result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
