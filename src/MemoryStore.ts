/**
 * Main MemoryStore implementation for safe-memory-layer.
 *
 * Provides a secure, lightweight, dependency-free abstraction for storing
 * temporary in-memory data with TTL support, automatic cleanup, and
 * memory leak prevention.
 *
 * @module MemoryStore
 */

import { Scheduler } from "./Scheduler.js";
import { createEntry, isExpired, touchEntry } from "./Entry.js";
import { Stats } from "./Stats.js";
import { EventEmitter } from "./Events.js";
import { createTimer } from "./utils/timer.js";
import { createSafeFinalizationRegistry } from "./utils/featureDetection.js";
import type {
  InternalEntry,
  InternalStoreOptions,
  MemoryStoreOptions,
  SetOptions,
  StoreStats,
} from "./types.js";

/** Default cleanup interval in milliseconds (10 seconds). */
const DEFAULT_CLEANUP_INTERVAL = 10_000;

/** Default auto-dispose delay in milliseconds (60 seconds). */
const DEFAULT_AUTO_DISPOSE_DELAY = 60_000;

/**
 * A secure, high-performance in-memory store with TTL support,
 * automatic cleanup, and memory leak prevention.
 *
 * @typeParam K - The type of keys stored in the map.
 * @typeParam V - The type of values stored in the map.
 *
 * @example
 * ```ts
 * const store = new MemoryStore<string, User>();
 *
 * // Set with TTL
 * store.set("user:123", user, { ttl: 60000 });
 *
 * // Get
 * const user = store.get("user:123");
 * ```
 */
export class MemoryStore<K, V> implements Iterable<[K, V]> {
  /** Internal map of entries. */
  #map = new Map<K, InternalEntry<K, V>>();

  /** Store configuration options. */
  readonly #options: InternalStoreOptions<K, V>;

  /** Statistics tracker. */
  readonly #stats: Stats | null;

  /** Event emitter for store events. */
  readonly #events: EventEmitter<K, V> | null;

  /** Cleanup scheduler. */
  #scheduler: Scheduler | null;

  /** Auto-dispose timer handle. */
  #autoDisposeTimer: ReturnType<typeof createTimer> | null = null;

  /** Whether the store has been disposed. */
  #disposed = false;

  /** Timestamp when the store was created. */
  readonly #createdAt: number;

  /** Timestamp when the store became empty (for auto-dispose). */
  #emptySince: number | null = null; // Used for auto-dispose timing

  /**
   * Creates a new MemoryStore instance.
   *
   * @param options - Configuration options for the store.
   *
   * @example
   * ```ts
   * const store = new MemoryStore({
   *   defaultTTL: 60000,
   *   cleanupInterval: 5000,
   *   autoCleanup: true,
   *   maxEntries: 1000,
   *   maxEntriesStrategy: "LRU"
   * });
   * ```
   */
  constructor(options: MemoryStoreOptions<K, V> = {}) {
    const opts = options;
    const enableStatistics = opts.statistics ?? true;
    const enableEvents = opts.events ?? true;

    this.#options = {
      defaultTTL: opts.defaultTTL,
      cleanupInterval: opts.cleanupInterval ?? DEFAULT_CLEANUP_INTERVAL,
      autoCleanup: opts.autoCleanup ?? true,
      autoDispose: opts.autoDispose ?? false,
      autoDisposeDelay: opts.autoDisposeDelay ?? DEFAULT_AUTO_DISPOSE_DELAY,
      maxEntries: opts.maxEntries,
      maxEntriesStrategy: opts.maxEntriesStrategy ?? "reject",
      onExpire: opts.onExpire,
      onDelete: opts.onDelete,
      onCleanup: opts.onCleanup,
      statistics: enableStatistics,
      events: enableEvents,
    };

    this.#createdAt = Date.now();
    this.#stats = enableStatistics ? new Stats(this.#createdAt) : null;
    this.#events = enableEvents ? new EventEmitter<K, V>() : null;

    // Wire up event callbacks if events are enabled
    if (enableEvents) {
      if (this.#options.onExpire !== undefined) {
        this.#events!.onExpire(this.#options.onExpire);
      }
      if (this.#options.onDelete !== undefined) {
        this.#events!.onDelete(this.#options.onDelete);
      }
      if (this.#options.onCleanup !== undefined) {
        this.#events!.onCleanup(this.#options.onCleanup);
      }
    }

