/**
 * Event handling utilities for safe-memory-layer.
 *
 * Provides type-safe event emission with error isolation.
 * All callbacks are wrapped to prevent crashes from propagating.
 *
 * @module Events
 */

import type { CleanupStats } from "./types.js";

/**
 * Event types emitted by the MemoryStore.
 */
export interface StoreEvents<K, V> {
  /** Emitted when an entry expires. */
  expire: [key: K, value: V];
  /** Emitted when an entry is deleted. */
  delete: [key: K, value: V];
  /** Emitted after a cleanup cycle completes. */
  cleanup: [stats: CleanupStats];
}

/**
 * Type-safe event emitter for store events.
 * All callbacks are error-isolated.
 */
export class EventEmitter<K, V> {
  /** Registered event listeners. */
  #listeners: {
    expire?: Array<(key: K, value: V) => void>;
    delete?: Array<(key: K, value: V) => void>;
    cleanup?: Array<(stats: CleanupStats) => void>;
  } = {};

  /**
   * Registers a listener for the expire event.
   *
   * @param callback - Function to call when an entry expires.
   */
  onExpire(callback: (key: K, value: V) => void): void {
    this.#listeners.expire ??= [];
    this.#listeners.expire.push(callback);
  }

  /**
   * Registers a listener for the delete event.
   *
   * @param callback - Function to call when an entry is deleted.
   */
  onDelete(callback: (key: K, value: V) => void): void {
    this.#listeners.delete ??= [];
    this.#listeners.delete.push(callback);
  }

  /**
   * Registers a listener for the cleanup event.
   *
   * @param callback - Function to call after cleanup completes.
   */
  onCleanup(callback: (stats: CleanupStats) => void): void {
    this.#listeners.cleanup ??= [];
    this.#listeners.cleanup.push(callback);
  }

  /**
   * Emits an expire event to all registered listeners.
   * Errors in callbacks are isolated and logged.
   *
   * @param key - The key of the expired entry.
   * @param value - The value of the expired entry.
   */
  emitExpire(key: K, value: V): void {
    const listeners = this.#listeners.expire;
    if (listeners === undefined || listeners.length === 0) return;

    for (const callback of listeners) {
      try {
        callback(key, value);
      } catch {
        // Isolate errors - never let callback errors crash the library
      }
    }
  }

  /**
   * Emits a delete event to all registered listeners.
   * Errors in callbacks are isolated and logged.
   *
   * @param key - The key of the deleted entry.
   * @param value - The value of the deleted entry.
   */
  emitDelete(key: K, value: V): void {
    const listeners = this.#listeners.delete;
    if (listeners === undefined || listeners.length === 0) return;

    for (const callback of listeners) {
      try {
        callback(key, value);
      } catch {
        // Isolate errors - never let callback errors crash the library
      }
    }
  }

  /**
   * Emits a cleanup event to all registered listeners.
   * Errors in callbacks are isolated and logged.
   *
   * @param stats - The cleanup statistics.
   */
  emitCleanup(stats: CleanupStats): void {
    const listeners = this.#listeners.cleanup;
    if (listeners === undefined || listeners.length === 0) return;

    for (const callback of listeners) {
      try {
        callback(stats);
      } catch {
        // Isolate errors - never let callback errors crash the library
      }
    }
  }

  /**
   * Removes all event listeners.
   */
  removeAllListeners(): void {
    this.#listeners = {};
  }

  /**
   * Disposes the event emitter, removing all listeners.
   */
  dispose(): void {
    this.removeAllListeners();
  }
}