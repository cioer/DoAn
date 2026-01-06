import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyCacheService } from './idempotency-cache.service';

describe('IdempotencyCacheService', () => {
  let service: IdempotencyCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyCacheService],
    }).compile();

    service = module.get<IdempotencyCacheService>(IdempotencyCacheService);

    // Clear cache before each test
    service.clear();
  });

  afterEach(() => {
    service.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      const result = service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return cached response for existing key', () => {
      service.set('test-key', 200, { success: true, data: 'test' });
      const result = service.get('test-key');

      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(200);
      expect(result?.data).toEqual({ success: true, data: 'test' });
    });

    it('should return null for expired key', async () => {
      // Set with very short TTL (10ms)
      service.set('test-key', 200, { data: 'test' }, 0.01);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = service.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store response with default TTL (5 minutes)', () => {
      service.set('test-key', 200, { data: 'test' });

      const result = service.get('test-key');
      expect(result).toBeDefined();
      expect(result?.statusCode).toBe(200);
      expect(result?.data).toEqual({ data: 'test' });
      expect(result?.ttl).toBe(300); // Default TTL
    });

    it('should store response with custom TTL', () => {
      service.set('test-key', 201, { data: 'created' }, 60);

      const result = service.get('test-key');
      expect(result?.ttl).toBe(60);
    });

    it('should overwrite existing key', () => {
      service.set('test-key', 200, { data: 'first' });
      service.set('test-key', 201, { data: 'second' });

      const result = service.get('test-key');
      expect(result?.data).toEqual({ data: 'second' });
      expect(result?.statusCode).toBe(201);
    });
  });

  describe('delete', () => {
    it('should remove existing key', () => {
      service.set('test-key', 200, { data: 'test' });
      expect(service.get('test-key')).not.toBeNull();

      service.delete('test-key');
      expect(service.get('test-key')).toBeNull();
    });

    it('should not throw when deleting non-existent key', () => {
      expect(() => service.delete('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cached entries', () => {
      service.set('key1', 200, { data: '1' });
      service.set('key2', 200, { data: '2' });
      service.set('key3', 200, { data: '3' });

      expect(service.size()).toBe(3);

      service.clear();

      expect(service.size()).toBe(0);
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
      expect(service.get('key3')).toBeNull();
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(service.size()).toBe(0);
    });

    it('should return correct count of entries', () => {
      expect(service.size()).toBe(0);

      service.set('key1', 200, { data: '1' });
      expect(service.size()).toBe(1);

      service.set('key2', 200, { data: '2' });
      expect(service.size()).toBe(2);

      service.delete('key1');
      expect(service.size()).toBe(1);
    });
  });

  describe('TTL behavior', () => {
    it('should auto-delete after TTL expires', async () => {
      service.set('test-key', 200, { data: 'test' }, 0.01);

      // Immediately after set, key should exist
      expect(service.get('test-key')).not.toBeNull();

      // After TTL expires, key should be auto-deleted
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(service.get('test-key')).toBeNull();
      expect(service.size()).toBe(0);
    });

    it('should handle multiple keys with different TTLs', async () => {
      service.set('short-key', 200, { data: 'short' }, 0.01);
      service.set('long-key', 200, { data: 'long' }, 10);

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Short key should be expired
      expect(service.get('short-key')).toBeNull();

      // Long key should still exist
      expect(service.get('long-key')).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string keys', () => {
      service.set('', 200, { data: 'empty-key' });
      expect(service.get('')).not.toBeNull();
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key-with-special-chars-!@#$%^&*()';
      service.set(specialKey, 200, { data: 'special' });
      expect(service.get(specialKey)).not.toBeNull();
    });

    it('should handle very large data', () => {
      const largeData = {
        data: 'x'.repeat(10000),
        nested: { y: 'y'.repeat(10000) },
      };

      service.set('large-key', 200, largeData);
      const result = service.get('large-key');

      expect(result?.data).toEqual(largeData);
    });

    it('should handle null and undefined data', () => {
      service.set('null-key', 200, null);
      expect(service.get('null-key')?.data).toBeNull();

      service.set('undefined-key', 200, undefined);
      expect(service.get('undefined-key')?.data).toBeUndefined();
    });
  });
});
