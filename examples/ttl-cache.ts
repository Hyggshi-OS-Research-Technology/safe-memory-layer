/**
 * TTL cache example using MemoryStore.
 *
 * Demonstrates time-based expiration and automatic cleanup.
 */

import { MemoryStore } from "../src/index.js";

// Create a TTL cache with 10-second default TTL
const ttlCache = new MemoryStore<string, { data: string; timestamp: number }>({
  defaultTTL: 10_000, // 10 seconds
  cleanupInterval: 2000, // Clean up every 2 seconds
  autoCleanup: true,
});

// Set values with custom TTL
ttlCache.set("session:1", { data: "user data", timestamp: Date.now() }, {
  ttl: 5000, // 5 seconds
});

ttlCache.set("session:2", { data: "temp data", timestamp: Date.now() }, {
  ttl: 15_000, // 15 seconds
});

// Monitor expiration
setTimeout(() => {
  console.log("After 6 seconds:");
  console.log("session:1 exists:", ttlCache.has("session:1")); // false (expired)
  console.log("session:2 exists:", ttlCache.has("session:2")); // true
  console.log("Cache size:", ttlCache.size); // 1

  // Manual cleanup
  const removed = ttlCache.cleanup();
  console.log("Removed:", removed);

  ttlCache.dispose();
}, 6000);