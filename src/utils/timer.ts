/**
 * Safe timer utilities for safe-memory-layer.
 *
 * Provides platform-agnostic timer creation and cleanup.
 * Uses only Web-compatible APIs (setTimeout/clearTimeout).
 *
 * @module utils/timer
 */

/** Represents a timer handle that can be cancelled. */
export interface TimerHandle {
  /** Cancels the timer. Safe to call multiple times. */
  cancel: () => void;
  /** Whether the timer has been cancelled. */
  readonly cancelled: boolean;
}

/**
 * Creates a safe timer that can be cancelled.
 * Uses setTimeout internally for maximum compatibility.
 *
 * @param fn - The function to execute after the delay.
 * @param delay - The delay in milliseconds.
 * @returns A TimerHandle that can be used to cancel the timer.
 */
export function createTimer(fn: () => void, delay: number): TimerHandle {
  let cancelled = false;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const wrappedFn = (): void => {
    if (cancelled) return;
    timerId = undefined;
    try {
      fn();
    } catch {
      // Isolate errors from timer callbacks to prevent crashes
    }
  };

  timerId = setTimeout(wrappedFn, delay);

  return {
    cancel: (): void => {
      cancelled = true;
      if (timerId !== undefined) {
        clearTimeout(timerId);
        timerId = undefined;
      }
    },
    get cancelled(): boolean {
      return cancelled;
    },
  };
}

/**
 * Creates an interval timer that runs a function repeatedly.
 *
 * @param fn - The function to execute on each interval.
 * @param interval - The interval in milliseconds.
 * @returns A TimerHandle that can be used to cancel the interval.
 */
export function createInterval(
  fn: () => void,
  interval: number,
): TimerHandle {
  let cancelled = false;
  let timerId: ReturnType<typeof setInterval> | undefined;

  const wrappedFn = (): void => {
    if (cancelled) return;
    try {
      fn();
    } catch {
      // Isolate errors from interval callbacks
    }
  };

  timerId = setInterval(wrappedFn, interval);

  return {
    cancel: (): void => {
      cancelled = true;
      if (timerId !== undefined) {
        clearInterval(timerId);
        timerId = undefined;
      }
    },
    get cancelled(): boolean {
      return cancelled;
    },
  };
}