import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Cached response data structure
 */
interface CachedResponse {
  statusCode: number;
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Lock entry for race condition protection
 */
interface LockEntry {
  timestamp: number;
}

/**
 * Idempotency Cache Service
 *
 * Manages in-memory caching of idempotency keys and their responses.
 * Uses a Map for storage with TTL support and lock-based race condition protection.
 *
 * Features:
 * - Lock-based protection against concurrent double-clicks
 * - TTL support with automatic cleanup
 * - Configurable via IDEMPOTENCY_TTL_SECONDS env var (default: 300s = 5 minutes)
 *
 * TODO: Replace with Redis for production scaling (Architecture: Redis 7.x)
 * Redis migration path: Use SETNX for locks, SET with EX for caching
 *
 * @see {architecture.md} Idempotency Requirement (UX-6)
 * @see {Story 3.8} Idempotency Keys
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
   * Lock storage for race condition protection
   * When a key is being processed, it's locked to prevent concurrent execution
   */
  private locks = new Map<string, LockEntry>();

  /**
   * Default TTL in seconds (5 minutes = 300 seconds)
   * Per Story 3.8 AC2: TTL = 5 phút
   * Can be overridden via IDEMPOTENCY_TTL_SECONDS environment variable
   */
  private readonly DEFAULT_TTL: number;

  /**
   * Lock timeout in milliseconds (prevents deadlocks)
   * If a lock is held longer than this, it's automatically released
   */
  private readonly LOCK_TIMEOUT = 5000; // 5 seconds

  /**
   * Cache key prefix
   */
  private readonly KEY_PREFIX = 'idempotency:';

  constructor() {
    // Read TTL from environment variable, default to 300 seconds (5 minutes)
    this.DEFAULT_TTL =
      parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '300', 10) || 300;
  }

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
   * Try to acquire a lock for the given idempotency key
   *
   * This prevents race conditions where concurrent requests with the same
   * idempotency key could both pass the cache check before either completes.
   *
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns true if lock acquired, false if already locked
   */
  acquireLock(idempotencyKey: string): boolean {
    const key = this.buildKey(idempotencyKey);
    const lockKey = `lock:${key}`;

    // Clean up expired locks
    this.cleanupExpiredLocks();

    // Try to acquire lock (only if not already locked)
    if (this.locks.has(lockKey)) {
      return false; // Already locked
    }

    this.locks.set(lockKey, { timestamp: Date.now() });
    return true;
  }

  /**
   * Release a lock for the given idempotency key
   *
   * @param idempotencyKey - UUID v4 idempotency key
   */
  releaseLock(idempotencyKey: string): void {
    const key = this.buildKey(idempotencyKey);
    const lockKey = `lock:${key}`;
    this.locks.delete(lockKey);
  }

  /**
   * Clean up expired locks (prevents deadlocks)
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [lockKey, lock] of this.locks.entries()) {
      if (now - lock.timestamp > this.LOCK_TIMEOUT) {
        this.locks.delete(lockKey);
      }
    }
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
    this.locks.clear();
  }
}
