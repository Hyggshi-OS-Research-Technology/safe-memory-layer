# Safe Memory Layer

Secure, lightweight, dependency-free in-memory storage with TTL support, automatic cleanup, and memory leak prevention for Node.js and modern browsers.

## Features

- **Memory Safety**: Automatic cleanup of expired entries, leak prevention, and safe resource management
- **TTL Support**: Time-based expiration with lazy and active cleanup
- **Automatic Cleanup**: Background scheduler that stops when empty to save CPU
- **WeakMap Support**: Object-only storage with automatic garbage collection
- **LRU/FIFO Eviction**: Configurable strategies when reaching max entries
- **Event Callbacks**: Monitor expiration, deletion, and cleanup events
- **Statistics**: Track entries, expired count, deleted count, and uptime
- **Auto-Dispose**: Automatically dispose store after being empty for a configurable time
- **Zero Dependencies**: No external runtime dependencies
- **TypeScript**: Full generic typing with strict mode compatibility
- **Tree-Shakeable ESM**: Optimized bundle size
- **Browser & Node.js**: Works in both environments

## Installation

```bash
npm install safe-memory-layer
```

## Quick Start

```typescript
import { MemoryStore } from "safe-memory-layer";

// Create a store
const store = new MemoryStore<string, User>();

// Set values with optional TTL
store.set("user:123", user, { ttl: 60000 }); // Expires in 60 seconds

// Get values
const user = store.get("user:123");

// Check existence
if (store.has("user:123")) {
  console.log("User exists");
}

// Clean up when done
store.dispose();
```

## API Reference

### MemoryStore

The main in-memory store with TTL support and automatic cleanup.

#### Constructor

```typescript
const store = new MemoryStore<K, V>(options?: MemoryStoreOptions<K, V>);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultTTL` | `number \| undefined` | `undefined` | Default TTL in milliseconds for all entries |
| `cleanupInterval` | `number` | `10000` | Interval between automatic cleanup runs (ms) |
| `autoCleanup` | `boolean` | `true` | Enable automatic cleanup |
| `autoDispose` | `boolean` | `false` | Auto-dispose after being empty for `autoDisposeDelay` |
| `autoDisposeDelay` | `number` | `60000` | Delay before auto-dispose (ms) |
| `maxEntries` | `number \| undefined` | `undefined` | Maximum number of entries |
| `maxEntriesStrategy` | `"reject" \| "FIFO" \| "LRU"` | `"reject"` | Strategy when max entries is reached |
| `onExpire` | `(key: K, value: V) => void` | `undefined` | Callback when entry expires |
| `onDelete` | `(key: K, value: V) => void` | `undefined` | Callback when entry is deleted |
| `onCleanup` | `(stats: CleanupStats) => void` | `undefined` | Callback after cleanup cycle |

#### Methods

##### set(key, value, options?)

Stores a value with the given key.

```typescript
store.set("key", value, { ttl: 60000 });
```

**Returns:** `boolean` - `true` if stored, `false` if rejected (max entries reached)

##### get(key)

Retrieves a value by key.

```typescript
const value = store.get("key");
```

**Returns:** `V | undefined` - The value or `undefined` if not found/expired

##### has(key)

Checks if a key exists and is not expired.

```typescript
if (store.has("key")) {
  // Key exists
}
```

**Returns:** `boolean`

##### delete(key)

Deletes a value by key.

```typescript
const deleted = store.delete("key");
```

**Returns:** `boolean` - `true` if key was present

##### clear()

Removes all entries.

```typescript
store.clear();
```

##### size

Returns the number of non-expired entries.

```typescript
const count = store.size;
```

**Returns:** `number`

##### keys()

Returns an iterator of all keys.

```typescript
for (const key of store.keys()) {
  console.log(key);
}
```

**Returns:** `IterableIterator<K>`

##### values()

Returns an iterator of all non-expired values.

```typescript
for (const value of store.values()) {
  console.log(value);
}
```

**Returns:** `IterableIterator<V>`

##### entries()

Returns an iterator of all [key, value] pairs.

