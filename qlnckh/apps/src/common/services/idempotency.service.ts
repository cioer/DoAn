import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

/**
 * Idempotency result wrapper
 * Contains either cached result or newly computed result
 */
export interface IdempotencyResult<T> {
  data: T;
  isCached: boolean;
  key: string;
}

/**
 * Idempotency Service
 *
 * Provides ATOMIC idempotency checks to prevent race conditions.
 * Fixes the bug in WorkflowService where concurrent requests could
 * both pass the "check if key exists" test.
 *
 * **CRITICAL FIX (Tech-Spec Finding F2):**
 * - OLD (BUGGY): if (exists) return cached; else { compute; set; }
 *   → Race condition: Two concurrent requests BOTH pass the check
 *
 * - NEW (FIXED): Atomic check-and-set using Map.prototype
 *   → Only ONE request wins the race
 *
 * **Migration Path (Phase 2+):**
 * - Current: In-memory Map (single-instance safe)
 * - Future: Redis with SET NX (distributed-safe)
 *
 * Usage:
 * ```typescript
 * const result = await idempotencyService.setIfAbsent(
 *   'unique-key',
 *   async () => await expensiveOperation()
 * );
 *
 * if (result.isCached) {
 *   console.log('Returned cached result');
 * }
 * ```
 *
 * @Injectable - Can be injected into any service
 */
@Injectable()
export class IdempotencyService implements OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly cache = new Map<string, any>();
  private readonly pendingRequests = new Map<string, Promise<any>>();

  /**
   * Atomic check-and-set operation
   * Ensures only ONE request computes the value for a given key
   *
   * @param key - Unique idempotency key
   * @param fn - Function to execute if key doesn't exist
   * @returns Result with isCached flag
   *
   * @example
   * const result = await this.idempotency.setIfAbsent(key, async () => {
   *   return await this.workflowService.approveFaculty(context);
   * });
   *
   * if (result.isCached) {
   *   this.logger.log(`Returned cached result for ${key}`);
   * }
   */
  async setIfAbsent<T>(key: string, fn: () => Promise<T>): Promise<IdempotencyResult<T>> {
    // ATOMIC CHECK 1: Is value already computed?
    if (this.cache.has(key)) {
      this.logger.debug(`Idempotency cache hit: ${key}`);
      return {
        data: this.cache.get(key),
        isCached: true,
        key,
      };
    }

    // ATOMIC CHECK 2: Is request pending (being computed by another concurrent request)?
    const pending = this.pendingRequests.get(key);
    if (pending) {
      this.logger.debug(`Idempotency pending request: ${key} - waiting...`);
      try {
        const data = await pending;
        return {
          data,
          isCached: true, // Treated as cached since we didn't compute it
          key,
        };
      } catch (error) {
        // If pending request failed, remove it and try again
        this.pendingRequests.delete(key);
        throw error;
      }
    }

    // ATOMIC SET: Mark this request as the one that will compute the value
    this.logger.debug(`Idempotency cache miss: ${key} - computing...`);

    // Create the promise immediately and store it
    const promise = Promise.resolve(fn()).then((data) => {
      // Store result in cache
      this.cache.set(key, data);
      // Remove from pending
      this.pendingRequests.delete(key);
      return data;
    }).catch((error) => {
      // Remove from pending on error
      this.pendingRequests.delete(key);
      throw error;
    });

    // Store promise BEFORE awaiting (atomic)
    this.pendingRequests.set(key, promise);

    try {
      const data = await promise;
      return {
        data,
        isCached: false,
        key,
      };
    } catch (error) {
      // Clean up on error
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Get cached value without computing
   * Returns undefined if key doesn't exist
   *
   * @param key - Idempotency key
   * @returns Cached value or undefined
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  /**
   * Check if key exists in cache
   *
   * @param key - Idempotency key
   * @returns true if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Set value in cache (manual override)
   * Use with caution - prefer setIfAbsent for automatic idempotency
   *
   * @param key - Idempotency key
   * @param value - Value to cache
   */
  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  /**
   * Remove value from cache
   *
   * @param key - Idempotency key
   */
  delete(key: string): boolean {
    this.pendingRequests.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   * Useful for testing or force refresh
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.logger.debug('Idempotency cache cleared');
  }

  /**
   * Get cache statistics
   * Useful for monitoring and debugging
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup on module destroy
   * Prevents memory leaks
   */
  onModuleDestroy(): void {
    this.logger.debug('Cleaning up idempotency cache...');
    this.clear();
  }

  /**
   * FUTURE: Redis migration path (Phase 2)
   *
   * When migrating to Redis:
   * 1. Replace Map with Redis client
   * 2. Use SET NX command for atomic check-and-set
   * 3. Add TTL for automatic expiration
   *
   * Example Redis implementation:
   *
   * ```typescript
   * async setIfAbsentRedis<T>(key: string, fn: () => Promise<T>): Promise<T> {
   *   // Try to set with NX (only if not exists)
   *   const set = await this.redis.set(key, 'PROCESSING', {
   *     NX: true, // Only set if not exists
   *     EX: 3600, // Expire after 1 hour
   *   });
   *
   *   if (set === 'OK') {
   *     // We won the race - compute value
   *     try {
   *       const data = await fn();
   *       await this.redis.set(key, JSON.stringify(data), { EX: 3600 });
   *       return data;
   *     } catch (error) {
   *       await this.redis.del(key);
   *       throw error;
   *     }
   *   } else {
   *     // Another request is processing or has processed
   *     // Poll for result
   *     let attempts = 0;
   *     while (attempts < 100) {
   *       const cached = await this.redis.get(key);
   *       if (cached && cached !== 'PROCESSING') {
   *         return JSON.parse(cached);
   *       }
   *       await new Promise(r => setTimeout(r, 100));
   *       attempts++;
   *     }
   *     throw new Error('Idempotency timeout');
   *   }
   * }
   * ```
   */
}
