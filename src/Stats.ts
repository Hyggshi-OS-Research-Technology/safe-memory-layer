/**
 * Statistics tracking for safe-memory-layer.
 *
 * Tracks store metrics including entry counts, expiration counts,
 * deletion counts, cleanup cycles, uptime, and memory estimates.
 *
 * @module Stats
 */

import type { StoreStats, CleanupStats } from "./types.js";

/**
 * Tracks statistics for a MemoryStore instance.
 *
 * All counters are monotonically increasing (except entries).
 */
export class Stats {
  /** Total number of entries that have expired. */
  #expired = 0;

  /** Total number of entries that have been deleted. */
  #deleted = 0;

  /** Total number of cleanup cycles completed. */
  #cleaned = 0;

  /** Timestamp when the store was created. */
  readonly #createdAt: number;

  /** Current number of entries in the store. */
  #entries = 0;

  /**
   * Creates a new Stats instance.
   *
   * @param createdAt - Timestamp when the store was created.
   */
  constructor(createdAt: number) {
    this.#createdAt = createdAt;
  }

  /**
   * Increments the expired counter.
   */
  incrementExpired(): void {
    this.#expired++;
  }

  /**
   * Increments the deleted counter.
   */
  incrementDeleted(): void {
    this.#deleted++;
  }

  /**
   * Increments the cleaned counter.
   */
  incrementCleaned(): void {
    this.#cleaned++;
  }

  /**
   * Sets the current number of entries.
   *
   * @param count - The current entry count.
   */
  setEntries(count: number): void {
    this.#entries = count;
  }

  /**
   * Returns the current statistics snapshot.
   *
   * @param currentEntries - Current number of entries (overrides internal count).
   * @returns A snapshot of the current statistics.
   */
  snapshot(currentEntries?: number): StoreStats {
    const uptime = Date.now() - this.#createdAt;
    const entries = currentEntries ?? this.#entries;

    return {
      entries,
      expired: this.#expired,
      deleted: this.#deleted,
      cleaned: this.#cleaned,
      uptime,
      memoryEstimate: this.estimateMemory(entries),
    };
  }

  /**
   * Creates a cleanup stats object.
   *
   * @param removed - Number of entries removed.
   * @param totalBefore - Total entries before cleanup.
   * @param totalAfter - Total entries after cleanup.
   * @param duration - Duration of cleanup in ms.
   * @returns A CleanupStats object.
   */
  createCleanupStats(
    removed: number,
    totalBefore: number,
    totalAfter: number,
    duration: number,
  ): CleanupStats {
    return {
      removed,
      totalBefore,
      totalAfter,
      duration,
    };
  }

  /**
   * Estimates memory usage based on entry count.
   * This is a rough approximation for monitoring purposes.
   *
   * @param entryCount - Number of entries.
   * @returns Estimated memory usage in bytes.
   */
  estimateMemory(entryCount: number): number {
    // Rough estimate: each entry is approximately 200 bytes
    // This includes the key, value reference, and metadata
    // Actual memory usage varies based on key/value sizes
    return entryCount * 200;
  }

  /**
   * Resets all statistics.
   */
  reset(): void {
    this.#expired = 0;
    this.#deleted = 0;
    this.#cleaned = 0;
    this.#entries = 0;
  }
}