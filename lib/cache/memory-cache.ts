/**
 * In-Memory Cache Implementation
 * Basic caching for development (for production, use Redis)
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * Simple in-memory cache with TTL support
 */
export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()

  /**
   * Gets a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * Sets a value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (default: 3600)
   */
  set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { value, expiresAt })
  }

  /**
   * Deletes a value from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Clears expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    for (const entry of this.store.values()) {
      if (entry.expiresAt < now) {
        expired++
      } else {
        active++
      }
    }

    return {
      total: this.store.size,
      active,
      expired,
    }
  }
}

// Singleton instance
export const memoryCache = new MemoryCache()

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup()
  }, 5 * 60 * 1000)
}








