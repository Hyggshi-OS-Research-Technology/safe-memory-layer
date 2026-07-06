/**
 * JavaScript usage example for safe-memory-layer.
 *
 * This demonstrates using the library from plain JavaScript (no TypeScript).
 * The library works seamlessly with JavaScript since it's compiled to ESM/CJS.
 */

import { MemoryStore, WeakMemoryStore } from "safe-memory-layer";

// ============================================
// Example 1: Basic Cache (JavaScript)
// ============================================

const cache = new MemoryStore();

// Set values
cache.set("user:1", { name: "Alice", age: 30 });
cache.set("user:2", { name: "Bob", age: 25 }, { ttl: 5000 }); // 5 seconds

// Get values
const user1 = cache.get("user:1");
console.log("User 1:", user1);

// Check existence
console.log("Has user:1:", cache.has("user:1"));
console.log("Cache size:", cache.size);

// ============================================
// Example 2: TTL Cache (JavaScript)
// ============================================

const ttlCache = new MemoryStore(null, {
  defaultTTL: 10000, // 10 seconds
  cleanupInterval: 2000,
  autoCleanup: true,
});

ttlCache.set("session:abc123", { userId: 123, token: "xyz" });

// Wait 6 seconds
setTimeout(() => {
  const session = ttlCache.get("session:abc123");
  console.log("Session after 6s:", session); // undefined (expired)
}, 6000);

// ============================================
// Example 3: Session Storage (JavaScript)
// ============================================

const sessionStore = new MemoryStore(null, {
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxEntries: 1000,
  maxEntriesStrategy: "LRU",
});

// Create session
function createSession(userId, username) {
  const sessionId = `session:${userId}:${Date.now()}`;
  sessionStore.set(sessionId, {
    userId,
    username,
    createdAt: new Date().toISOString(),
  });
  return sessionId;
}

// Get session
function getSession(sessionId) {
  return sessionStore.get(sessionId);
}

// Destroy session
function destroySession(sessionId) {
  return sessionStore.delete(sessionId);
}

// Usage
const session1 = createSession("user:123", "alice");
const session = getSession(session1);
console.log("Session:", session);

// ============================================
// Example 4: API Response Cache (JavaScript)
// ============================================

const apiCache = new MemoryStore(null, {
  maxEntries: 500,
  maxEntriesStrategy: "LRU",
  cleanupInterval: 5000,
  autoCleanup: true,
});

// Cache API response
function cacheApiResponse(endpoint, data) {
  apiCache.set(`api:${endpoint}`, {
    data,
    timestamp: Date.now(),
  }, { ttl: 5 * 60 * 1000 }); // 5 minutes
}

// Get cached response
function getCachedResponse(endpoint) {
  return apiCache.get(`api:${endpoint}`);
}

// Usage
cacheApiResponse("/users", [{ id: 1, name: "Alice" }]);
const cached = getCachedResponse("/users");
console.log("Cached API response:", cached);

// ============================================
// Example 5: Weak Object Cache (JavaScript)
// ============================================

const weakStore = new WeakMemoryStore(null, {
  onDelete: (value) => {
    console.log("Object deleted:", value);
  },
});

// Create objects as keys
const user1 = { id: 1 };
const user2 = { id: 2 };

// Store metadata
weakStore.set(user1, { name: "Alice", role: "admin" });
weakStore.set(user2, { name: "Bob", role: "user" });

// Retrieve
console.log("User 1 metadata:", weakStore.get(user1));
console.log("Has user1:", weakStore.has(user1));

// Delete
weakStore.delete(user1);

// ============================================
// Example 6: Event Monitoring (JavaScript)
// ============================================

const monitoredStore = new MemoryStore(null, {
  onExpire: (key, value) => {
    console.log(`Expired: ${key}`);
  },
  onDelete: (key, value) => {
    console.log(`Deleted: ${key}`);
  },
  onCleanup: (stats) => {
    console.log(`Cleanup: removed ${stats.removed} entries`);
  },
});

monitoredStore.set("temp", "data", { ttl: 1000 });

// ============================================
// Example 7: Statistics (JavaScript)
// ============================================

const statsStore = new MemoryStore(null, {
  cleanupInterval: 5000,
  autoCleanup: true,
});

statsStore.set("a", 1, { ttl: 1000 });
statsStore.set("b", 2);
statsStore.delete("a");

// Get statistics
const stats = statsStore.stats();
console.log("Store stats:", {
  entries: stats.entries,
  expired: stats.expired,
  deleted: stats.deleted,
  cleaned: stats.cleaned,
  uptime: stats.uptime,
  memoryEstimate: stats.memoryEstimate,
});

// ============================================
// Example 8: Auto-Dispose (JavaScript)
// ============================================

const autoDisposeStore = new MemoryStore(null, {
  autoDispose: true,
  autoDisposeDelay: 5000, // 5 seconds
});

autoDisposeStore.set("temp", "value");
autoDisposeStore.delete("temp");

// Store will auto-dispose after 5 seconds of being empty
setTimeout(() => {
  console.log("Auto-disposed:", autoDisposeStore.disposed);
}, 6000);

// ============================================
// Cleanup
// ============================================

setTimeout(() => {
  cache.dispose();
  ttlCache.dispose();
  sessionStore.dispose();
  apiCache.dispose();
  weakStore.dispose();
  monitoredStore.dispose();
  statsStore.dispose();

  console.log("All stores disposed");
}, 10000);