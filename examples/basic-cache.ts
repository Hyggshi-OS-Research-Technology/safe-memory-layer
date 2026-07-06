/**
 * Basic cache example using MemoryStore.
 *
 * Demonstrates simple key-value storage with optional TTL.
 */

import { MemoryStore } from "../src/index.js";

// Create a simple cache store
const cache = new MemoryStore<string, string>();

// Set values
cache.set("user:1", "Alice");
cache.set("user:2", "Bob", { ttl: 5000 }); // Expires in 5 seconds

// Get values
console.log(cache.get("user:1")); // "Alice"
console.log(cache.get("user:2")); // "Bob"

// Check existence
console.log(cache.has("user:1")); // true
console.log(cache.size); // 2

// Clean up
cache.dispose();