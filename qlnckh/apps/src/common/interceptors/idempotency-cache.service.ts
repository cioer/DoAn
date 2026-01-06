import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Cached response data structure
 */
interface CachedResponse {
  statusCode: number;
  data: any;
  timestamp: number;
}

/**
 * Idempotency Cache Service
 *
 * Manages in-memory caching of idempotency keys and their responses.
 * Uses a Map for storage with TTL support.
 *
 * TODO: Replace with Redis for production scaling (Architecture: Redis 7.x)
 *
 * @see {architecture.md} Idempotency Requirement
 */
@Injectable()
export class IdempotencyCacheService implements OnModuleDestroy {
  /**
   * In-memory cache storage
   * Key format: idempotency:{uuid}
   * Value: CachedResponse with timestamp for TTL checking
   */
  private cache = new Map<string, CachedResponse>();

  /**
   * Default TTL in seconds (5 minutes = 300 seconds)
   * Per Story 3.8 AC2: TTL = 5 phút
   */
  private readonly DEFAULT_TTL = 300;

  /**
   * Cache key prefix
   */
  private readonly KEY_PREFIX = 'idempotency:';

  /**
   * Get cached response by idempotency key
   *
   * @param idempotencyKey - UUID v4 idempotency key from X-Idempotency-Key header
   * @returns CachedResponse or null if not found or expired
   */
  get(idempotencyKey: string): CachedResponse | null {
    const key = this.buildKey(idempotencyKey);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check TTL - if expired, delete and return null
    if (this.isExpired(cached)) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Set cache entry for idempotency key
   *
   * @param idempotencyKey - UUID v4 idempotency key
   * @param statusCode - HTTP status code
   * @param data - Response data
   * @param ttl - Time to live in seconds (default: 300)
   */
  set(
    idempotencyKey: string,
    statusCode: number,
    data: any,
    ttl: number = this.DEFAULT_TTL,
  ): void {
    const key = this.buildKey(idempotencyKey);
    const cached: CachedResponse = {
      statusCode,
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, cached);

    // Auto-delete after TTL (cleanup)
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl * 1000);
  }

  /**
   * Delete cache entry (for manual cleanup)
   *
   * @param idempotencyKey - UUID v4 idempotency key
   */
  delete(idempotencyKey: string): void {
    const key = this.buildKey(idempotencyKey);
    this.cache.delete(key);
  }

  /**
   * Check if cached response is expired
   *
   * @param cached - CachedResponse object
   * @returns true if expired, false otherwise
   */
  private isExpired(cached: CachedResponse): boolean {
    const ttl = cached.ttl ?? this.DEFAULT_TTL;
    const expiryTime = cached.timestamp + ttl * 1000;
    return Date.now() > expiryTime;
  }

  /**
   * Build full cache key with prefix
   *
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Full cache key
   */
  private buildKey(idempotencyKey: string): string {
    return `${this.KEY_PREFIX}${idempotencyKey}`;
  }

  /**
   * Clear all cache entries (useful for testing)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size (for monitoring)
   *
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    this.clear();
  }
}
