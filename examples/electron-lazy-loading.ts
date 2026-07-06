/**
 * Electron Lazy Loading and Window Management Example
 *
 * Demonstrates:
 * 1. Lazy loading of safe-memory-layer (only when needed)
 * 2. Proper window disposal to free renderer processes
 * 3. Memory management for Electron applications
 *
 * NOTE: This example requires Electron types to be installed:
 * npm install --save-dev @types/electron
 */

// ============================================
// Example 1: Lazy Loading in Main Process
// ============================================

import { app, BrowserWindow } from "electron";
import type { BrowserWindow as BrowserWindowType } from "electron";

// Store references to windows and their stores
const windowStores = new Map<BrowserWindowType, { store: any; cleanup: () => void }>();

// Lazy load safe-memory-layer only when needed
async function getMemoryStore() {
  // Only import when actually needed
  const { MemoryStore } = await import("safe-memory-layer");
  return new MemoryStore({
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    autoCleanup: true,
    cleanupInterval: 30_000,
    statistics: false, // Disable for better performance
    events: false,
  });
}

// Create a new window with lazy-loaded store
async function createWindow(): Promise<BrowserWindowType> {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Lazy load the store only for this window
  const store = await getMemoryStore();

  // Store the reference
  windowStores.set(win, {
    store,
    cleanup: () => {
      store.dispose();
    },
  });

  // Load the app
  await win.loadFile("index.html");

  // Handle window closed event
  win.on("closed", () => {
    // CRITICAL: Completely dispose the store when window closes
    const windowData = windowStores.get(win);
    if (windowData) {
      windowData.cleanup();
      windowStores.delete(win);
    }
  });

  return win;
}

// ============================================
// Example 2: Proper Window Disposal
// ============================================

/**
 * Properly closes a window and frees all resources
 * This is critical for freeing the renderer process
 */
async function closeWindow(win: BrowserWindowType): Promise<void> {
  const windowData = windowStores.get(win);

  if (windowData) {
    // 1. Dispose the memory store first
    windowData.cleanup();
    windowStores.delete(win);
  }

  // 2. Completely close the window (not just hide)
  // This frees the renderer process
  if (!win.isDestroyed()) {
    win.removeAllListeners();
    win.webContents.removeAllListeners();

    // Close the window
    win.close();
  }

  // 3. Force garbage collection if available (development only)
  if (process.env.NODE_ENV === "development") {
    if (global.gc) {
      global.gc();
    }
  }
}

// ============================================
// Example 3: Renderer Process Lazy Loading
// ============================================

/**
 * In the renderer process (preload script or renderer JS)
 * Lazy load safe-memory-layer only when needed
 */

// preload.ts (Electron preload script)
export async function setupRendererProcess() {
  // Don't import safe-memory-layer here
  // Only import it when actually needed in the renderer

  return {
    // Expose a function to lazily initialize the store
    initStore: async () => {
      // Lazy load only when called
      const { MemoryStore } = await import("safe-memory-layer");

      return new MemoryStore({
        defaultTTL: 10 * 60 * 1000, // 10 minutes
        autoCleanup: true,
        cleanupInterval: 30_000,
        maxEntries: 500,
        maxEntriesStrategy: "LRU",
        statistics: false,
        events: false,
      });
    },
  };
}

// renderer.ts (Renderer process code)
async function setupRenderer() {
  // Get the store lazily
  const { initStore } = window.electron;

  // Only create the store when needed
  let store: any = null;

  async function getStore() {
    if (!store) {
      store = await initStore();
    }
    return store;
  }

  // Use the store
  async function cacheData(key: string, value: any) {
    const memStore = await getStore();
    memStore.set(key, value);
  }

  async function getCachedData(key: string) {
    const memStore = await getStore();
    return memStore.get(key);
  }

  // Clean up on page unload
  window.addEventListener("beforeunload", async () => {
    if (store) {
      store.dispose();
      store = null;
    }
  });

  return { cacheData, getCachedData };
}

// ============================================
// Example 4: Window State Management with Disposal
// ============================================

interface WindowState {
  id: number;
  title: string;
  bounds: { width: number; height: number; x: number; y: number };
  isMaximized: boolean;
}

