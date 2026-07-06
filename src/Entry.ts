/**
 * Entry type and factory for safe-memory-layer.
 *
 * Represents a single entry in the memory store with expiration tracking.
 *
 * @module Entry
 */

import type { InternalEntry, SetOptions } from "./types.js";

/**
 * Creates a new internal entry with the given value and options.
 *
 * @param key - The key for this entry.
 * @param value - The value to store.
 * @param options - Optional settings including TTL.
 * @param now - Current timestamp (for testability).
 * @returns A new InternalEntry instance.
 */
export function createEntry<K, V>(
  key: K,
  value: V,
  options: SetOptions = {},
  now = Date.now(),
): InternalEntry<K, V> {
  const ttl = options.ttl;
  const expiresAt = ttl !== undefined ? now + ttl : undefined;

  return {
    value,
    key,
    expiresAt,
    lastAccessed: now,
    createdAt: now,
  };
}

/**
 * Checks whether an entry has expired.
 *
 * @param entry - The entry to check.
 * @param now - Current timestamp (for testability).
 * @returns True if the entry has expired.
 */
export function isExpired<K, V>(
  entry: InternalEntry<K, V>,
  now = Date.now(),
): boolean {
  return entry.expiresAt !== undefined && now >= entry.expiresAt;
}

/** Global counter for LRU to ensure unique ordering even within same millisecond. */
let lruCounter = 0;

/**
 * Updates the last accessed timestamp on an entry.
 * Uses a monotonic counter to ensure unique LRU ordering.
 *
 * @param entry - The entry to update.
 * @param now - Current timestamp (for testability).
 */
export function touchEntry<K, V>(
  entry: InternalEntry<K, V>,
  now = Date.now(),
): void {
  entry.lastAccessed = now * 10000 + (lruCounter++ % 10000);
}

/**
 * Calculates the remaining TTL in milliseconds.
 *
 * @param entry - The entry to check.
 * @param now - Current timestamp (for testability).
 * @returns Remaining milliseconds, or undefined if no expiration.
 */
export function getRemainingTTL<K, V>(
  entry: InternalEntry<K, V>,
  now = Date.now(),
): number | undefined {
  if (entry.expiresAt === undefined) return undefined;
  const remaining = entry.expiresAt - now;
  return remaining > 0 ? remaining : 0;
}