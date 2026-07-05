/**
 * Token storage example using MemoryStore.
 *
 * Demonstrates authentication token caching with TTL.
 */

import { MemoryStore } from "../src/index.js";

interface TokenData {
  token: string;
  userId: string;
  expiresAt: number;
}

// Create a token store with 1-hour TTL
const authStore = new MemoryStore<string, TokenData>({
  defaultTTL: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 30_000, // Clean up every 30 seconds
  autoCleanup: true,
  maxEntries: 5000,
  maxEntriesStrategy: "FIFO",
});

// Store a token
function storeToken(token: string, userId: string): void {
  authStore.set(`token:${token}`, {
    token,
    userId,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
}

// Validate a token
function validateToken(token: string): TokenData | undefined {
  return authStore.get(`token:${token}`);
}

// Revoke a token
function revokeToken(token: string): boolean {
  return authStore.delete(`token:${token}`);
}

// Usage
storeToken("abc123", "user:123");
storeToken("def456", "user:456");

console.log("Token abc123:", validateToken("abc123"));
console.log("Active tokens:", authStore.size);

// Revoke a token
revokeToken("abc123");
console.log("After revocation:", authStore.size);

// Monitor with callbacks
const monitoredStore = new MemoryStore<string, TokenData>({
  defaultTTL: 3600000,
  onExpire: (key, value) => {
    console.log(`Token expired: ${key}`);
  },
  onDelete: (key, value) => {
    console.log(`Token deleted: ${key}`);
  },
});

monitoredStore.dispose();
authStore.dispose();