    // Create scheduler only if auto-cleanup is enabled
    if (this.#options.autoCleanup && this.#options.cleanupInterval > 0) {
      this.#scheduler = new Scheduler(
        () => this.#runCleanup(),
        this.#options.cleanupInterval,
        () => this.#onSchedulerEmpty(),
      );
      this.#scheduler.start();
    } else {
      this.#scheduler = null;
    }

    // Set up FinalizationRegistry if available (for leak detection)
    this.#setupFinalizationRegistry();
  }

  /**
   * Sets up FinalizationRegistry for weak reference tracking.
   * This is used only for monitoring, not for core functionality.
   */
  #setupFinalizationRegistry(): void {
    // We don't rely on FinalizationRegistry for correctness,
    // but we can use it to detect potential leaks
    const registry = createSafeFinalizationRegistry<K>(() => {
      // This is called when a key is garbage collected
      // We don't take action here, just log for debugging
    });

    if (registry !== null) {
      // Store registry reference to prevent it from being collected
      (this as unknown as { _registry: FinalizationRegistry<K> })._registry =
        registry;
    }
  }

  /**
   * Stores a value with the given key.
   *
   * @param key - The key to store the value under.
   * @param value - The value to store.
   * @param options - Optional settings (e.g., TTL).
   * @returns True if the value was stored, false if rejected (e.g., max entries reached).
   *
   * @example
   * ```ts
   * store.set("token", token, { ttl: 60000 });
   * ```
   */
  set(key: K, value: V, options: SetOptions = {}): boolean {
    this.#checkDisposed();
    this.#clearAutoDisposeTimer();

    // Check max entries limit
    if (this.#options.maxEntries !== undefined && !this.#map.has(key)) {
      if (this.#map.size >= this.#options.maxEntries!) {
        const strategy = this.#options.maxEntriesStrategy;
        if (strategy === "reject") {
          return false;
        }

        if (strategy === "FIFO") {
          const firstKey = this.#map.keys().next().value;
          if (firstKey !== undefined) {
            this.delete(firstKey);
          }
        } else if (strategy === "LRU") {
          // Find and evict the least recently used entry
          let lruKey: K | undefined;
          let lruTime = Infinity;
          for (const [k, entry] of this.#map) {
            if (entry.lastAccessed < lruTime) {
              lruTime = entry.lastAccessed;
              lruKey = k;
            }
          }
          if (lruKey !== undefined) {
            this.delete(lruKey);
          }
        }
      }
    }

    const now = Date.now();
    const ttl = options.ttl ?? this.#options.defaultTTL;
    const entry = createEntry(
      key,
      value,
      ttl !== undefined ? { ttl } : {},
      now,
    );

    this.#map.set(key, entry);

    // Start scheduler if not running
    if (this.#scheduler !== null && !this.#scheduler.running) {
      this.#scheduler.start();
    }

    return true;
  }

  /**
   * Retrieves a value by key.
   *
   * @param key - The key to look up.
   * @returns The value if found and not expired, undefined otherwise.
   *
   * @example
   * ```ts
   * const user = store.get("user:123");
   * ```
   */
  get(key: K): V | undefined {
    this.#checkDisposed();

    const entry = this.#map.get(key);
    if (entry === undefined) return undefined;

    // Lazy expiration check
    if (isExpired(entry)) {
      // Remove expired entry
      this.#map.delete(key);
      this.#stats?.incrementExpired();
      this.#events?.emitExpire(entry.key, entry.value);
      return undefined;
    }

    // Update last accessed time for LRU
    touchEntry(entry);
    return entry.value;
  }

  /**
   * Checks if a key exists in the store and is not expired.
   *
   * @param key - The key to check.
   * @returns True if the key exists and is not expired.
   */
  has(key: K): boolean {
    this.#checkDisposed();

    const entry = this.#map.get(key);
    if (entry === undefined) return false;

    // Lazy expiration check
    if (isExpired(entry)) {
      // Remove expired entry
      this.#map.delete(key);
      this.#stats?.incrementExpired();
      this.#events?.emitExpire(entry.key, entry.value);
      return false;
    }

    return true;
  }

  /**
   * Deletes a value by key.
   *
   * @param key - The key to delete.
   * @returns True if the key was present, false otherwise.
   */
  delete(key: K): boolean {
    this.#checkDisposed();

    const entry = this.#map.get(key);
    if (entry === undefined) return false;

    this.#map.delete(key);
    this.#stats?.incrementDeleted();
    this.#events?.emitDelete(entry.key, entry.value);

    // Check if store is now empty
    if (this.#map.size === 0) {
      this.#onEmpty();
    }

    return true;
  }

  /**
   * Removes all entries from the store.
   */
  clear(): void {
    this.#checkDisposed();

    // Emit delete events for all entries
    if (this.#events !== null && this.#stats !== null) {
      for (const entry of this.#map.values()) {
        this.#events.emitDelete(entry.key, entry.value);
        this.#stats.incrementDeleted();
      }
    }

    this.#map.clear();
    this.#onEmpty();
  }

  /**
   * Returns the number of entries in the store.
   * Excludes expired entries.
   */
  get size(): number {
    if (this.#disposed) return 0;

    // Count non-expired entries
    let count = 0;
    const now = Date.now();
    for (const entry of this.#map.values()) {
      if (!isExpired(entry, now)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Returns an iterator of all keys.
   */
  keys(): IterableIterator<K> {
    this.#checkDisposed();
    return this.#map.keys();
  }

  /**
   * Returns an iterator of all values.
   */
  values(): IterableIterator<V> {
    this.#checkDisposed();
    return this.#getNonExpiredValues();
  }

  /**
   * Returns an iterator of all [key, value] pairs.
   */
  entries(): IterableIterator<[K, V]> {
    this.#checkDisposed();
    return this.#getNonExpiredEntries();
  }

  /**
   * Returns an iterator for the store (for...of support).
   */
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  /**
   * Returns an iterator of non-expired values.
   */
  *#getNonExpiredValues(): IterableIterator<V> {
    const now = Date.now();
    for (const entry of this.#map.values()) {
      if (!isExpired(entry, now)) {
        yield entry.value;
      }
    }
  }

  /**
   * Returns an iterator of non-expired entries.
   */
  *#getNonExpiredEntries(): IterableIterator<[K, V]> {
    const now = Date.now();
    for (const entry of this.#map.values()) {
      if (!isExpired(entry, now)) {
        yield [entry.key, entry.value];
      }
    }
  }

  /**
   * Runs a cleanup cycle, removing all expired entries.
   *
   * @returns The number of entries removed.
   */
  cleanup(): number {
    this.#checkDisposed();
    return this.#runCleanup();
  }

  /**
   * Runs the cleanup cycle.
   * This is called by the scheduler and can be called manually.
   *
   * @returns The number of entries removed.
   */
  #runCleanup(): number {
    const startTime = Date.now();
    const totalBefore = this.#map.size;
    let removed = 0;
    const now = Date.now();

    // Iterate and remove expired entries
    for (const [entryKey, entry] of this.#map) {
      if (isExpired(entry, now)) {
        this.#map.delete(entryKey);
        this.#stats?.incrementExpired();
        this.#events?.emitExpire(entry.key, entry.value);
        removed++;
      }
    }

    // Use emptySince to track when store became empty
    if (this.#map.size === 0 && this.#emptySince !== null) {
      // Store is empty, auto-dispose timer may be running
    }

    const totalAfter = this.#map.size;
    const duration = Date.now() - startTime;

    this.#stats?.incrementCleaned();

    // Emit cleanup event
    if (this.#stats !== null && this.#events !== null) {
      const cleanupStats = this.#stats.createCleanupStats(
        removed,
        totalBefore,
        totalAfter,
        duration,
      );
      this.#events.emitCleanup(cleanupStats);
    }

    // Check if store is empty
    if (this.#map.size === 0) {
      this.#onEmpty();
    }

    return removed;
  }

  /**
   * Compacts the store by removing expired entries.
   * Alias for cleanup().
   */
  compact(): number {
    return this.cleanup();
  }

  /**
   * Returns statistics about the store.
   *
   * @returns A snapshot of the current statistics.
   */
  stats(): StoreStats {
    this.#checkDisposed();
    if (this.#stats === null) {
      return {
        entries: this.size,
        expired: 0,
        deleted: 0,
        cleaned: 0,
        uptime: Date.now() - this.#createdAt,
        memoryEstimate: this.size * 200,
      };
    }
    return this.#stats.snapshot(this.#map.size);
  }

  /**
   * Disposes the store, stopping all timers and releasing references.
   * After disposal, the store cannot be used.
   */
  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;

    // Stop scheduler
    this.#scheduler?.dispose();

    // Stop auto-dispose timer
    this.#clearAutoDisposeTimer();

    // Clear all entries
    this.#map.clear();

    // Dispose event emitter
    this.#events?.dispose();

    // Remove FinalizationRegistry reference
    delete (this as unknown as { _registry?: FinalizationRegistry<K> })._registry;
  }

  /**
   * Checks if the store has been disposed.
   */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Called when the store becomes empty.
   */
  #onEmpty(): void {
    this.#emptySince = Date.now();

    // Start auto-dispose timer if enabled
    if (this.#options.autoDispose) {
      this.#startAutoDisposeTimer();
    }
  }

  /**
   * Starts the auto-dispose timer.
   */
  #startAutoDisposeTimer(): void {
    this.#clearAutoDisposeTimer();

    this.#autoDisposeTimer = createTimer(() => {
      // Only dispose if still empty
      if (this.#map.size === 0 && !this.#disposed) {
        this.dispose();
      }
    }, this.#options.autoDisposeDelay);
  }

  /**
   * Clears the auto-dispose timer.
   */
  #clearAutoDisposeTimer(): void {
    if (this.#autoDisposeTimer !== null) {
      this.#autoDisposeTimer.cancel();
      this.#autoDisposeTimer = null;
    }
    this.#emptySince = null;
  }

  /**
   * Called when the scheduler finds the store empty.
   */
  #onSchedulerEmpty(): void {
    // Scheduler stopped itself
    // This is called when cleanup finds the store empty
  }

  /**
   * Checks if the store has been disposed and throws if so.
   */
  #checkDisposed(): void {
    if (this.#disposed) {
      throw new Error("MemoryStore has been disposed");
    }
  }
}