```typescript
for (const [key, value] of store.entries()) {
  console.log(key, value);
}
```

**Returns:** `IterableIterator<[K, V]>`

##### cleanup()

Removes all expired entries.

```typescript
const removed = store.cleanup();
```

**Returns:** `number` - Number of entries removed

##### compact()

Alias for `cleanup()`.

```typescript
const removed = store.compact();
```

##### stats()

Returns statistics about the store.

```typescript
const stats = store.stats();
console.log(stats);
```

**Returns:** `StoreStats`

```typescript
interface StoreStats {
  entries: number;       // Current number of entries
  expired: number;       // Total expired entries
  deleted: number;       // Total deleted entries
  cleaned: number;       // Total cleanup cycles
  uptime: number;        // Uptime in milliseconds
  memoryEstimate: number; // Estimated memory usage in bytes
}
```

##### dispose()

Disposes the store, stopping all timers and releasing references.

```typescript
store.dispose();
```

After disposal, the store cannot be used.

##### disposed

Checks if the store has been disposed.

```typescript
if (store.disposed) {
  console.log("Store is disposed");
}
```

**Returns:** `boolean`

### WeakMemoryStore

Object-only storage using WeakMap for automatic garbage collection.

#### Constructor

```typescript
const weakStore = new WeakMemoryStore<V>(options?: WeakMemoryStoreOptions<V>);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onDelete` | `(value: V) => void` | `undefined` | Callback when entry is deleted |

#### Methods

##### set(key, value)

Stores a value with an object key.

```typescript
const obj = { id: 1 };
weakStore.set(obj, { name: "Alice" });
```

**Returns:** `boolean`

##### get(key)

Retrieves a value by object key.

```typescript
const value = weakStore.get(obj);
```

**Returns:** `V | undefined`

##### has(key)

Checks if a key exists.

```typescript
if (weakStore.has(obj)) {
  // Key exists
}
```

**Returns:** `boolean`

##### delete(key)

Deletes a value by object key.

```typescript
const deleted = weakStore.delete(obj);
```

**Returns:** `boolean`

##### clear()

Removes all entries.

```typescript
weakStore.clear();
```

##### deleted

Returns the number of deleted entries.

```typescript
const count = weakStore.deleted;
```

**Returns:** `number`

##### stats()

Returns statistics.

```typescript
const stats = weakStore.stats();
```

**Returns:** `{ deleted: number; uptime: number }`

##### dispose()

Disposes the store.

```typescript
weakStore.dispose();
```

##### disposed

Checks if the store has been disposed.

```typescript
if (weakStore.disposed) {
  console.log("Store is disposed");
}
```

**Returns:** `boolean`

## Examples

### Basic Cache

```typescript
const cache = new MemoryStore<string, string>();
cache.set("key", "value");
console.log(cache.get("key")); // "value"
cache.dispose();
```

### TTL Cache

```typescript
const ttlCache = new MemoryStore<string, User>({
  defaultTTL: 60000, // 1 minute
  cleanupInterval: 10000,
});

ttlCache.set("user:1", user, { ttl: 30000 }); // 30 seconds
```

### Session Storage

```typescript
const sessionStore = new MemoryStore<string, Session>({
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxEntries: 1000,
  maxEntriesStrategy: "LRU",
});

sessionStore.set(sessionId, sessionData);
```

### Token Storage

```typescript
const authStore = new MemoryStore<string, TokenData>({
  defaultTTL: 3600000, // 1 hour
  maxEntries: 5000,
  maxEntriesStrategy: "FIFO",
});

authStore.set(`token:${token}`, tokenData);
```

### Weak Object Cache

```typescript
const weakStore = new WeakMemoryStore<UserData>();

const user = { id: 1 };
weakStore.set(user, { name: "Alice" });

// When 'user' is garbage collected, entry is automatically removed
```

### Event Monitoring

```typescript
const store = new MemoryStore<string, Data>({
  onExpire: (key, value) => {
    console.log(`Expired: ${key}`);
  },
  onDelete: (key, value) => {
    console.log(`Deleted: ${key}`);
  },
  onCleanup: (stats) => {
    console.log(`Cleaned ${stats.removed} entries`);
  },
});
```

