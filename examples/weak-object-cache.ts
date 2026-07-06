/**
 * Weak object cache example using WeakMemoryStore.
 *
 * Demonstrates object-only storage with automatic garbage collection.
 */

import { WeakMemoryStore } from "../src/index.js";

interface UserData {
  name: string;
  email: string;
}

// Create a weak object cache
const weakStore = new WeakMemoryStore<UserData>({
  onDelete: (value) => {
    console.log("Object was garbage collected or deleted:", value);
  },
});

// Create objects to use as keys
const user1 = { id: 1 };
const user2 = { id: 2 };
const user3 = { id: 3 };

// Store data associated with objects
weakStore.set(user1, { name: "Alice", email: "alice@example.com" });
weakStore.set(user2, { name: "Bob", email: "bob@example.com" });
weakStore.set(user3, { name: "Charlie", email: "charlie@example.com" });

// Retrieve data
console.log("User 1:", weakStore.get(user1));
console.log("User 2:", weakStore.get(user2));

// Check existence
console.log("Has user1:", weakStore.has(user1));
console.log("Has user2:", weakStore.has(user2));

// Delete an entry
weakStore.delete(user1);
console.log("After deleting user1, has user1:", weakStore.has(user1));

// When user2 and user3 go out of scope and are garbage collected,
// the entries are automatically removed

// Clean up
weakStore.dispose();