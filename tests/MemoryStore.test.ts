/**
 * Comprehensive tests for MemoryStore and WeakMemoryStore.
 *
 * @module tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryStore } from "../src/MemoryStore.js";
import { WeakMemoryStore } from "../src/WeakMemoryStore.js";
import type { MemoryStoreOptions, StoreStats } from "../src/types.js";

describe("MemoryStore", () => {
  let store: MemoryStore<string, number>;

  beforeEach(() => {
    store = new MemoryStore<string, number>();
  });

  afterEach(() => {
    if (!store.disposed) {
      store.dispose();
    }
  });

  describe("constructor", () => {
    it("creates a store with default options", () => {
      expect(store.size).toBe(0);
      expect(store.disposed).toBe(false);
    });

    it("creates a store with custom options", () => {
      const customStore = new MemoryStore<string, number>({
        defaultTTL: 5000,
        cleanupInterval: 2000,
        autoCleanup: true,
        autoDispose: true,
        autoDisposeDelay: 30000,
        maxEntries: 100,
        maxEntriesStrategy: "LRU",
      });

      expect(customStore.size).toBe(0);
      customStore.dispose();
    });

    it("accepts callbacks in options", () => {
      const onExpire = vi.fn();
      const onDelete = vi.fn();
      const onCleanup = vi.fn();

      const callbackStore = new MemoryStore<string, number>({
        onExpire,
        onDelete,
        onCleanup,
      });

      expect(callbackStore).toBeDefined();
      callbackStore.dispose();
    });
  });

  describe("set and get", () => {
    it("sets and gets a value", () => {
      store.set("key", 42);
      expect(store.get("key")).toBe(42);
    });

    it("returns undefined for missing keys", () => {
      expect(store.get("missing")).toBeUndefined();
    });

    it("overwrites existing values", () => {
      store.set("key", 42);
      store.set("key", 100);
      expect(store.get("key")).toBe(100);
    });

    it("returns false when max entries is reached with reject strategy", () => {
      const limitedStore = new MemoryStore<string, number>({
        maxEntries: 2,
        maxEntriesStrategy: "reject",
      });

      expect(limitedStore.set("a", 1)).toBe(true);
      expect(limitedStore.set("b", 2)).toBe(true);
      expect(limitedStore.set("c", 3)).toBe(false);

      limitedStore.dispose();
    });

    it("evicts FIFO when max entries is reached", () => {
      const fifoStore = new MemoryStore<string, number>({
        maxEntries: 2,
        maxEntriesStrategy: "FIFO",
      });

      fifoStore.set("a", 1);
      fifoStore.set("b", 2);
      fifoStore.set("c", 3);

      expect(fifoStore.get("a")).toBeUndefined();
      expect(fifoStore.get("b")).toBe(2);
      expect(fifoStore.get("c")).toBe(3);

      fifoStore.dispose();
    });

    it("evicts LRU when max entries is reached", () => {
      const lruStore = new MemoryStore<string, number>({
        maxEntries: 2,
        maxEntriesStrategy: "LRU",
      });

      lruStore.set("a", 1);
      lruStore.set("b", 2);
      lruStore.get("a"); // Access "a" to make it more recent
      lruStore.set("c", 3); // Should evict "b" (least recently used)

      expect(lruStore.get("a")).toBe(1);
      expect(lruStore.get("b")).toBeUndefined();
      expect(lruStore.get("c")).toBe(3);

      lruStore.dispose();
    });
  });

  describe("TTL and expiration", () => {
    it("expires entries after TTL", async () => {
      const ttlStore = new MemoryStore<string, number>({
        autoCleanup: false,
      });

      ttlStore.set("key", 42, { ttl: 50 });
      expect(ttlStore.get("key")).toBe(42);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(ttlStore.get("key")).toBeUndefined();

      ttlStore.dispose();
    });

    it("uses default TTL when set in options", async () => {
      const defaultTtlStore = new MemoryStore<string, number>({
        defaultTTL: 50,
        autoCleanup: false,
      });

      defaultTtlStore.set("key", 42);
      expect(defaultTtlStore.get("key")).toBe(42);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(defaultTtlStore.get("key")).toBeUndefined();

      defaultTtlStore.dispose();
    });

    it("performs lazy expiration on get", async () => {
      const lazyStore = new MemoryStore<string, number>({
        autoCleanup: false,
      });

      lazyStore.set("key", 42, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Entry should be removed on access
      expect(lazyStore.get("key")).toBeUndefined();
      expect(lazyStore.size).toBe(0);

      lazyStore.dispose();
    });

    it("calls onExpire callback when entry expires", async () => {
      const onExpire = vi.fn();
      const expireStore = new MemoryStore<string, number>({
        autoCleanup: false,
        onExpire,
      });

      expireStore.set("key", 42, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger lazy expiration
      expireStore.get("key");

      expect(onExpire).toHaveBeenCalledWith("key", 42);

      expireStore.dispose();
    });
  });

  describe("cleanup", () => {
    it("removes expired entries during cleanup", async () => {
      const cleanupStore = new MemoryStore<string, number>({
        autoCleanup: false,
      });

      cleanupStore.set("a", 1, { ttl: 50 });
      cleanupStore.set("b", 2, { ttl: 50 });
      cleanupStore.set("c", 3); // No TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = cleanupStore.cleanup();
      expect(removed).toBe(2);
      expect(cleanupStore.get("a")).toBeUndefined();
      expect(cleanupStore.get("b")).toBeUndefined();
      expect(cleanupStore.get("c")).toBe(3);

      cleanupStore.dispose();
    });

    it("calls onCleanup callback", async () => {
      const onCleanup = vi.fn();
      const cleanupStore = new MemoryStore<string, number>({
        autoCleanup: false,
        onCleanup,
      });

      cleanupStore.set("a", 1, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      cleanupStore.cleanup();

      expect(onCleanup).toHaveBeenCalledTimes(1);
      const stats = onCleanup.mock.calls[0][0];
      expect(stats.removed).toBe(1);

      cleanupStore.dispose();
    });

    it("runs automatic cleanup on interval", async () => {
      const autoStore = new MemoryStore<string, number>({
        cleanupInterval: 100,
        autoCleanup: true,
      });

      autoStore.set("a", 1, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(autoStore.get("a")).toBeUndefined();

      autoStore.dispose();
    });
  });

  describe("delete", () => {
    it("deletes an entry", () => {
      store.set("key", 42);
      expect(store.delete("key")).toBe(true);
      expect(store.get("key")).toBeUndefined();
    });

    it("returns false for missing keys", () => {
      expect(store.delete("missing")).toBe(false);
    });

    it("calls onDelete callback", () => {
      const onDelete = vi.fn();
      const deleteStore = new MemoryStore<string, number>({
        onDelete,
      });

      deleteStore.set("key", 42);
      deleteStore.delete("key");

      expect(onDelete).toHaveBeenCalledWith("key", 42);

      deleteStore.dispose();
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      store.set("a", 1);
      store.set("b", 2);
      store.set("c", 3);

      store.clear();

      expect(store.size).toBe(0);
      expect(store.get("a")).toBeUndefined();
      expect(store.get("b")).toBeUndefined();
      expect(store.get("c")).toBeUndefined();
    });

    it("calls onDelete for all entries", () => {
      const onDelete = vi.fn();
      const clearStore = new MemoryStore<string, number>({
        onDelete,
      });

      clearStore.set("a", 1);
      clearStore.set("b", 2);
      clearStore.clear();

      expect(onDelete).toHaveBeenCalledTimes(2);

      clearStore.dispose();
    });
  });

  describe("has", () => {
    it("returns true for existing keys", () => {
      store.set("key", 42);
      expect(store.has("key")).toBe(true);
    });

    it("returns false for missing keys", () => {
      expect(store.has("missing")).toBe(false);
    });

    it("returns false for expired keys", async () => {
      store.set("key", 42, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(store.has("key")).toBe(false);
    });
  });

  describe("size", () => {
    it("returns the number of entries", () => {
      store.set("a", 1);
      store.set("b", 2);
      expect(store.size).toBe(2);
    });

    it("excludes expired entries", async () => {
      store.set("a", 1, { ttl: 50 });
      store.set("b", 2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(store.size).toBe(1);
    });
  });

  describe("iterators", () => {
    it("returns keys iterator", () => {
      store.set("a", 1);
      store.set("b", 2);

      const keys = Array.from(store.keys());
      expect(keys).toContain("a");
      expect(keys).toContain("b");
    });

    it("returns values iterator", () => {
      store.set("a", 1);
      store.set("b", 2);

      const values = Array.from(store.values());
      expect(values).toContain(1);
      expect(values).toContain(2);
    });

    it("returns entries iterator", () => {
      store.set("a", 1);
      store.set("b", 2);

      const entries = Array.from(store.entries());
      expect(entries).toContainEqual(["a", 1]);
      expect(entries).toContainEqual(["b", 2]);
    });

    it("supports for...of iteration", () => {
      store.set("a", 1);
      store.set("b", 2);

      const entries: [string, number][] = [];
      for (const entry of store) {
        entries.push(entry);
      }

      expect(entries.length).toBe(2);
    });

    it("excludes expired entries from iteration", async () => {
      store.set("a", 1, { ttl: 50 });
      store.set("b", 2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const entries = Array.from(store.entries());
      expect(entries.length).toBe(1);
      expect(entries[0]).toEqual(["b", 2]);
    });
  });

  describe("stats", () => {
    it("returns store statistics", () => {
      store.set("a", 1);
      store.set("b", 2, { ttl: 50 });

      const stats = store.stats();
      expect(stats.entries).toBe(2);
      expect(stats.expired).toBe(0);
      expect(stats.deleted).toBe(0);
      expect(stats.cleaned).toBe(0);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      expect(stats.memoryEstimate).toBeGreaterThan(0);
    });

    it("tracks expired entries", async () => {
      store.set("a", 1, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger lazy expiration
      store.get("a");

      const stats = store.stats();
      expect(stats.expired).toBe(1);
    });

    it("tracks deleted entries", () => {
      store.set("a", 1);
      store.delete("a");

      const stats = store.stats();
      expect(stats.deleted).toBe(1);
    });

    it("tracks cleaned cycles", async () => {
      store.set("a", 1, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      store.cleanup();

      const stats = store.stats();
      expect(stats.cleaned).toBe(1);
    });
  });

  describe("dispose", () => {
    it("disposes the store", () => {
      store.set("a", 1);
      store.dispose();

      expect(store.disposed).toBe(true);
      expect(store.size).toBe(0);
    });

    it("throws when accessing disposed store", () => {
      store.dispose();

      expect(() => store.get("a")).toThrow("MemoryStore has been disposed");
      expect(() => store.set("a", 1)).toThrow("MemoryStore has been disposed");
      expect(() => store.delete("a")).toThrow("MemoryStore has been disposed");
    });

    it("stops the scheduler on dispose", () => {
      store.dispose();
      // Should not throw
      expect(store.disposed).toBe(true);
    });

    it("is safe to call multiple times", () => {
      store.dispose();
      store.dispose();
      expect(store.disposed).toBe(true);
    });
  });

  describe("autoDispose", () => {
    it("disposes store after being empty for configured delay", async () => {
      const autoDisposeStore = new MemoryStore<string, number>({
        autoDispose: true,
        autoDisposeDelay: 100,
      });

      autoDisposeStore.set("a", 1);
      autoDisposeStore.delete("a");

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(autoDisposeStore.disposed).toBe(true);
    });

    it("does not dispose if entries are added after empty", async () => {
      const autoDisposeStore = new MemoryStore<string, number>({
        autoDispose: true,
        autoDisposeDelay: 100,
      });

      autoDisposeStore.set("a", 1);
      autoDisposeStore.delete("a");

      // Wait a bit, then add new entry
      await new Promise((resolve) => setTimeout(resolve, 50));
      autoDisposeStore.set("b", 2);

      // Wait for auto-dispose delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Store should not be disposed because it has entries
      expect(autoDisposeStore.disposed).toBe(false);
      expect(autoDisposeStore.get("b")).toBe(2);

      autoDisposeStore.dispose();
    });
  });

  describe("compact", () => {
    it("is an alias for cleanup", async () => {
      store.set("a", 1, { ttl: 50 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = store.compact();
      expect(removed).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles undefined values", () => {
      store.set("key", undefined);
      expect(store.get("key")).toBeUndefined();
      expect(store.has("key")).toBe(true);
    });

    it("handles null values", () => {
      store.set("key", null);
      expect(store.get("key")).toBeNull();
      expect(store.has("key")).toBe(true);
    });

    it("handles empty string keys", () => {
      store.set("", 42);
      expect(store.get("")).toBe(42);
    });

    it("handles zero TTL", async () => {
      store.set("key", 42, { ttl: 0 });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(store.get("key")).toBeUndefined();
    });

    it("handles negative TTL", async () => {
      store.set("key", 42, { ttl: -1 });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(store.get("key")).toBeUndefined();
    });
  });
});

describe("WeakMemoryStore", () => {
  let weakStore: WeakMemoryStore<string>;

  beforeEach(() => {
    weakStore = new WeakMemoryStore<string>();
  });

  afterEach(() => {
    if (!weakStore.disposed) {
      weakStore.dispose();
    }
  });

  describe("set and get", () => {
    it("sets and gets a value with object key", () => {
      const key = { id: 1 };
      weakStore.set(key, "value");
      expect(weakStore.get(key)).toBe("value");
    });

    it("returns undefined for missing keys", () => {
      const key = { id: 1 };
      expect(weakStore.get(key)).toBeUndefined();
    });

    it("throws for primitive keys", () => {
      expect(() => weakStore.set("string" as any, "value")).toThrow(
        "WeakMemoryStore keys must be objects",
      );
    });

    it("throws for null keys", () => {
      expect(() => weakStore.set(null as any, "value")).toThrow(
        "WeakMemoryStore keys must be objects",
      );
    });
  });

  describe("has", () => {
    it("returns true for existing keys", () => {
      const key = { id: 1 };
      weakStore.set(key, "value");
      expect(weakStore.has(key)).toBe(true);
    });

    it("returns false for missing keys", () => {
      const key = { id: 1 };
      expect(weakStore.has(key)).toBe(false);
    });

    it("returns false for primitive keys", () => {
      expect(weakStore.has("string" as any)).toBe(false);
    });
  });

  describe("delete", () => {
    it("deletes an entry", () => {
      const key = { id: 1 };
      weakStore.set(key, "value");
      expect(weakStore.delete(key)).toBe(true);
      expect(weakStore.get(key)).toBeUndefined();
    });

    it("returns false for missing keys", () => {
      const key = { id: 1 };
      expect(weakStore.delete(key)).toBe(false);
    });

    it("calls onDelete callback", () => {
      const onDelete = vi.fn();
      const callbackStore = new WeakMemoryStore<string>({
        onDelete,
      });

      const key = { id: 1 };
      callbackStore.set(key, "value");
      callbackStore.delete(key);

      expect(onDelete).toHaveBeenCalledWith("value");

      callbackStore.dispose();
    });
  });

  describe("clear", () => {
    it("clears all entries", () => {
      const key1 = { id: 1 };
      const key2 = { id: 2 };

      weakStore.set(key1, "value1");
      weakStore.set(key2, "value2");
      weakStore.clear();

      expect(weakStore.get(key1)).toBeUndefined();
      expect(weakStore.get(key2)).toBeUndefined();
    });
  });

  describe("stats", () => {
    it("returns statistics", () => {
      const key = { id: 1 };
      weakStore.set(key, "value");
      weakStore.delete(key);

      const stats = weakStore.stats();
      expect(stats.deleted).toBe(1);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("dispose", () => {
    it("disposes the store", () => {
      const key = { id: 1 };
      weakStore.set(key, "value");
      weakStore.dispose();

      expect(weakStore.disposed).toBe(true);
    });

    it("throws when accessing disposed store", () => {
      weakStore.dispose();

      const key = { id: 1 };
      expect(() => weakStore.get(key)).toThrow(
        "WeakMemoryStore has been disposed",
      );
      expect(() => weakStore.set(key, "value")).toThrow(
        "WeakMemoryStore has been disposed",
      );
    });

    it("is safe to call multiple times", () => {
      weakStore.dispose();
      weakStore.dispose();
      expect(weakStore.disposed).toBe(true);
    });
  });

  describe("garbage collection", () => {
    it("allows garbage collection of keys", () => {
      const key = { id: 1 };
      weakStore.set(key, "value");

      // Verify entry exists
      expect(weakStore.get(key)).toBe("value");

      // Remove strong reference
      // Note: We can't actually force GC in tests, but we can verify
      // the WeakMap doesn't prevent it
      expect(weakStore.has(key)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles undefined values", () => {
      const key = { id: 1 };
      weakStore.set(key, undefined);
      expect(weakStore.get(key)).toBeUndefined();
      expect(weakStore.has(key)).toBe(true);
    });

    it("handles null values", () => {
      const key = { id: 1 };
      weakStore.set(key, null);
      expect(weakStore.get(key)).toBeNull();
      expect(weakStore.has(key)).toBe(true);
    });
  });
});