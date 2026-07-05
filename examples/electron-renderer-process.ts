/**
 * Electron Renderer Process example using MemoryStore.
 *
 * Demonstrates using safe-memory-layer in Electron's renderer process
 * (which is essentially a browser environment) for managing UI state,
 * caching API responses, and handling user data.
 */

import { MemoryStore, WeakMemoryStore } from "../src/index.js";

// Store for UI component state
const uiStateStore = new MemoryStore<string, UIState>({
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 30_000,
  autoCleanup: true,
});

interface UIState {
  componentId: string;
  isVisible: boolean;
  data: any;
  lastUpdated: number;
}

// Store for API response caching
const apiCacheStore = new MemoryStore<string, ApiResponse>({
  maxEntries: 500,
  maxEntriesStrategy: "LRU",
  cleanupInterval: 5000,
  autoCleanup: true,
});

interface ApiResponse {
  data: any;
  timestamp: number;
  etag?: string;
}

// Weak store for DOM element metadata
const domMetadataStore = new WeakMemoryStore<DOMElementMetadata>({
  onDelete: (value) => {
    console.log("DOM element removed:", value);
  },
});

interface DOMElementMetadata {
  tagName: string;
  attributes: Record<string, string>;
  lastInteraction: number;
}

// Usage in Electron renderer process
function saveUIState(componentId: string, state: Partial<UIState>): void {
  const existing = uiStateStore.get(componentId) || {
    componentId,
    isVisible: true,
    data: null,
    lastUpdated: Date.now(),
  };

  uiStateStore.set(componentId, {
    ...existing,
    ...state,
    lastUpdated: Date.now(),
  });
}

function getUIState(componentId: string): UIState | undefined {
  return uiStateStore.get(componentId);
}

function cacheApiResponse(endpoint: string, response: ApiResponse): void {
  apiCacheStore.set(`api:${endpoint}`, response, { ttl: 5 * 60 * 1000 }); // 5 minutes
}

function getCachedApiResponse(endpoint: string): ApiResponse | undefined {
  return apiCacheStore.get(`api:${endpoint}`);
}

// Example: Cache user preferences
uiStateStore.set("user:preferences", {
  componentId: "user:preferences",
  isVisible: true,
  data: {
    theme: "dark",
    notifications: true,
    sidebar: { collapsed: false, width: 300 },
  },
  lastUpdated: Date.now(),
});

// Example: Cache API response
cacheApiResponse("/api/users", {
  data: [{ id: 1, name: "Alice" }],
  timestamp: Date.now(),
  etag: "abc123",
});

// Example: Store DOM element metadata
const buttonElement = document.querySelector("#submit-button");
if (buttonElement) {
  domMetadataStore.set(buttonElement, {
    tagName: "BUTTON",
    attributes: { id: "submit-button", type: "submit" },
    lastInteraction: Date.now(),
  });
}

// Listen for IPC messages from main process
if (window.electron?.ipcRenderer) {
  window.electron.ipcRenderer.on("app-state-update", (_event, state) => {
    uiStateStore.set("app:state", state);
  });

  window.electron.ipcRenderer.on("clear-cache", () => {
    apiCacheStore.clear();
  });
}

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  uiStateStore.dispose();
  apiCacheStore.dispose();
  domMetadataStore.dispose();
});

// Monitor cache performance
const monitoredCache = new MemoryStore<string, any>({
  onExpire: (key) => {
    console.log(`Cache expired: ${key}`);
  },
  onCleanup: (stats) => {
    console.log(`Cache cleanup: ${stats.removed} entries removed`);
  },
});

monitoredCache.dispose();

console.log("Electron renderer process stores initialized");

// TypeScript augmentation for Electron IPC
declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        on(channel: string, callback: (...args: any[]) => void): void;
        send(channel: string, ...args: any[]): void;
      };
    };
  }
}