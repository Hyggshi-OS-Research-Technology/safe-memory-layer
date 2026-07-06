/**
 * Safe Memory Layer - Secure, lightweight, dependency-free in-memory storage
 *
 * @module safe-memory-layer
 *
 * @example
 * ```ts
 * import { MemoryStore, WeakMemoryStore } from "safe-memory-layer";
 *
 * // Basic usage
 * const store = new MemoryStore<string, User>();
 * store.set("user:123", user, { ttl: 60000 });
 * const user = store.get("user:123");
 * ```
 */

// Main store implementation
export { MemoryStore } from "./MemoryStore.js";

// Weak reference store
export { WeakMemoryStore } from "./WeakMemoryStore.js";

// Supporting modules (for advanced usage)
export { Scheduler } from "./Scheduler.js";
export { Stats } from "./Stats.js";
export { EventEmitter } from "./Events.js";

// Utility functions
export {
  createEntry,
  isExpired,
  touchEntry,
  getRemainingTTL,
} from "./Entry.js";

export { createTimer, createInterval } from "./utils/timer.js";
export {
  detectFeatures,
  getFeatures,
  createSafeFinalizationRegistry,
} from "./utils/featureDetection.js";

// Type exports
export type {
  MaxEntriesStrategy,
  SetOptions,
  MemoryStoreOptions,
  CleanupStats,
  StoreStats,
  InternalEntry,
  InternalStoreOptions,
  WeakMemoryStoreOptions,
  FeatureSupport,
} from "./types.js";

export type { CleanupFn } from "./Scheduler.js";
export type { TimerHandle } from "./utils/timer.js";