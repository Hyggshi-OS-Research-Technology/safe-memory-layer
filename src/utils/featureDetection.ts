/**
 * Feature detection utilities for safe-memory-layer.
 *
 * Detects available platform features and provides graceful fallbacks.
 *
 * @module utils/featureDetection
 */

import type { FeatureSupport } from "../types.js";

/**
 * Detects which platform features are available.
 * This is called once at module load time and cached.
 */
export function detectFeatures(): FeatureSupport {
  return {
    finalizationRegistry:
      typeof globalThis.FinalizationRegistry !== "undefined",
  };
}

/** Cached feature support flags. */
let cachedFeatures: FeatureSupport | undefined;

/**
 * Returns the cached feature support flags, detecting them on first call.
 */
export function getFeatures(): FeatureSupport {
  if (cachedFeatures === undefined) {
    cachedFeatures = detectFeatures();
  }
  return cachedFeatures;
}

/**
 * Creates a FinalizationRegistry if available, otherwise returns null.
 * Never throws if FinalizationRegistry is unavailable.
 */
export function createSafeFinalizationRegistry<T>(
  cleanup: (heldValue: T) => void,
): FinalizationRegistry<T> | null {
  const features = getFeatures();
  if (features.finalizationRegistry) {
    try {
      return new FinalizationRegistry(cleanup);
    } catch {
      // Graceful fallback if construction fails
      return null;
    }
  }
  return null;
}