### Auto-Dispose

```typescript
const store = new MemoryStore<string, Data>({
  autoDispose: true,
  autoDisposeDelay: 60000, // 1 minute
});

store.set("key", value);
store.delete("key");
// Store will auto-dispose after 1 minute of being empty
```

## Performance Optimization

Safe Memory Layer supports disabling features to reduce overhead when they're not needed. This makes the library extremely lightweight and tree-shakeable.

### Disable Automatic Cleanup

If you want to call `cleanup()` manually on your own schedule:

```typescript
const store = new MemoryStore({
  autoCleanup: false,
  cleanupInterval: 0, // Disables the scheduler
});

// Call cleanup manually when needed
store.cleanup();
```

### Disable Statistics

Disable statistics tracking to reduce overhead:

```typescript
const store = new MemoryStore({
  statistics: false,
});

// stats() will return basic computed values
const stats = store.stats();
```

### Disable Events

Disable event callbacks to reduce overhead:

```typescript
const store = new MemoryStore({
  events: false,
});

// No event callbacks will be fired
```

### Minimal Configuration Example

```typescript
// Ultra-minimal store with no overhead
const minimalStore = new MemoryStore({
  autoCleanup: false,
  statistics: false,
  events: false,
  cleanupInterval: 0,
});

// Use with manual cleanup
minimalStore.set("key", value);
// ... later ...
minimalStore.cleanup();
minimalStore.dispose();
```

### Performance Comparison

| Configuration | Memory Overhead | CPU Overhead | Use Case |
|---------------|----------------|--------------|----------|
| Full features (default) | ~200 bytes/entry | Low (periodic cleanup) | General purpose |
| No statistics | ~150 bytes/entry | Minimal | When you don't need stats |
| No events | ~180 bytes/entry | Minimal | When you don't need callbacks |
| Manual cleanup | ~100 bytes/entry | Zero (until cleanup called) | Maximum performance |
| Minimal (all disabled) | ~100 bytes/entry | Zero (until cleanup called) | Ultimate performance |

### Tree-Shaking

The library is fully tree-shakeable. When using a bundler like webpack, Rollup, or esbuild, unused features are automatically removed from the final bundle.

```typescript
// Import only what you need
import { MemoryStore } from "safe-memory-layer";
// Stats, Events, and Scheduler modules are tree-shaken if not used
```

## Best Practices

1. **Always dispose stores**: Call `dispose()` when done to release timers and references
2. **Use appropriate TTLs**: Set TTLs based on data freshness requirements
3. **Configure cleanup interval**: Balance between cleanup frequency and CPU usage
4. **Use LRU for caches**: LRU eviction works well for cache scenarios
5. **Use FIFO for queues**: FIFO eviction works well for queue-like data
6. **Monitor with callbacks**: Use event callbacks to track store behavior
7. **Avoid storing large objects**: Keep values small for better performance
8. **Use WeakMemoryStore for object metadata**: When keys are objects that may be GC'd
9. **Disable unused features**: Set `statistics: false` and `events: false` to reduce overhead
10. **Manual cleanup for performance**: Use `autoCleanup: false` and call `cleanup()` manually for maximum performance

## Performance

- **O(1)** get, set, delete operations
- **O(n)** cleanup (iterates all entries)
- **O(n)** size (counts non-expired entries)
- Minimal memory allocations
- Single timer for all cleanup operations
- Automatic scheduler pause when empty

## Browser Compatibility

Works in all modern browsers that support:
- ES2022
- WeakMap
- Map
- setTimeout/setInterval

No Node.js-specific APIs are used.

## Electron Support

Safe Memory Layer works perfectly in Electron applications, both in the main process and renderer process.

### Main Process

Use MemoryStore in Electron's main process for:
- Window state management
- IPC message caching
- Application state management
- Session data storage

```typescript
import { MemoryStore } from "safe-memory-layer";

// Window state store
const windowStateStore = new MemoryStore<string, WindowState>({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 30_000,
  autoCleanup: true,
});

// Save window state
windowStateStore.set(`window:${windowId}`, {
  bounds: window.getBounds(),
  isFocused: window.isFocused(),
});
```

