/**
 * WeakMemoryStore implementation for safe-memory-layer.
 *
 * Provides an object-only storage layer using WeakMap internally.
 * Objects disappear automatically after garbage collection.
 * No iteration, no manual cleanup required.
 *
 * @module WeakMemoryStore
 */

import type { WeakMemoryStoreOptions } from "./types.js";

/**
 * A memory store that uses WeakMap for object-only storage.
 *
 * Keys must be objects. Values are held weakly and will be
 * automatically garbage collected when no longer referenced elsewhere.
 *
 * **Limitations:**
 * - Keys must be objects (not primitives)
 * - No iteration support (WeakMap is not iterable)
 * - No size property
 * - No TTL support
 * - No automatic cleanup needed
 *
 * @typeParam V - The type of values stored in the map.
 *
 * @example
 * ```ts
 * const weakStore = new WeakMemoryStore<User>();
 *
 * const user = { id: 1, name: "Alice" };
 * weakStore.set(user, userData);
 *
 * // When 'user' is no longer referenced, the entry is automatically removed
 * ```
 */
export class WeakMemoryStore<V> {
  /** Internal WeakMap for storage. */
  #map = new WeakMap<object, V>();

  /** Store configuration options. */
  readonly #options: WeakMemoryStoreOptions<V>;

  /** Statistics tracker. */
  #deleted = 0;

  /** Timestamp when the store was created. */
  readonly #createdAt: number;

  /** Whether the store has been disposed. */
  #disposed = false;

  /**
   * Creates a new WeakMemoryStore instance.
   *
   * @param options - Configuration options for the store.
   *
   * @example
   * ```ts
   * const store = new WeakMemoryStore({
   *   onDelete: (value) => console.log("Deleted:", value)
   * });
   * ```
   */
  constructor(options: WeakMemoryStoreOptions<V> = {}) {
    this.#options = options;
    this.#createdAt = Date.now();
  }

  /**
   * Stores a value with the given object key.
   *
   * @param key - The object key to store the value under. Must be an object.
   * @param value - The value to store.
   * @returns True if the value was stored.
   *
   * @example
   * ```ts
   * const obj = { id: 1 };
   * weakStore.set(obj, { name: "Alice" });
   * ```
   */
  set(key: object, value: V): boolean {
    this.#checkDisposed();

    // Type guard: ensure key is an object
    if (typeof key !== "object" || key === null) {
      throw new TypeError("WeakMemoryStore keys must be objects");
    }

    this.#map.set(key, value);
    return true;
  }

  /**
   * Retrieves a value by object key.
   *
   * @param key - The object key to look up.
   * @returns The value if found, undefined otherwise.
   *
   * @example
   * ```ts
   * const user = weakStore.get(obj);
   * ```
   */
  get(key: object): V | undefined {
    this.#checkDisposed();

    if (typeof key !== "object" || key === null) {
      return undefined;
    }

    return this.#map.get(key);
  }

  /**
   * Checks if a key exists in the store.
   *
   * @param key - The object key to check.
   * @returns True if the key exists.
   */
  has(key: object): boolean {
    this.#checkDisposed();

    if (typeof key !== "object" || key === null) {
      return false;
    }

    return this.#map.has(key);
  }

  /**
   * Deletes a value by object key.
   *
   * @param key - The object key to delete.
   * @returns True if the key was present, false otherwise.
   */
  delete(key: object): boolean {
    this.#checkDisposed();

    if (typeof key !== "object" || key === null) {
      return false;
    }

    const value = this.#map.get(key);
    if (value === undefined) return false;

    this.#map.delete(key);
    this.#deleted++;

    // Emit delete event
    if (this.#options.onDelete !== undefined) {
      try {
        this.#options.onDelete(value);
      } catch {
        // Isolate errors from callbacks
      }
    }

    return true;
  }

  /**
   * Removes all entries from the store.
   * Note: This does not prevent garbage collection of the keys.
   */
  clear(): void {
    this.#checkDisposed();

    // We cannot iterate over WeakMap to emit events
    // Just clear the map
    this.#map = new WeakMap<object, V>();
    this.#deleted++;
  }

  /**
   * Returns the number of deleted entries.
   * Note: Cannot return current size (WeakMap limitation).
   */
  get deleted(): number {
    return this.#deleted;
  }

  /**
   * Returns statistics about the store.
   * Note: entries count is not available for WeakMap.
   *
   * @returns A snapshot of the current statistics.
   */
  stats(): {
    deleted: number;
    uptime: number;
  } {
    this.#checkDisposed();

    return {
      deleted: this.#deleted,
      uptime: Date.now() - this.#createdAt,
    };
  }

  /**
   * Disposes the store, releasing the WeakMap reference.
   * After disposal, the store cannot be used.
   */
  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;
    this.#map = new WeakMap<object, V>();
  }

  /**
   * Checks if the store has been disposed.
   */
  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Checks if the store has been disposed and throws if so.
   */
  #checkDisposed(): void {
    if (this.#disposed) {
      throw new Error("WeakMemoryStore has been disposed");
    }
  }
}