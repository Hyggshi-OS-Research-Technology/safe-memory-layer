/**
 * Scheduler for automatic cleanup of expired entries.
 *
 * Design:
 * - Single interval timer for all cleanup operations
 * - Automatically stops when the store is empty to save CPU
 * - Restarts when new entries are added
 * - Very low CPU usage with configurable interval
 *
 * @module Scheduler
 */

import { createInterval } from "./utils/timer.js";
import type { TimerHandle } from "./utils/timer.js";

/**
 * Function type for cleanup callbacks.
 * Returns the number of entries that were cleaned up.
 */
export type CleanupFn = () => number;

/**
 * Manages a periodic cleanup scheduler.
 * Stops automatically when empty, restarts when needed.
 */
export class Scheduler {
  /** The cleanup interval timer handle. */
  #timer: TimerHandle | null = null;

  /** The interval in milliseconds between cleanup runs. */
  readonly #interval: number;

  /** The cleanup function to call on each interval. */
  readonly #cleanupFn: CleanupFn;

  /** The onEmpty callback, called when cleanup finds the store empty. */
  readonly #onEmpty: (() => void) | undefined;

  /** Whether the scheduler is currently running. */
  #running = false;

  /**
   * Creates a new Scheduler.
   *
   * @param cleanupFn - Function to call for cleanup. Should return count of removed entries.
   * @param interval - Interval in milliseconds between cleanup runs.
   * @param onEmpty - Optional callback when cleanup finds the store empty.
   */
  constructor(
    cleanupFn: CleanupFn,
    interval: number,
    onEmpty?: () => void,
  ) {
    this.#cleanupFn = cleanupFn;
    this.#interval = interval;
    this.#onEmpty = onEmpty;
  }

  /**
   * Starts the scheduler if it's not already running.
   * Does nothing if already started.
   */
  start(): void {
    if (this.#running || this.#timer !== null) return;

    this.#running = true;
    this.#timer = createInterval(() => {
      this.#tick();
    }, this.#interval);
  }

  /**
   * Stops the scheduler if running.
   * Safe to call multiple times.
   */
  stop(): void {
    this.#running = false;
    if (this.#timer !== null) {
      this.#timer.cancel();
      this.#timer = null;
    }
  }

  /**
   * Restarts the scheduler (stops then starts).
   */
  restart(): void {
    this.stop();
    this.start();
  }

  /**
   * Whether the scheduler is currently running.
   */
  get running(): boolean {
    return this.#running;
  }

  /**
   * Performs a single cleanup tick.
   * Stops the scheduler if the store is empty.
   */
  #tick(): void {
    const removed = this.#cleanupFn();

    // If nothing was removed and nothing remains, stop the scheduler
    // The store will restart the scheduler when new entries are added
    if (removed === 0) {
      this.stop();
      this.#onEmpty?.();
    }
  }

  /**
   * Disposes the scheduler, stopping it and releasing all references.
   */
  dispose(): void {
    this.stop();
  }
}