### Renderer Process

Use MemoryStore in Electron's renderer process (browser environment) for:
- UI component state
- API response caching
- DOM element metadata (with WeakMemoryStore)
- User preferences

```typescript
import { MemoryStore, WeakMemoryStore } from "safe-memory-layer";

// UI state store
const uiStateStore = new MemoryStore<string, UIState>({
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  autoCleanup: true,
});

// DOM metadata store (auto-cleaned by GC)
const domStore = new WeakMemoryStore<ElementMetadata>();

const element = document.querySelector("#my-element");
domStore.set(element, { interactions: 0, lastClick: Date.now() });
```

### Electron Best Practices

1. **Dispose on app quit**: Always dispose stores when the app quits
2. **Use TTLs**: Set appropriate TTLs for cached data
3. **Separate stores**: Use different stores for different concerns
4. **Cleanup on window close**: Dispose stores when windows are closed
5. **IPC caching**: Cache IPC responses to reduce main process load
6. **Lazy load modules**: Only import safe-memory-layer when actually needed using dynamic `import()`
7. **Completely close windows**: Call `win.close()` not `win.hide()` to free renderer processes
8. **Remove listeners**: Always remove event listeners before closing windows
9. **Dispose before closing**: Dispose memory stores before closing windows

### Lazy Loading Pattern

For optimal performance in Electron, use lazy loading:

```typescript
// Instead of static import at the top
// import { MemoryStore } from "safe-memory-layer";

// Use dynamic import when needed
async function getStore() {
  const { MemoryStore } = await import("safe-memory-layer");
  return new MemoryStore({
    statistics: false,
    events: false,
  });
}

// Use in your code
const store = await getStore();
store.set("key", value);
```

### Window Disposal Pattern

Always completely close windows to free renderer processes:

```typescript
win.on("closed", () => {
  // Dispose memory store
  store.dispose();
  
  // Remove all listeners
  win.removeAllListeners();
  win.webContents.removeAllListeners();
  
  // Clear references
  windowStores.delete(win);
});
```

See `examples/electron-lazy-loading.ts` for a complete example.

## TypeScript Support

Full TypeScript support with generics:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const store = new MemoryStore<string, User>();
store.set("user:1", { id: "1", name: "Alice", email: "alice@example.com" });
const user = store.get("user:1"); // Type: User | undefined
```

## JavaScript Support

The library works seamlessly with plain JavaScript (no TypeScript required). Since it's compiled to both ESM and CommonJS, you can use it in any JavaScript project.

### ESM (Modern JavaScript)

```javascript
import { MemoryStore, WeakMemoryStore } from "safe-memory-layer";

const cache = new MemoryStore();
cache.set("key", "value", { ttl: 60000 });
const value = cache.get("key");
cache.dispose();
```

### CommonJS (Node.js)

```javascript
const { MemoryStore, WeakMemoryStore } = require("safe-memory-layer");

const cache = new MemoryStore();
cache.set("key", "value", { ttl: 60000 });
const value = cache.get("key");
cache.dispose();
```

### JavaScript Features

- No TypeScript required
- Works with ESM and CommonJS
- Full API access (same as TypeScript)
- No type annotations needed
- Dynamic typing support

See `examples/javascript-usage.js` for a complete JavaScript example.

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a PR.

```bash
npm test
```

## Changelog

### 1.0.0

- Initial release
- MemoryStore with TTL support
- WeakMemoryStore with WeakMap
- Automatic cleanup scheduler
- LRU/FIFO eviction strategies
- Event callbacks
- Statistics tracking
- Auto-dispose feature
- Full TypeScript support

### 1.1.2

- support Electron desktop (Framework)

### 1.2.2

- support JS

### 1.3.2

- New option

API:
```typescript
const store = new MemoryStore({
  ttl: 60000,
  autoCleanup: false,
  statistics: false,
  events: false,
  cleanupInterval: 0
});
```
- Electron Lazy Loading and Window Management

