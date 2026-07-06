/**
 * Electron Main Process example using MemoryStore.
 *
 * Demonstrates using safe-memory-layer in Electron's main process
 * for managing application state, IPC data caching, and window state.
 */

import { MemoryStore } from "../src/index.js";

// Store for managing window state
const windowStateStore = new MemoryStore<string, WindowState>({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 30_000,
  autoCleanup: true,
});

interface WindowState {
  id: number;
  title: string;
  bounds: { width: number; height: number; x: number; y: number };
  isFocused: boolean;
}

// Store for IPC message caching
const ipcCacheStore = new MemoryStore<string, any>({
  maxEntries: 1000,
  maxEntriesStrategy: "LRU",
  autoCleanup: true,
  cleanupInterval: 5000,
});

// Store for temporary app state
const appStateStore = new MemoryStore<string, any>({
  autoDispose: true,
  autoDisposeDelay: 60_000, // Dispose after 1 minute of being empty
});

// Usage in Electron main process
function saveWindowState(windowId: number, state: WindowState): void {
  windowStateStore.set(`window:${windowId}`, state);
}

function getWindowState(windowId: number): WindowState | undefined {
  return windowStateStore.get(`window:${windowId}`);
}

function cacheIpcResponse(channel: string, data: any): void {
  ipcCacheStore.set(`ipc:${channel}`, data, { ttl: 10000 });
}

function getCachedIpcResponse(channel: string): any {
  return ipcCacheStore.get(`ipc:${channel}`);
}

// Example: Store app configuration temporarily
appStateStore.set("config", { theme: "dark", language: "en" });

// Later: retrieve it
const config = appStateStore.get("config");
console.log("App config:", config);

// Clean up on app quit
function cleanup(): void {
  windowStateStore.dispose();
  ipcCacheStore.dispose();
  appStateStore.dispose();
}

// Monitor events
const monitoredStore = new MemoryStore<string, any>({
  onExpire: (key, value) => {
    console.log(`Cache expired: ${key}`);
  },
  onCleanup: (stats) => {
    console.log(`Cleanup: removed ${stats.removed} entries`);
  },
});

monitoredStore.dispose();

console.log("Electron main process stores initialized");