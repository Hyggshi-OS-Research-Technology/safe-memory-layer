/**
 * Session storage example using MemoryStore.
 *
 * Demonstrates user session management with automatic cleanup.
 */

import { MemoryStore } from "../src/index.js";

interface Session {
  userId: string;
  username: string;
  createdAt: number;
}

// Create a session store with 30-minute TTL
const sessionStore = new MemoryStore<string, Session>({
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 60_000, // Clean up every minute
  autoCleanup: true,
  maxEntries: 1000,
  maxEntriesStrategy: "LRU",
});

// Create a new session
function createSession(userId: string, username: string): string {
  const sessionId = `session:${userId}:${Date.now()}`;
  sessionStore.set(sessionId, {
    userId,
    username,
    createdAt: Date.now(),
  });
  return sessionId;
}

// Get session
function getSession(sessionId: string): Session | undefined {
  return sessionStore.get(sessionId);
}

// Destroy session
function destroySession(sessionId: string): boolean {
  return sessionStore.delete(sessionId);
}

// Usage
const session1 = createSession("user:123", "alice");
const session2 = createSession("user:456", "bob");

console.log("Session 1:", getSession(session1));
console.log("Session 2:", getSession(session2));
console.log("Active sessions:", sessionStore.size);

// Clean up
destroySession(session1);
console.log("After cleanup:", sessionStore.size);

sessionStore.dispose();