import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CachedUserData {
  userId: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

interface DuplicateTransactionData {
  reference: string;
  authorization_url: string;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Clean expired entries periodically
   */
  constructor() {
    setInterval(() => this.cleanExpired(), 60000); // Clean every minute
  }

  /**
   * Generate cache key for duplicate transaction check
   */
  private getDuplicateTransactionKey(amount: number, userId?: number): string {
    return `duplicate_txn:${userId || 'guest'}:${amount}`;
  }

  /**
   * Check if a duplicate transaction exists in cache
   */
  checkDuplicateTransaction(
    amount: number,
    userId?: number,
  ): DuplicateTransactionData | null {
    const key = this.getDuplicateTransactionKey(amount, userId);
    return this.get<DuplicateTransactionData>(key);
  }

  /**
   * Cache a pending transaction for 5 minutes to prevent duplicates
   */
  cachePendingTransaction(
    amount: number,
    reference: string,
    authorizationUrl: string,
    userId?: number,
  ): void {
    const key = this.getDuplicateTransactionKey(amount, userId);
    const value: DuplicateTransactionData = {
      reference,
      authorization_url: authorizationUrl,
    };

    // Cache for 5 minutes
    this.set(key, value, 300000);
  }

  /**
   * Invalidate duplicate transaction cache
   */
  invalidateDuplicateTransaction(amount: number, userId?: number): void {
    const key = this.getDuplicateTransactionKey(amount, userId);
    this.delete(key);
  }

  /**
   * Cache user data for faster access
   */
  cacheUser(userId: number, userData: CachedUserData, ttl = 3600000): void {
    const key = `user:${userId}`;
    this.set(key, userData, ttl);
  }

  /**
   * Get cached user data
   */
  getCachedUser(userId: number): CachedUserData | null {
    const key = `user:${userId}`;
    return this.get<CachedUserData>(key);
  }

  /**
   * Invalidate user cache
   */
  invalidateUser(userId: number): void {
    const key = `user:${userId}`;
    this.delete(key);
  }

  /**
   * Generic get method
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Generic set method with TTL
   */
  private set<T>(key: string, value: T, ttl: number): void {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Generic delete method
   */
  private delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clean expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
