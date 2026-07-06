/**
 * Optimized usage example for safe-memory-layer.
 *
 * Demonstrates how to disable features for maximum performance
 * and minimal memory overhead.
 */

import { MemoryStore } from "../src/index.js";

// ============================================
// Example 1: Minimal Store (Maximum Performance)
// ============================================

// Ultra-minimal configuration - no statistics, no events, no auto-cleanup
const minimalStore = new MemoryStore({
  autoCleanup: false,
  statistics: false,
  events: false,
  cleanupInterval: 0,
});

// Use for simple caching with manual cleanup
minimalStore.set("key1", "value1");
minimalStore.set("key2", "value2", { ttl: 60000 });

// Manual cleanup when needed
const removed = minimalStore.cleanup();
console.log(`Cleaned ${removed} entries`);

minimalStore.dispose();

// ============================================
// Example 2: No Statistics (Reduced Overhead)
// ============================================

// Disable statistics but keep events
const noStatsStore = new MemoryStore({
  statistics: false,
  autoCleanup: true,
  cleanupInterval: 5000,
});

noStatsStore.set("temp", "data", { ttl: 30000 });

// stats() still works but returns basic computed values
const stats = noStatsStore.stats();
console.log("Entries:", stats.entries);

noStatsStore.dispose();

// ============================================
// Example 3: No Events (Reduced Overhead)
// ============================================

// Disable events but keep statistics
const noEventsStore = new MemoryStore({
  events: false,
  statistics: true,
  autoCleanup: true,
});

// No event callbacks will be fired
noEventsStore.set("key", "value");
noEventsStore.delete("key");

noEventsStore.dispose();

// ============================================
// Example 4: Manual Cleanup (Full Control)
// ============================================

// Disable auto-cleanup for full control
const manualCleanupStore = new MemoryStore({
  autoCleanup: false,
  cleanupInterval: 0,
  statistics: true,
});

// Application controls when cleanup happens
for (let i = 0; i < 100; i++) {
  manualCleanupStore.set(`key${i}`, `value${i}`, { ttl: 5000 });
}

// ... do work ...

// Cleanup on your own schedule (e.g., after batch operation)
const cleaned = manualCleanupStore.cleanup();
console.log(`Manually cleaned ${cleaned} entries`);

manualCleanupStore.dispose();

// ============================================
// Example 5: High-Performance Cache
// ============================================

// Optimized for high-throughput caching
const highPerfCache = new MemoryStore({
  defaultTTL: 60000, // 1 minute
  autoCleanup: false, // Manual cleanup
  statistics: false, // No stats overhead
  events: false, // No events overhead
  maxEntries: 1000,
  maxEntriesStrategy: "LRU",
});

// Batch operations
function batchSet(items: Array<{ key: string; value: any }>) {
  for (const item of items) {
    highPerfCache.set(item.key, item.value);
  }
}

// Periodic cleanup (e.g., every 30 seconds)
setInterval(() => {
  const cleaned = highPerfCache.cleanup();
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired entries`);
  }
}, 30000);

// Use the cache
batchSet([
  { key: "user:1", value: { name: "Alice" } },
  { key: "user:2", value: { name: "Bob" } },
]);

highPerfCache.dispose();

// ============================================
// Example 6: Event Monitoring Only (No Stats)
// ============================================

// Monitor expirations without statistics overhead
const monitoredStore = new MemoryStore({
  statistics: false,
  events: true,
  autoCleanup: true,
  cleanupInterval: 5000,
  onExpire: (key, value) => {
    console.log(`Expired: ${key}`);
  },
  onDelete: (key, value) => {
    console.log(`Deleted: ${key}`);
  },
});

monitoredStore.set("temp", "data", { ttl: 1000 });

monitoredStore.dispose();

// ============================================
// Example 7: Statistics Only (No Events)
// ============================================

// Track statistics without event overhead
const statsOnlyStore = new MemoryStore({
  statistics: true,
  events: false,
  autoCleanup: true,
  cleanupInterval: 5000,
});

statsOnlyStore.set("a", 1, { ttl: 1000 });
statsOnlyStore.set("b", 2);

// Check stats periodically
setInterval(() => {
  const stats = statsOnlyStore.stats();
  console.log(`Entries: ${stats.entries}, Expired: ${stats.expired}`);
}, 10000);

statsOnlyStore.dispose();

// ============================================
// Performance Tips
// ============================================

/*
1. **Minimal configuration**: Use `statistics: false, events: false, autoCleanup: false` for maximum performance
2. **Manual cleanup**: Call `cleanup()` on your own schedule instead of using auto-cleanup
3. **Batch operations**: Set multiple values before calling cleanup
4. **Appropriate TTLs**: Use TTLs to let lazy cleanup handle expiration on access
5. **LRU eviction**: Use LRU strategy for caches to automatically evict old entries
6. **Dispose when done**: Always call `dispose()` to release timers and references
7. **Separate stores**: Use different stores for different concerns to minimize cleanup scope
8. **Avoid unnecessary callbacks**: Only enable events if you actually need them
*/

console.log("Optimized usage examples completed");