class WindowStateManager {
  private stores = new Map<BrowserWindowType, any>();
  private mainStore: any;

  constructor() {
    // Main store for window state (lazy loaded)
    this.mainStore = null;
  }

  async getMainStore() {
    if (!this.mainStore) {
      const { MemoryStore } = await import("safe-memory-layer");
      this.mainStore = new MemoryStore({
        defaultTTL: 30 * 60 * 1000, // 30 minutes
        autoCleanup: true,
        statistics: false,
        events: false,
      });
    }
    return this.mainStore;
  }

  async saveWindowState(win: BrowserWindowType): Promise<void> {
    const store = await this.getMainStore();

    const state: WindowState = {
      id: win.id,
      title: win.title,
      bounds: win.getBounds(),
      isMaximized: win.isMaximized(),
    };

    store.set(`window:${win.id}`, state);
  }

  async getWindowState(windowId: number): Promise<WindowState | undefined> {
    const store = await this.getMainStore();
    return store.get(`window:${windowId}`);
  }

  /**
   * CRITICAL: Completely dispose window resources
   * This frees the renderer process
   */
  disposeWindow(win: BrowserWindowType): void {
    // Remove from tracking
    this.stores.delete(win);

    // If this was the main store's window, clean it up
    if (this.mainStore) {
      this.mainStore.delete(`window:${win.id}`);
    }

    // Completely close the window
    if (!win.isDestroyed()) {
      win.removeAllListeners();
      win.webContents.removeAllListeners();
      win.close();
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Dispose all window stores
    for (const [win, store] of this.stores) {
      store.dispose();
      if (!win.isDestroyed()) {
        win.close();
      }
    }
    this.stores.clear();

    // Dispose main store
    if (this.mainStore) {
      this.mainStore.dispose();
      this.mainStore = null;
    }
  }
}

// ============================================
// Example 5: Best Practices for Electron
// ============================================

class ElectronAppManager {
  private windows = new Map<number, BrowserWindowType>();
  private stateManager = new WindowStateManager();

  /**
   * Create a window with proper resource management
   */
  async createWindow(options: {
    title: string;
    width: number;
    height: number;
  }): Promise<BrowserWindowType> {
    const win = new BrowserWindow({
      title: options.title,
      width: options.width,
      height: options.height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.windows.set(win.id, win);

    // Save state on close
    win.on("close", async () => {
      await this.stateManager.saveWindowState(win);
    });

    // CRITICAL: Completely dispose when closed
    win.on("closed", () => {
      this.stateManager.disposeWindow(win);
      this.windows.delete(win.id);
    });

    await win.loadFile("index.html");

    return win;
  }

  /**
   * Close all windows and free all resources
   */
  closeAllWindows(): void {
    for (const [id, win] of this.windows) {
      // Completely close (not just hide)
      if (!win.isDestroyed()) {
        win.removeAllListeners();
        win.webContents.removeAllListeners();
        win.close();
      }
    }
    this.windows.clear();
    this.stateManager.dispose();
  }

  /**
   * Quit the app and clean up everything
   */
  quit(): void {
    this.closeAllWindows();
    app.quit();
  }
}

// ============================================
// Key Principles
// ============================================

/*
1. **Lazy Loading**: Only import safe-memory-layer when actually needed
   - Use dynamic import() instead of static imports
   - Load modules on-demand in event handlers

2. **Complete Disposal**: Always completely close windows, not just hide
   - Call win.close() not win.hide()
   - Remove all event listeners
   - Dispose memory stores
   - Clear all references

3. **Free Renderer Processes**: 
   - Completely close windows to free renderer processes
   - Don't just hide windows - close them
   - Dispose all associated resources

4. **Memory Management**:
   - Dispose stores when windows close
   - Clear all references
   - Use weak references where possible

5. **Best Practices**:
   - Always listen to "closed" event for cleanup
   - Remove all listeners before closing
   - Dispose stores before closing windows
   - Use autoCleanup: false for manual control
   - Disable statistics and events when not needed
*/

export { WindowStateManager, ElectronAppManager };