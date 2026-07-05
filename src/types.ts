/**
 * Core type definitions for safe-memory-layer.
 *
 * @module types
 */

/** Strategy to use when the store reaches its maximum entry limit. */
export type MaxEntriesStrategy = "reject" | "FIFO" | "LRU";

/** Options for setting an individual entry. */
export interface SetOptions {
  /** Time-to-live in milliseconds. After this duration, the entry expires. */
  ttl?: number;
}

/** Configuration options for creating a MemoryStore. */
export interface MemoryStoreOptions<K, V> {
  /** Default TTL in milliseconds for all entries (default: no expiration). */
  defaultTTL?: number;
  /** Interval in milliseconds between automatic cleanup runs (default: 10000). */
  cleanupInterval?: number;
  /** Whether to automatically run cleanup on an interval (default: true). */
  autoCleanup?: boolean;
  /** Whether to automatically dispose the store after being empty for a configurable time (default: false). */
  autoDispose?: boolean;
  /** Time in milliseconds to wait after empty before auto-disposing (default: 60000). */
  autoDisposeDelay?: number;
  /** Maximum number of entries allowed in the store (default: no limit). */
  maxEntries?: number;
  /** Strategy when max entries is reached (default: "reject"). */
  maxEntriesStrategy?: MaxEntriesStrategy;
  /** Callback invoked when an entry expires. */
  onExpire?: (key: K, value: V) => void;
  /** Callback invoked when an entry is deleted. */
  onDelete?: (key: K, value: V) => void;
  /** Callback invoked after a cleanup cycle completes. */
  onCleanup?: (stats: CleanupStats) => void;
}

/** Statistics about a cleanup cycle. */
export interface CleanupStats {
  /** Number of entries removed during cleanup. */
  removed: number;
  /** Total number of entries before cleanup. */
  totalBefore: number;
  /** Total number of entries after cleanup. */
  totalAfter: number;
  /** Duration of the cleanup cycle in milliseconds. */
  duration: number;
}

/** Statistics about the store. */
export interface StoreStats {
  /** Current number of entries in the store. */
  entries: number;
  /** Total number of entries that have expired. */
  expired: number;
  /** Total number of entries that have been deleted. */
  deleted: number;
  /** Total number of cleanup cycles completed. */
  cleaned: number;
  /** Uptime of the store in milliseconds. */
  uptime: number;
  /** Estimated memory usage in bytes (approximate). */
  memoryEstimate: number;
}

/** Internal entry stored in the map. */
export interface InternalEntry<K, V> {
  /** The stored value. */
  value: V;
  /** The key (stored for cleanup callbacks). */
  key: K;
  /** Expiration timestamp (ms since epoch), or undefined if no expiration. */
  expiresAt: number | undefined;
  /** Timestamp of last access (for LRU). */
  lastAccessed: number;
  /** Timestamp of creation. */
  createdAt: number;
}

/** Internal options for the MemoryStore constructor. */
export interface InternalStoreOptions<K, V> {
  defaultTTL: number | undefined;
  cleanupInterval: number;
  autoCleanup: boolean;
  autoDispose: boolean;
  autoDisposeDelay: number;
  maxEntries: number | undefined;
  maxEntriesStrategy: MaxEntriesStrategy;
  onExpire: ((key: K, value: V) => void) | undefined;
  onDelete: ((key: K, value: V) => void) | undefined;
  onCleanup: ((stats: CleanupStats) => void) | undefined;
}

/** Options for WeakMemoryStore. */
export interface WeakMemoryStoreOptions<V> {
  /** Callback invoked when an entry is deleted. */
  onDelete?: (value: V) => void;
}

/** Feature detection result for FinalizationRegistry. */
export interface FeatureSupport {
  /** Whether FinalizationRegistry is available. */
  finalizationRegistry: boolean;
}